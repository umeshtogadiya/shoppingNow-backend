import {asyncHandler} from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js";
import {Cart} from "../models/cart.model.js";
import {ApiResponse} from "../utils/ApiResponse.js";
import {Order, ORDER_STATUS, PAYMENT_STATUS} from "../models/order.model.js";


const createOrder = asyncHandler(async (req, res) => {
    try {
        if (!req.user || !req.user._id) {
            throw new ApiError(401, "User not authenticated");
        }
        const userId = req.user._id;

        const {
            shippingAddress,
            paymentMethod,
            totalAmount,
            notes,
            items: bodyItems,
            fromCart = true
        } = req.body;

        let items = [];

        if (fromCart) {
            const cart = await Cart.findOne({ user: userId }).populate("items.product");
            if (!cart || cart.items.length === 0) {
                throw new ApiError(400, "Cart is empty");
            }

            items = cart.items.map(item => ({
                product: item.product._id,
                quantity: item.quantity,
                unitPrice: item.product.sellingPrice,
                totalPrice: item.product.sellingPrice * item.quantity
            }));

        } else {
            if (!bodyItems || bodyItems.length === 0) {
                throw new ApiError(400, "No items provided");
            }
            items = bodyItems.map(item => ({
                product: item.product,
                quantity: item.quantity,
                unitPrice: item.sellingPrice,
                totalPrice: item.sellingPrice * item.quantity
            }));
        }

        // 🔹 Generate unique Order Number
        const orderNumber = `ORD-${Date.now()}`;

        const order = await Order.create({
            user: userId,
            orderNumber,
            items,
            shippingAddress,
            paymentMethod,
            totalAmount,
            notes
        });

        if (fromCart) {
            await Cart.findOneAndUpdate({ user: userId }, { items: [] });
        }

        // ✅ Return clean response for frontend
        return res.status(201).json(
            new ApiResponse(201, {
                _id: order._id,
                orderNumber: order.orderNumber
            }, "Order created successfully")
        );

    } catch (error) {
        console.error("Error creating order:", error);
        if (error instanceof ApiError) {
            return res
                .status(error.statusCode)
                .json(new ApiResponse(error.statusCode, null, error.message));
        }
        return res
            .status(500)
            .json(new ApiResponse(500, null, "Internal Server Error"));
    }
});

const getOrderById = asyncHandler(async (req, res) => {
    const {id} = req.params;

    if (!id) {
        throw new ApiError(400, "Order ID is required");
    }

    const order = await Order.findOne({ _id: id, user: req.user._id }).populate('items.product', 'name price');

    if (!order) {
        throw new ApiError(404, "Order not found");
    }

    return res.status(200).json(
        new ApiResponse(200, order, "Order fetched successfully")
    );
});

const getAllOrders = asyncHandler(async (req, res) => {

    const { page = 1, limit = 20, status, paymentStatus, search } = req.query

    const filter = {}
    if (status) filter.orderStatus = status
    if (paymentStatus) filter.paymentStatus = paymentStatus
    if (search) filter.orderNumber = { $regex: search, $options: 'i' }

    const orders = await Order.find(filter)
        .populate('user', 'name email phone')
        .populate('items.product', 'name price')
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .lean();

    const total = await Order.countDocuments(filter)

    res.json(new ApiResponse(200, {
        orders,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        total
    }, "All orders retrieved successfully"))
})

const updateOrderStatus = asyncHandler(async (req, res) => {
    const { id } = req.params
    const { status, trackingNumber, estimatedDelivery } = req.body

    if (!ORDER_STATUS.includes(status)) {
        throw new ApiError(400, "Invalid order status")
    }

    const order = await Order.findById(id)
    if (!order) {
        throw new ApiError(404, "Order not found")
    }

    order.orderStatus = status
    if (trackingNumber) order.trackingNumber = trackingNumber
    if (estimatedDelivery) order.estimatedDelivery = estimatedDelivery

    await order.save()

    res.json(new ApiResponse(200, order, "Order status updated successfully"))
})

const deleteOrder = asyncHandler(async (req, res) => {
    const {id} = req.params;

    if (!id) {
        throw new ApiError(400, "Order ID is required");
    }

    const order = await Order.findByIdAndDelete(id);

    if (!order) {
        throw new ApiError(404, "Order not found");
    }

    return res.status(200).json(
        new ApiResponse(200, {}, "Order deleted successfully")
    );
});

const getUserOrders = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, status } = req.query
    const userId = req.user._id

    const filter = { user: userId }
    if (status) filter.orderStatus = status

    const orders = await Order.find(filter)
        .populate('items.product', 'name images price')
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit)

    const total = await Order.countDocuments(filter)

    res.json(new ApiResponse(200, {
        orders,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        total
    }, "Orders retrieved successfully"))
});

const cancelOrder = asyncHandler(async (req, res) => {
    const { orderId } = req.params
    const { cancelReason } = req.body
    const userId = req.user._id

    const order = await Order.findOne({ _id: orderId, user: userId })

    if (!order) {
        throw new ApiError(404, "Order not found")
    }

    if (!order.canBeCancelled()) {
        throw new ApiError(400, "Order cannot be cancelled at this stage")
    }

    order.orderStatus = 'cancelled'
    order.cancelReason = cancelReason
    await order.save()

    res.json(new ApiResponse(200, order, "Order cancelled successfully"))
})

const updatePaymentStatus = asyncHandler(async (req, res) => {
    const { id } = req.params
    const { status, transactionId, paymentGateway } = req.body

    if (!PAYMENT_STATUS.includes(status)) {
        throw new ApiError(400, "Invalid payment status")
    }

    const order = await Order.findById(id)
    if (!order) {
        throw new ApiError(404, "Order not found")
    }

    order.paymentStatus = status
    if (transactionId) order.paymentDetails.transactionId = transactionId
    if (paymentGateway) order.paymentDetails.paymentGateway = paymentGateway

    await order.save()

    res.json(new ApiResponse(200, order, "Payment status updated successfully"))
})

const getOrderAnalytics = asyncHandler(async (req, res) => {
    const { days = 30 } = req.query
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const analytics = await Order.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        {
            $group: {
                _id: null,
                totalOrders: { $sum: 1 },
                totalRevenue: { $sum: '$totalAmount' },
                avgOrderValue: { $avg: '$totalAmount' },
                cancelledOrders: {
                    $sum: { $cond: [{ $eq: ['$orderStatus', 'cancelled'] }, 1, 0] }
                },
                deliveredOrders: {
                    $sum: { $cond: [{ $eq: ['$orderStatus', 'delivered'] }, 1, 0] }
                }
            }
        }
    ])

    const statusBreakdown = await Order.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        { $group: { _id: '$orderStatus', count: { $sum: 1 } } }
    ])

    res.json(new ApiResponse(200, {
        summary: analytics[0] || {},
        statusBreakdown
    }, "Order analytics retrieved successfully"))
})

const trackOrder = asyncHandler(async (req, res) => {
    const { id } = req.params

    const order = await Order.findById(id)
        .select('orderNumber orderStatus trackingNumber estimatedDelivery createdAt deliveredAt')

    if (!order) {
        throw new ApiError(404, "Order not found")
    }

    res.json(new ApiResponse(200, order, "Order tracking retrieved successfully"))
})




export {
    createOrder,
    getUserOrders,
    getOrderById,
    cancelOrder,
    getAllOrders,
    updateOrderStatus,
    updatePaymentStatus,
    getOrderAnalytics,
    deleteOrder,
    trackOrder
};
