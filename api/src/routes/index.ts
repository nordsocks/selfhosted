import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import proxiesRouter from "./proxies";
import accountRouter from "./account";
import countriesRouter from "./countries";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(proxiesRouter);
router.use(accountRouter);
router.use(countriesRouter);

export default router;
