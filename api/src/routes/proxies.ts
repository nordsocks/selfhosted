import { Router, type IRouter } from "express";
import { db, shProxiesTable } from "../db";
import { eq, and } from "drizzle-orm";
import { authenticate } from "../middlewares/auth";
import { encrypt, decrypt } from "../lib/crypto";
import { getCountryByCode } from "../lib/countries";
import {
  createAndStartContainer, stopAndRemoveContainer, restartContainer,
  getContainerStatus, getContainerLogs, allocatePort, getPublicIp,
  applyIpWhitelist, removeIpWhitelist,
} from "../lib/docker";

const router: IRouter = Router();

function formatProxy(p: typeof shProxiesTable.$inferSelect) {
  const allowedIps = p.allowedIps ? (p.allowedIps.split(",").map(s => s.trim()).filter(Boolean)) : null;
  return {
    id: String(p.id),
    name: p.name,
    country: p.country,
    countryName: p.countryName,
    city: p.city ?? null,
    externalPort: p.externalPort,
    status: p.status,
    containerId: p.containerId ?? null,
    publicIp: p.publicIp ?? null,
    allowedIps: allowedIps,
    hasSocks5Creds: !!(p.socks5UserEncrypted && p.socks5PassEncrypted),
    rotationInterval: p.rotationInterval ?? 0,
    rotationNextAt: p.rotationNextAt?.toISOString() ?? null,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
    lastCountryChangeAt: p.lastCountryChangeAt?.toISOString() ?? null,
  };
}

router.get("/proxies", authenticate, async (req, res): Promise<void> => {
  const proxies = await db.select().from(shProxiesTable).where(eq(shProxiesTable.userId, req.user!.userId));
  const updated = await Promise.all(proxies.map(async (p) => {
    if (p.containerId && p.status !== "stopped") {
      const liveStatus = await getContainerStatus(p.containerId);
      if (liveStatus !== p.status) {
        const [u] = await db.update(shProxiesTable)
          .set({ status: liveStatus, updatedAt: new Date() })
          .where(eq(shProxiesTable.id, p.id))
          .returning();
        return u;
      }
    }
    return p;
  }));
  res.json(updated.map(formatProxy));
});

router.post("/proxies", authenticate, async (req, res): Promise<void> => {
  const { name, nordUser, nordPass, country, city } = req.body as {
    name: string; nordUser: string; nordPass: string; country: string; city?: string;
  };

  if (!name || !nordUser || !nordPass || !country) {
    res.status(400).json({ error: "Validation error", message: "Missing required fields" });
    return;
  }
  const countryInfo = getCountryByCode(country);
  if (!countryInfo) {
    res.status(400).json({ error: "Validation error", message: "Invalid country code" });
    return;
  }
  const existing = await db.select().from(shProxiesTable).where(
    and(eq(shProxiesTable.userId, req.user!.userId), eq(shProxiesTable.name, name))
  );
  if (existing.length > 0) {
    res.status(400).json({ error: "Conflict", message: "A proxy with this name already exists" });
    return;
  }
  const userProxies = await db.select().from(shProxiesTable).where(eq(shProxiesTable.userId, req.user!.userId));
  const activeProxies = userProxies.filter(p => p.status !== "stopped" && p.status !== "error");
  if (activeProxies.length >= 10) {
    res.status(429).json({ error: "Limit reached", message: "Maximum 10 simultaneous connections per NordVPN account." });
    return;
  }
  const allProxies = await db.select().from(shProxiesTable);
  const usedPorts = allProxies.map(p => p.externalPort);
  const externalPort = await allocatePort(usedPorts);
  const publicIp = await getPublicIp();
  const nordUserEncrypted = encrypt(nordUser);
  const nordPassEncrypted = encrypt(nordPass);
  const [proxy] = await db.insert(shProxiesTable).values({
    userId: req.user!.userId, name, country: country.toLowerCase(),
    countryName: countryInfo.name, city: city ?? null,
    externalPort, status: "starting", publicIp, nordUserEncrypted, nordPassEncrypted,
  }).returning();

  try {
    const containerId = await createAndStartContainer({
      name: `${req.user!.userId}_${proxy.id}`, nordUser, nordPass,
      country: country.toLowerCase(), city: city ?? null, externalPort,
    });
    const [updated] = await db.update(shProxiesTable)
      .set({ containerId, status: "starting" })
      .where(eq(shProxiesTable.id, proxy.id))
      .returning();
    res.status(201).json(formatProxy(updated));
  } catch (err) {
    req.log.error({ err }, "Failed to start Docker container");
    await db.update(shProxiesTable).set({ status: "error" }).where(eq(shProxiesTable.id, proxy.id));
    const [updated] = await db.select().from(shProxiesTable).where(eq(shProxiesTable.id, proxy.id));
    res.status(201).json(formatProxy(updated));
  }
});

