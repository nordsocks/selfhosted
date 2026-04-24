import Docker from "dockerode";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import { logger } from "./logger";

const execAsync = promisify(exec);

let docker: Docker | null = null;

function getDocker(): Docker {
  if (!docker) {
    docker = new Docker({ socketPath: "/var/run/docker.sock" });
  }
  return docker;
}

export const NORDVPN_IMAGE = "edgd1er/nordvpn-proxy:latest";
export const SOCKS5_INTERNAL_PORT = 1080;

const CREDS_DIR = "/var/nordsocks-creds";

function ensureCredsDir(): void {
  if (!fs.existsSync(CREDS_DIR)) fs.mkdirSync(CREDS_DIR, { recursive: true, mode: 0o700 });
}

function writeCredsFile(port: number, user: string, pass: string): string {
  ensureCredsDir();
  const filePath = path.join(CREDS_DIR, `${port}`);
  fs.writeFileSync(filePath, `${user}\n${pass}`, { mode: 0o600 });
  return filePath;
}

function removeCredsFile(port: number): void {
  const filePath = path.join(CREDS_DIR, `${port}`);
  try { fs.unlinkSync(filePath); } catch { /* ignore */ }
}

// PAM config that makes Dante actually validate credentials via pam_unix (shadow file)
const PAM_CONFIG = `auth    required    pam_unix.so shadow\naccount required    pam_unix.so\n`;

function writePamConfig(port: number): string {
  ensureCredsDir();
  const filePath = path.join(CREDS_DIR, `${port}_pam`);
  fs.writeFileSync(filePath, PAM_CONFIG, { mode: 0o644 });
  return filePath;
}

function removePamConfig(port: number): void {
  const filePath = path.join(CREDS_DIR, `${port}_pam`);
  try { fs.unlinkSync(filePath); } catch { /* ignore */ }
}

export interface ContainerConfig {
  name: string;
  nordUser: string;
  nordPass: string;
  socks5User?: string | null;
  socks5Pass?: string | null;
  country: string;
  city?: string | null;
  externalPort: number;
  allowedIps?: string[] | null;
}

export async function isDockerAvailable(): Promise<boolean> {
  try {
    await getDocker().ping();
    return true;
  } catch {
    return false;
  }
}

export async function getContainerIp(containerId: string): Promise<string | null> {
  try {
    const info = await getDocker().getContainer(containerId).inspect();
    const networks = info.NetworkSettings.Networks;
    const firstNetwork = Object.values(networks)[0];
    return firstNetwork?.IPAddress ?? null;
  } catch {
    return null;
  }
}

export async function createAndStartContainer(config: ContainerConfig): Promise<string> {
  const d = getDocker();
  const containerName = `sh_nordvpn_${config.name.replace(/[^a-z0-9_-]/gi, "_")}_${config.externalPort}`;

  const env: string[] = [
    `NORDVPN_LOGIN=${config.nordUser}`,
    `NORDVPN_USER=${config.nordUser}`,
    `NORDVPN_PASS=${config.nordPass}`,
    `NORDVPN_COUNTRY=${config.country.toUpperCase()}`,
    `SOCKS5_PORT=${SOCKS5_INTERNAL_PORT}`,
    "NET_LOCAL=10.0.0.0/8,172.16.0.0/12,192.168.0.0/16",
  ];

  if (config.city) env.push(`NORDVPN_CITY=${config.city}`);

  // Pass SOCKS5 credentials via environment variables (primary method for edgd1er/nordvpn-proxy).
  // Also write a host-mounted secrets file as fallback for images that read /run/secrets/TINY_CREDS.
  const binds: string[] = [];
  if (config.socks5User && config.socks5Pass) {
    // Env var approach — works with microsocks/dante based images
    env.push(`SOCKS5_USER=${config.socks5User}`);
    env.push(`SOCKS5_PASS=${config.socks5Pass}`);
    env.push(`SOCKS_USER=${config.socks5User}`);
    env.push(`SOCKS_PASS=${config.socks5Pass}`);
    env.push(`PROXY_USER=${config.socks5User}`);
    env.push(`PROXY_PASS=${config.socks5Pass}`);
    // Mount TINY_CREDS so image startup script creates the system user + sets password
    const credsFile = writeCredsFile(config.externalPort, config.socks5User, config.socks5Pass);
    binds.push(`${credsFile}:/run/secrets/TINY_CREDS:ro`);
    // Mount PAM config so Dante actually validates credentials via pam_unix (shadow file).
    // Without /etc/pam.d/sockd the image has no PAM config → any credentials are accepted.
    const pamFile = writePamConfig(config.externalPort);
    binds.push(`${pamFile}:/etc/pam.d/sockd:ro`);
  } else {
    removeCredsFile(config.externalPort);
    removePamConfig(config.externalPort);
  }

  const container = await d.createContainer({
    name: containerName,
    Image: NORDVPN_IMAGE,
    Env: env,
    HostConfig: {
      PortBindings: {
        [`${SOCKS5_INTERNAL_PORT}/tcp`]: [{ HostIp: "0.0.0.0", HostPort: String(config.externalPort) }],
      },
      Binds: binds.length > 0 ? binds : undefined,
      RestartPolicy: { Name: "unless-stopped" },
      CapAdd: ["NET_ADMIN"],
      Devices: [{ PathOnHost: "/dev/net/tun", PathInContainer: "/dev/net/tun", CgroupPermissions: "rwm" }],
    },
    ExposedPorts: { [`${SOCKS5_INTERNAL_PORT}/tcp`]: {} },
  });

  await container.start();

  // Get container IP (assigned after start when connected to Docker network)
  const containerInfo = await container.inspect();
  const containerIp = Object.values(containerInfo.NetworkSettings.Networks)[0]?.IPAddress ?? null;

  if (config.allowedIps && config.allowedIps.length > 0 && containerIp) {
    await applyIpWhitelist(config.externalPort, config.allowedIps, containerIp);
  } else {
    await removeIpWhitelist(config.externalPort);
  }

  return container.id;
}

