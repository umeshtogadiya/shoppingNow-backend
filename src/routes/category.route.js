import { Router } from "express";
import {
    createCategory,
    getAllCategories,
    getCategoryById,
    updateCategory,
    deleteCategory
} from "../controllers/category.controller.js";
import { isAuthenticated } from "../middlewares/auth.middleware.js";

const router = Router();

// Public routes
router.get("/all", getAllCategories);
router.get("/:id", getCategoryById);

// Admin-only routes
router.post(
    "/",
    isAuthenticated,
    createCategory
);

router.put(
    "/:id",
    isAuthenticated,
    updateCategory
);

router.delete(
    "/:id",
    isAuthenticated,
    deleteCategory
);

export default router;
