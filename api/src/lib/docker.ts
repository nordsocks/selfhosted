import Docker from "dockerode";
import { exec } from "child_process";
import { promisify } from "util";
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
  if (config.socks5User && config.socks5Pass) {
    env.push(`SOCKS5_USER=${config.socks5User}`);
    env.push(`SOCKS5_PASSWORD=${config.socks5Pass}`);
  }

  const container = await d.createContainer({
    name: containerName,
    Image: NORDVPN_IMAGE,
    Env: env,
    HostConfig: {
      PortBindings: {
        [`${SOCKS5_INTERNAL_PORT}/tcp`]: [{ HostIp: "0.0.0.0", HostPort: String(config.externalPort) }],
      },
      RestartPolicy: { Name: "unless-stopped" },
      CapAdd: ["NET_ADMIN"],
      Devices: [{ PathOnHost: "/dev/net/tun", PathInContainer: "/dev/net/tun", CgroupPermissions: "rwm" }],
    },
    ExposedPorts: { [`${SOCKS5_INTERNAL_PORT}/tcp`]: {} },
  });

  await container.start();

  if (config.allowedIps && config.allowedIps.length > 0) {
    await applyIpWhitelist(config.externalPort, config.allowedIps);
  } else {
    await removeIpWhitelist(config.externalPort);
  }

  return container.id;
}

export async function applyIpWhitelist(externalPort: number, allowedIps: string[]): Promise<void> {
  const chain = `NS_${externalPort}`;
  try {
    await execAsync(`iptables -N ${chain} 2>/dev/null || iptables -F ${chain}`);
    for (const ip of allowedIps) {
      const trimmed = ip.trim();
      if (trimmed) await execAsync(`iptables -A ${chain} -s ${trimmed} -j ACCEPT`);
    }
    await execAsync(`iptables -A ${chain} -j DROP`);
    await execAsync(
      `iptables -C INPUT -p tcp --dport ${externalPort} -j ${chain} 2>/dev/null || iptables -I INPUT -p tcp --dport ${externalPort} -j ${chain}`
    );
  } catch (err) {
    logger.warn({ err }, "iptables whitelist apply failed");
  }
}

export async function removeIpWhitelist(externalPort: number): Promise<void> {
  const chain = `NS_${externalPort}`;
  try {
    await execAsync(`iptables -D INPUT -p tcp --dport ${externalPort} -j ${chain} 2>/dev/null || true`);
    await execAsync(`iptables -F ${chain} 2>/dev/null || true`);
    await execAsync(`iptables -X ${chain} 2>/dev/null || true`);
  } catch {
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
