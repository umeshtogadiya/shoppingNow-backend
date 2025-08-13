import {asyncHandler} from "../utils/asyncHandler.js";


import {Cart} from '../models/cart.model.js'
import {Product} from '../models/product.model.js'
import {ApiError} from "../utils/ApiError.js";
import {ApiResponse} from "../utils/ApiResponse.js";


const addtoCart = asyncHandler(async (req, res) => {
    try {
        const { product, quantity, priceAtAddTime } = req.body;

        if (!product || !priceAtAddTime) {
            return res.status(400).json({ success: false, message: "Missing product or price" });
        }

        const userId = req.user._id;
        let cart = await Cart.findOne({ user: userId });

        if (!cart) {
            cart = new Cart({
                user: userId,
                items: [{ product, quantity, priceAtAddTime }],
            });
        } else {
            const existingItem = cart.items.find(
                (item) => item.product.toString() === product
            );

            if (existingItem) {
                existingItem.quantity += quantity;
            } else {
                cart.items.push({ product, quantity, priceAtAddTime });
            }
        }

        await cart.save();
        res.status(200).json({ success: true, cart });

    } catch (err) {
        console.error("🛑 Add to cart error:", err);
        res.status(500).json({ success: false, message: "Server error", error: err.message });
    }
})

const getCart = asyncHandler(async (req, res) => {
    try {
        const userId = req.user?._id;

        if (!userId) {
            return res.status(401).json({ success: false, message: "User not authenticated" });
        }

        const cart = await Cart.findOne({ user: userId }).populate("items.product");

        if (!cart) {
            return res.status(404).json({ success: false, message: "Cart not found" });
        }

        res.status(200).json({ success: true, cart });
    } catch (err) {
        console.error("❌ Error fetching cart:", err);
        res.status(500).json({ success: false, message: "Server error", error: err.message });
    }
})

const updateCart = asyncHandler(async (req, res) => {
    const { quantity } = req.body;
    const productId = req.params.id; // ✅ now coming from URL
    const userId = req.user._id;

    if (!productId || quantity < 0) {
        throw new ApiError(400, "Invalid product ID or quantity");
    }

    const cart = await Cart.findOne({ user: userId });
    if (!cart) throw new ApiError(404, "Cart not found");

    const itemIndex = cart.items.findIndex(item =>
        item.product.toString() === productId
    );

    if (itemIndex === -1) throw new ApiError(404, "Product not found in cart");

    if (quantity === 0) {
        cart.items.splice(itemIndex, 1);
    } else {
        cart.items[itemIndex].quantity = quantity;
    }

    await cart.save();

    return res.status(200).json(
        new ApiResponse(200, cart, "Cart updated successfully")
    );
});

const removeFromCart = asyncHandler(async (req, res) => {
    const productId = req.params.id;
    const userId = req.user._id;

    if (!productId) {
        throw new ApiError(400, "Product ID is required");
    }

    const cart = await Cart.findOne({ user: userId });

    if (!cart) {
        throw new ApiError(404, "Cart not found");
    }

    const itemIndex = cart.items.findIndex(item =>
        item.product.toString() === productId
    );

    if (itemIndex === -1) {
        throw new ApiError(404, "Product not found in cart");
    }

    cart.items.splice(itemIndex, 1);
    await cart.save();

    return res.status(200).json(
        new ApiResponse(200, cart, "Product removed from cart successfully")
    );
});

const clearCart = asyncHandler(async (req, res) => {
    console.log("🔥 Clear cart function called for user:", req.user._id);

    const userId = req.user._id;

    const cart = await Cart.findOne({ user: userId });
    if (!cart) {
        throw new ApiError(404, "Cart not found");
    }

    cart.items = [];
    cart.totalItems = 0;
    cart.totalPrice = 0;

    await cart.save();

    return res.status(200).json(
        new ApiResponse(200, cart, "Cart cleared successfully")
    );
})

export {
    addtoCart,
    getCart,
    updateCart,
    removeFromCart,
    clearCart
}

