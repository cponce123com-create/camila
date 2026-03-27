import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import storesRouter from "./stores";
import adminRouter from "./admin";
import categoriesRouter from "./categories";
import productsRouter from "./products";
import inventoryRouter from "./inventory";
import customizationRouter from "./customization";
import productImagesRouter from "./product_images";
import statsRouter from "./stats";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/stores", storesRouter);
router.use("/stores/me", customizationRouter);
router.use("/admin", adminRouter);
router.use("/categories", categoriesRouter);
router.use("/products", productsRouter);
router.use("/products", productImagesRouter);
router.use("/inventory", inventoryRouter);
router.use("/stats", statsRouter);

export default router;
