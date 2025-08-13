import express from "express"
import cors from "cors"
import helmet from "helmet"
import cookieParser from "cookie-parser"

import {errorHandler,notFoundHandler} from "./middlewares/error.middleware.js";
import userRoutes from "./routes/user.route.js";



const app = express()

// Essential security headers
app.use(helmet({
    contentSecurityPolicy: false, // Configure based on your needs
    crossOriginEmbedderPolicy: false
}))

// CORS configuration
app.use(cors({
    // origin: process.env.NODE_ENV === "production" ?
    //     process.env.ALLOWED_ORIGINS?.split(',')
    //     : true,
    origin: 'http://localhost:5173',
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));


// Body parsing middleware
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));
app.use(cookieParser());



// ApiError and ApiResponse utilities
import { ApiResponse } from "./utils/apiResponse.js";
import { ApiError } from "./utils/apiError.js";
import productRoute from "./routes/product.route.js";
import categoryRoute from "./routes/category.route.js";
import cartRoute from "./routes/cart.route.js";
import  orderRoute from "./routes/order.route.js";

app.use((req, res, next) => {
    res.response = ApiResponse;
    res.error = ApiError;
    next();
})


// Apply caching to specific routes
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/products", productRoute);
app.use("/api/v1/category", categoryRoute);
app.use("/api/v1/cart", cartRoute);
app.use("/api/v1/orders", orderRoute);

app.use(notFoundHandler);
app.use(errorHandler);



export { app };