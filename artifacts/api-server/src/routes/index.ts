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
import variantsRouter from "./variants";
import { perProductRouter as reviewsPerProductRouter, allReviewsRouter } from "./reviews";
import restaurantTablesRouter from "./restaurant/tables";
import restaurantOrdersRouter from "./restaurant/orders";
import restaurantDailyMenuRouter from "./restaurant/daily-menu";
import restaurantStatsRouter from "./restaurant/stats";
import salesRouter from "./sales";
import clientsRouter from "./clients";
import supportTicketsRouter from "./support-tickets";
import activeAnnouncementsRouter from "./announcements";
import analyticsRouter from "./analytics";
import restaurantAnalyticsRouter from "./restaurant/analytics";
import publicRouter from "./public";
import uploadsRouter from "./uploads";
import { requireActiveLicense } from "../middlewares/session";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/stores", storesRouter);
router.use("/admin", adminRouter);
router.use("/public", publicRouter);
router.use("/active-announcements", activeAnnouncementsRouter);
router.use("/support-tickets", supportTicketsRouter);

// ─── Business routes — require an active license ──────────────────────────────
router.use("/stores/me", requireActiveLicense, customizationRouter);
router.use("/categories", requireActiveLicense, categoriesRouter);
router.use("/products", requireActiveLicense, productsRouter);
router.use("/products", requireActiveLicense, productImagesRouter);
router.use("/products/:productId/variants", requireActiveLicense, variantsRouter);
router.use("/products/:productId/reviews", requireActiveLicense, reviewsPerProductRouter);
router.use("/reviews", requireActiveLicense, allReviewsRouter);
router.use("/inventory", requireActiveLicense, inventoryRouter);
router.use("/stats", requireActiveLicense, statsRouter);
router.use("/restaurant/tables", requireActiveLicense, restaurantTablesRouter);
router.use("/restaurant/orders", requireActiveLicense, restaurantOrdersRouter);
router.use("/restaurant/daily-menu", requireActiveLicense, restaurantDailyMenuRouter);
router.use("/restaurant/stats", requireActiveLicense, restaurantStatsRouter);
router.use("/sales", requireActiveLicense, salesRouter);
router.use("/clients", requireActiveLicense, clientsRouter);
router.use("/analytics", requireActiveLicense, analyticsRouter);
router.use("/restaurant/analytics", requireActiveLicense, restaurantAnalyticsRouter);
router.use("/uploads", requireActiveLicense, uploadsRouter);

export default router;
