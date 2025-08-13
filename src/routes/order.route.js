import {Router} from "express";
import {
    createOrder,
    getUserOrders,
    getOrderById,
    cancelOrder,
    getAllOrders,
    updateOrderStatus,
    updatePaymentStatus,
    getOrderAnalytics,
    trackOrder
} from "../controllers/order.controller.js";

import { isAuthenticated} from "../middlewares/auth.middleware.js";

const router = Router();

// Public routes (no authentication required)
router.get("/track/:id", trackOrder);

// User routes (authentication required)
router.post("/", isAuthenticated, createOrder);
router.get("/my-orders", isAuthenticated, getUserOrders);
router.get("/:id", isAuthenticated, getOrderById);
router.patch("/:id/cancel", isAuthenticated, cancelOrder);

// Admin routes (authentication + admin role required)
router.get("/all", getAllOrders);
router.get("/analytics", getOrderAnalytics);
router.patch("/:id/status", updateOrderStatus);
router.patch("/:id/payment-status", updatePaymentStatus);

export default router;