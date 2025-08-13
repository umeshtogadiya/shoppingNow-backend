import { Router } from "express";
import {
    addtoCart,
    getCart,
    updateCart,
    removeFromCart,
    clearCart
} from "../controllers/cart.controller.js";
import { isAuthenticated } from "../middlewares/auth.middleware.js";

const router = Router();

// Protected routes – only accessible to logged-in users
router.post("/add", isAuthenticated, addtoCart);       // Add product to cart
router.get("/", isAuthenticated, getCart);              // Get current user's cart
router.delete("/clear", isAuthenticated, clearCart);     // Empty entire cart
router.put("/:id", isAuthenticated, updateCart);     // Update quantity or items
router.delete("/:id", isAuthenticated, removeFromCart); // Remove specific item


export default router;