router.get("/proxies/:id/status", authenticate, async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  const [proxy] = await db.select().from(shProxiesTable).where(
    and(eq(shProxiesTable.id, id), eq(shProxiesTable.userId, req.user!.userId))
  );
  if (!proxy) { res.status(404).json({ error: "Not Found" }); return; }
  if (!proxy.containerId) { res.json({ status: proxy.status }); return; }
  const liveStatus = await getContainerStatus(proxy.containerId);
  await db.update(shProxiesTable).set({ status: liveStatus, updatedAt: new Date() }).where(eq(shProxiesTable.id, id));
  res.json({ status: liveStatus });
});

router.post("/proxies/:id/restart", authenticate, async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  const [proxy] = await db.select().from(shProxiesTable).where(
    and(eq(shProxiesTable.id, id), eq(shProxiesTable.userId, req.user!.userId))
  );
  if (!proxy) { res.status(404).json({ error: "Not Found" }); return; }
  if (!proxy.containerId) { res.status(400).json({ error: "Container not running" }); return; }
  try {
    await restartContainer(proxy.containerId);
    const [updated] = await db.update(shProxiesTable)
      .set({ status: "starting", updatedAt: new Date() })
      .where(eq(shProxiesTable.id, id))
      .returning();
    res.json(formatProxy(updated));
  } catch (err) {
    req.log.error({ err }, "Failed to restart container");
    res.status(500).json({ error: "Failed to restart" });
  }
});

router.post("/proxies/:id/stop", authenticate, async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  const [proxy] = await db.select().from(shProxiesTable).where(
    and(eq(shProxiesTable.id, id), eq(shProxiesTable.userId, req.user!.userId))
  );
  if (!proxy) { res.status(404).json({ error: "Not Found" }); return; }
  if (proxy.containerId) {
    await stopAndRemoveContainer(proxy.containerId).catch(() => {});
  }
  const [updated] = await db.update(shProxiesTable)
    .set({ status: "stopped", containerId: null, updatedAt: new Date() })
    .where(eq(shProxiesTable.id, id))
    .returning();
  res.json(formatProxy(updated));
});

router.delete("/proxies/:id", authenticate, async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  const [proxy] = await db.select().from(shProxiesTable).where(
    and(eq(shProxiesTable.id, id), eq(shProxiesTable.userId, req.user!.userId))
  );
  if (!proxy) { res.status(404).json({ error: "Not Found" }); return; }
  if (proxy.containerId) await stopAndRemoveContainer(proxy.containerId).catch(() => {});
  await db.delete(shProxiesTable).where(eq(shProxiesTable.id, id));
  res.json({ success: true });
});

router.patch("/proxies/:id/rotation", authenticate, async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  const { rotationInterval } = req.body as { rotationInterval: number };
  if (typeof rotationInterval !== "number" || rotationInterval < 0) {
    res.status(400).json({ error: "Validation error", message: "rotationInterval must be non-negative" });
    return;
  }
  const [proxy] = await db.select().from(shProxiesTable).where(
    and(eq(shProxiesTable.id, id), eq(shProxiesTable.userId, req.user!.userId))
  );
  if (!proxy) { res.status(404).json({ error: "Not Found" }); return; }
  const rotationNextAt = rotationInterval > 0 ? new Date(Date.now() + rotationInterval * 60_000) : null;
  const [updated] = await db.update(shProxiesTable)
    .set({ rotationInterval, rotationNextAt })
    .where(eq(shProxiesTable.id, id))
    .returning();
  res.json(formatProxy(updated));
});

router.get("/proxies/:id/connection", authenticate, async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  const [proxy] = await db.select().from(shProxiesTable).where(
    and(eq(shProxiesTable.id, id), eq(shProxiesTable.userId, req.user!.userId))
  );
  if (!proxy) { res.status(404).json({ error: "Not Found" }); return; }
  const ip = proxy.publicIp ?? "0.0.0.0";
  const port = proxy.externalPort;
  if (proxy.socks5UserEncrypted && proxy.socks5PassEncrypted) {
    const socks5User = decrypt(proxy.socks5UserEncrypted);
    const socks5Pass = decrypt(proxy.socks5PassEncrypted);
    res.json({ proxyString: `socks5://${socks5User}:${socks5Pass}@${ip}:${port}`, ip, port, socks5User, socks5Pass, authMode: "credentials" });
  } else {
    res.json({ proxyString: `socks5://${ip}:${port}`, ip, port, authMode: "ip-whitelist" });
  }
});

router.get("/proxies/:id/logs", authenticate, async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  const [proxy] = await db.select().from(shProxiesTable).where(
    and(eq(shProxiesTable.id, id), eq(shProxiesTable.userId, req.user!.userId))
  );
  if (!proxy) { res.status(404).json({ error: "Not Found" }); return; }
  const logs = proxy.containerId ? await getContainerLogs(proxy.containerId) : "Container is not running.";
  res.json({ logs, proxyId: String(id) });
});

