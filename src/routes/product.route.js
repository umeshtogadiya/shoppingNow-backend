import { Router } from "express";
import {
    createProduct,
    getProductById,
    getAllProducts,
    updateProduct,
    deleteProduct,
    searchProducts,
    filterProducts,
    minStockProducts,
    getFeaturedProducts
} from "../controllers/product.controller.js";
import {  isAuthenticated } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = Router();

// Public routes (specific routes before /:id)
router.get("/search", searchProducts);
router.get("/filter", filterProducts);
router.get("/featured", getFeaturedProducts);
router.get("/products", getAllProducts);
router.get("/:id", getProductById);

// Admin-only routes (require authentication + admin role)
router.get("/min-stock", minStockProducts);
router.post("/",
    isAuthenticated,
    upload.single("image"),
    createProduct
);
router.put("/:id",
    isAuthenticated,
    upload.single("image"),
    updateProduct
);
router.delete("/:id",
    isAuthenticated,
    deleteProduct
);

export default router;