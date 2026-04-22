import { Router, type IRouter } from "express";
import { COUNTRIES } from "../lib/countries";

const router: IRouter = Router();

router.get("/countries", (_req, res) => {
  res.json(COUNTRIES);
});

export default router;
