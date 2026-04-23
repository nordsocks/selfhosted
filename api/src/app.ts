import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import path from "path";
import { existsSync } from "fs";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(pinoHttp({
  logger,
  serializers: {
    req(req) { return { id: req.id, method: req.method, url: req.url?.split("?")[0] }; },
    res(res) { return { statusCode: res.statusCode }; },
  },
}));
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/api", router);

// Serve built panel frontend (panel/dist/) if it exists
const panelDist = process.env["PANEL_DIST"]
  ? path.resolve(process.cwd(), process.env["PANEL_DIST"])
  : path.resolve(process.cwd(), "../panel/dist");

if (existsSync(panelDist)) {
  app.use(express.static(panelDist));
  app.get(/.*/, (_req, res) => {
    res.sendFile(path.join(panelDist, "index.html"));
  });
}

export default app;
