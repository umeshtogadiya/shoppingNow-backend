import { Router } from "express";
import {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    getCurrentUser,
    updateAccountDetails,
    changeCurrentPassword,
    verifyEmail
} from "../controllers/user.controller.js";
import { isAuthenticated } from "../middlewares/auth.middleware.js";

const router = Router();

// 🔓 Public Routes
router.post("/register", registerUser);             // Register a new user
router.post("/login", loginUser);                   // Login and get access/refresh tokens
router.post("/refresh-token", refreshAccessToken);  // Get new access token using refresh token

// 🔐 Protected Routes (Requires Authentication)
router.get("/profile", isAuthenticated, getCurrentUser);                     // Get current logged-in user info
router.post("/logout", isAuthenticated, logoutUser);                         // Logout user
router.post("/update-profile", isAuthenticated, updateAccountDetails);      // Update name, email, etc.
router.post("/change-password", isAuthenticated, changeCurrentPassword);    // Change user password
router.post("/verify-email", isAuthenticated, verifyEmail);                 // Trigger email verification

export default router;