router.patch("/proxies/:id/country", authenticate, async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  const { country, city } = req.body as { country: string; city?: string };
  const countryInfo = getCountryByCode(country);
  if (!countryInfo) { res.status(400).json({ error: "Invalid country code" }); return; }
  const [proxy] = await db.select().from(shProxiesTable).where(
    and(eq(shProxiesTable.id, id), eq(shProxiesTable.userId, req.user!.userId))
  );
  if (!proxy) { res.status(404).json({ error: "Not Found" }); return; }
  if (proxy.containerId) await stopAndRemoveContainer(proxy.containerId).catch(() => {});
  const nordUser = decrypt(proxy.nordUserEncrypted);
  const nordPass = decrypt(proxy.nordPassEncrypted);
  const socks5User = proxy.socks5UserEncrypted ? decrypt(proxy.socks5UserEncrypted) : null;
  const socks5Pass = proxy.socks5PassEncrypted ? decrypt(proxy.socks5PassEncrypted) : null;
  const allowedIps = proxy.allowedIps ? proxy.allowedIps.split(",").map(s => s.trim()).filter(Boolean) : null;
  try {
    const containerId = await createAndStartContainer({
      name: `${req.user!.userId}_${proxy.id}`, nordUser, nordPass, socks5User, socks5Pass,
      country: country.toLowerCase(), city: city ?? null, externalPort: proxy.externalPort, allowedIps,
    });
    const [updated] = await db.update(shProxiesTable)
      .set({ country: country.toLowerCase(), countryName: countryInfo.name, city: city ?? null, containerId, status: "starting", lastCountryChangeAt: new Date(), updatedAt: new Date() })
      .where(eq(shProxiesTable.id, id))
      .returning();
    res.json(formatProxy(updated));
  } catch (err) {
    req.log.error({ err }, "Failed to change country");
    res.status(500).json({ error: "Failed to change country" });
  }
});

router.patch("/proxies/:id/socks5-credentials", authenticate, async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  const { socks5User, socks5Pass } = req.body as { socks5User: string | null; socks5Pass: string | null };
  const [proxy] = await db.select().from(shProxiesTable).where(
    and(eq(shProxiesTable.id, id), eq(shProxiesTable.userId, req.user!.userId))
  );
  if (!proxy) { res.status(404).json({ error: "Not Found" }); return; }

  const nordUser = decrypt(proxy.nordUserEncrypted);
  const nordPass = decrypt(proxy.nordPassEncrypted);
  const allowedIps = proxy.allowedIps ? proxy.allowedIps.split(",").map(s => s.trim()).filter(Boolean) : null;

  const hasCreds = !!(socks5User && socks5Pass);
  const socks5UserEncrypted = hasCreds ? encrypt(socks5User!) : null;
  const socks5PassEncrypted = hasCreds ? encrypt(socks5Pass!) : null;

  if (proxy.containerId) await stopAndRemoveContainer(proxy.containerId).catch(() => {});

  try {
    const containerId = await createAndStartContainer({
      name: `${req.user!.userId}_${proxy.id}`,
      nordUser, nordPass,
      socks5User: hasCreds ? socks5User! : null,
      socks5Pass: hasCreds ? socks5Pass! : null,
      country: proxy.country, city: proxy.city ?? null,
      externalPort: proxy.externalPort, allowedIps,
    });
    const [updated] = await db.update(shProxiesTable)
      .set({ socks5UserEncrypted, socks5PassEncrypted, containerId, status: "starting", updatedAt: new Date() })
      .where(eq(shProxiesTable.id, id))
      .returning();
    res.json(formatProxy(updated));
  } catch (err) {
    req.log.error({ err }, "Failed to restart container after socks5 credential change");
    res.status(500).json({ error: "Failed to restart container" });
  }
});

router.patch("/proxies/:id/allowed-ips", authenticate, async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  const { allowedIps } = req.body as { allowedIps: string[] | null };

  const [proxy] = await db.select().from(shProxiesTable).where(
    and(eq(shProxiesTable.id, id), eq(shProxiesTable.userId, req.user!.userId))
  );
  if (!proxy) { res.status(404).json({ error: "Not Found" }); return; }

  const ipsStr = Array.isArray(allowedIps) && allowedIps.length > 0
    ? allowedIps.map(s => s.trim()).filter(Boolean).join(",")
    : null;

  const [updated] = await db.update(shProxiesTable)
    .set({ allowedIps: ipsStr, updatedAt: new Date() })
    .where(eq(shProxiesTable.id, id))
    .returning();

  try {
    if (ipsStr) {
      await applyIpWhitelist(proxy.externalPort, ipsStr.split(","));
    } else {
      await removeIpWhitelist(proxy.externalPort);
    }
  } catch (err) {
    req.log.warn({ err }, "iptables update failed");
  }

  res.json(formatProxy(updated));
});

export default router;
