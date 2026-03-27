import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import storesRouter from "./stores";
import adminRouter from "./admin";
import categoriesRouter from "./categories";
import productsRouter from "./products";
import inventoryRouter from "./inventory";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/stores", storesRouter);
router.use("/admin", adminRouter);
router.use("/categories", categoriesRouter);
router.use("/products", productsRouter);
router.use("/inventory", inventoryRouter);

export default router;