/**
 * Remove all references to a chain from DOCKER-USER chain.
 * This is needed because after DNAT, traffic goes through FORWARD (via DOCKER-USER),
 * not INPUT — so INPUT chain rules have no effect on Docker published ports.
 */
async function cleanChainFromDockerUser(chain: string): Promise<void> {
  try {
    const { stdout } = await execAsync(`iptables -S DOCKER-USER 2>/dev/null || echo ""`);
    for (const line of stdout.split("\n")) {
      if (line.includes(` ${chain}`)) {
        const deleteCmd = line.replace(/^-A DOCKER-USER/, "iptables -D DOCKER-USER").trim();
        if (deleteCmd.startsWith("iptables")) {
          await execAsync(`${deleteCmd} 2>/dev/null || true`);
        }
      }
    }
  } catch {
    // ignore
  }
}

/**
 * Apply IP whitelist using DOCKER-USER chain.
 *
 * Docker published port traffic flows:
 *   external:PORT → PREROUTING (DNAT → containerIP:1080) → FORWARD (DOCKER-USER) → container
 *
 * INPUT chain has NO effect on this traffic. We must use DOCKER-USER.
 * We match by destination (container IP) and dport (internal SOCKS5 port).
 */
export async function applyIpWhitelist(externalPort: number, allowedIps: string[], containerIp: string): Promise<void> {
  const chain = `NS_${externalPort}`;
  try {
    // Remove any existing references to this chain from DOCKER-USER
    await cleanChainFromDockerUser(chain);

    // Create or flush our chain
    await execAsync(`iptables -N ${chain} 2>/dev/null || iptables -F ${chain}`);

    // Allow specified source IPs/CIDRs
    for (const ip of allowedIps) {
      const trimmed = ip.trim();
      if (trimmed) await execAsync(`iptables -A ${chain} -s ${trimmed} -j RETURN`);
    }
    // Drop everything else
    await execAsync(`iptables -A ${chain} -j DROP`);

    // Insert jump into DOCKER-USER, targeting this specific container's internal port
    await execAsync(
      `iptables -I DOCKER-USER -d ${containerIp} -p tcp --dport ${SOCKS5_INTERNAL_PORT} -j ${chain}`
    );

    logger.info({ chain, containerIp, allowedIps }, "IP whitelist applied via DOCKER-USER");
  } catch (err) {
    logger.warn({ err }, "iptables whitelist apply failed");
  }
}

export async function removeIpWhitelist(externalPort: number): Promise<void> {
  const chain = `NS_${externalPort}`;
  try {
    await cleanChainFromDockerUser(chain);
    await execAsync(`iptables -F ${chain} 2>/dev/null || true`);
    await execAsync(`iptables -X ${chain} 2>/dev/null || true`);
    logger.info({ chain }, "IP whitelist removed");
  } catch {
    // ignore
  }
}

export async function stopAndRemoveContainer(containerId: string): Promise<void> {
  const d = getDocker();
  try {
    const container = d.getContainer(containerId);
    const info = await container.inspect();
    if (info.State.Running) await container.stop({ t: 10 });
    await container.remove({ force: true });
  } catch (err: unknown) {
    if (err && typeof err === "object" && "statusCode" in err && (err as { statusCode: number }).statusCode === 404) return;
    throw err;
  }
}

export async function restartContainer(containerId: string): Promise<void> {
  await getDocker().getContainer(containerId).restart({ t: 10 });
}

export async function getContainerStatus(containerId: string): Promise<"running" | "stopped" | "error"> {
  try {
    const info = await getDocker().getContainer(containerId).inspect();
    if (info.State.Running) return "running";
    if (info.State.Dead || info.State.OOMKilled) return "error";
    return "stopped";
  } catch {
    return "error";
  }
}

export async function getContainerLogs(containerId: string): Promise<string> {
  try {
    const logs = await getDocker().getContainer(containerId).logs({
      stdout: true, stderr: true, tail: 200, timestamps: true,
    });
    return logs.toString("utf8");
  } catch {
    return "Unable to retrieve logs.";
  }
}

export async function initSnatRules(): Promise<void> {
  const gateway = "172.17.0.1";
  try {
    await execAsync(
      `iptables -t nat -C POSTROUTING -o docker0 -p tcp --dport ${SOCKS5_INTERNAL_PORT} -j SNAT --to-source ${gateway} 2>/dev/null || iptables -t nat -I POSTROUTING -o docker0 -p tcp --dport ${SOCKS5_INTERNAL_PORT} -j SNAT --to-source ${gateway}`
    );
    logger.info("SNAT rule for Docker SOCKS5 applied");
  } catch (err) {
    logger.warn({ err }, "Failed to apply SNAT rule (may need root)");
  }
}

export async function allocatePort(usedPorts: number[]): Promise<number> {
  const MIN_PORT = 12000;
  const MAX_PORT = 62000;
  for (let port = MIN_PORT; port <= MAX_PORT; port++) {
    if (!usedPorts.includes(port)) return port;
  }
  throw new Error("No available ports in range 12000-62000");
}

export async function getPublicIp(): Promise<string> {
  try {
    const response = await fetch("https://api.ipify.org?format=json");
    const data = (await response.json()) as { ip: string };
    return data.ip;
  } catch {
    return "127.0.0.1";
  }
}
