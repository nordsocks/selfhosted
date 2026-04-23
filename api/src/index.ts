import app from "./app";
import { logger } from "./lib/logger";
import { runMigrations, db, shProxiesTable } from "./db";
import { and, gt, lte, not, eq } from "drizzle-orm";
import { createAndStartContainer, stopAndRemoveContainer, initSnatRules } from "./lib/docker";
import { decrypt } from "./lib/crypto";
import { COUNTRIES } from "./lib/countries";

const rawPort = process.env["PORT"];
if (!rawPort) {
  throw new Error("PORT environment variable is required but was not provided.");
}
const port = Number(rawPort);

async function main() {
  await runMigrations();
  logger.info("Database migrations complete");

  await initSnatRules();

  app.listen(port, "0.0.0.0", () => {
    logger.info({ port }, "NordSOCKS Self-Hosted API server started");
  });

  setInterval(runRotation, 60_000);
}

async function runRotation() {
  try {
    const now = new Date();
    const proxiesToRotate = await db
      .select()
      .from(shProxiesTable)
      .where(
        and(
          gt(shProxiesTable.rotationInterval, 0),
          lte(shProxiesTable.rotationNextAt, now),
          not(eq(shProxiesTable.status, "stopped")),
        )
      );

    for (const proxy of proxiesToRotate) {
      try {
        logger.info({ proxyId: proxy.id, rotationMode: proxy.rotationMode }, "Rotating proxy");
        if (proxy.containerId) {
          await stopAndRemoveContainer(proxy.containerId).catch(() => {});
        }
        const nordUser = decrypt(proxy.nordUserEncrypted);
        const nordPass = decrypt(proxy.nordPassEncrypted);

        // Pick country: random or fixed
        let country = proxy.country;
        let countryName = proxy.countryName;
        let city: string | null = proxy.city;
        if (proxy.rotationMode === "random") {
          const randomCountry = COUNTRIES[Math.floor(Math.random() * COUNTRIES.length)];
          country = randomCountry.code.toLowerCase();
          countryName = randomCountry.name;
          city = null;
        }

        const containerId = await createAndStartContainer({
          name: `${proxy.userId}_${proxy.id}`,
          nordUser, nordPass, country, city,
          externalPort: proxy.externalPort,
        });
        const nextAt = new Date(Date.now() + proxy.rotationInterval * 60_000);
        await db.update(shProxiesTable)
          .set({ containerId, status: "starting", rotationNextAt: nextAt, country, countryName, city, updatedAt: new Date() })
          .where(eq(shProxiesTable.id, proxy.id));
        logger.info({ proxyId: proxy.id, country }, "Proxy rotated successfully");
      } catch (err) {
        logger.error({ err, proxyId: proxy.id }, "Failed to rotate proxy");
        const nextAt = new Date(Date.now() + proxy.rotationInterval * 60_000);
        await db.update(shProxiesTable)
          .set({ status: "error", rotationNextAt: nextAt })
          .where(eq(shProxiesTable.id, proxy.id));
      }
    }
  } catch (err) {
    logger.error({ err }, "Rotation scheduler error");
  }
}

main().catch(err => {
  logger.error({ err }, "Fatal startup error");
  process.exit(1);
});
