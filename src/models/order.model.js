import mongoose from 'mongoose'

// RECOMMENDED: Enums defined outside (constants)
const PAYMENT_METHODS = ['COD', 'CARD', 'UPI', 'WALLET']
const PAYMENT_STATUS = ['pending', 'paid', 'failed', 'refunded']
const ORDER_STATUS = ['processing', 'confirmed', 'shipped', 'out_for_delivery', 'delivered', 'cancelled', 'returned']

const orderItemSchema = new mongoose.Schema({
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    quantity: {
        type: Number,
        required: true,
        min: 1
    },
    unitPrice: {
        type: Number,
        required: true,
        min: 0
    },
    totalPrice: {
        type: Number,
        required: true,
        min: 0
    }
}, { _id: false })

const orderSchema = new mongoose.Schema({
    orderNumber: {
        type: String,
        unique: true,
        required: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    items: {
        type: [orderItemSchema],
        validate: {
            validator: function(items) {
                return items && items.length > 0
            },
            message: 'Order must have at least one item'
        }
    },
    shippingAddress: {
        fullName: { type: String, required: true, trim: true },
        phone: { type: String, required: true, trim: true },
        street: { type: String, required: true, trim: true },
        city: { type: String, required: true, trim: true },
        state: { type: String, required: true, trim: true },
        postalCode: { type: String, required: true, trim: true },
        country: { type: String, default: 'India', trim: true }
    },
    paymentMethod: {
        type: String,
        enum: PAYMENT_METHODS,
        required: true
    },
    paymentStatus: {
        type: String,
        enum: PAYMENT_STATUS,
        default: 'pending'
    },
    orderStatus: {
        type: String,
        enum: ORDER_STATUS,
        default: 'processing'
    },
    paymentDetails: {
        transactionId: String,
        paymentGateway: String,
        paidAt: Date
    },
    trackingNumber: {
        type: String,
        sparse: true
    },
    estimatedDelivery: {
        type: Date
    },
    notes: {
        type: String,
        maxlength: 500
    },
    cancelReason: {
        type: String,
        maxlength: 200
    },
    totalAmount: {
        type: Number,
        required: true,
        min: 0
    },
    discount: {
        type: Number,
        default: 0,
        min: 0
    },
    shippingFee: {
        type: Number,
        default: 0,
        min: 0
    },
    isDelivered: {
        type: Boolean,
        default: false
    },
    deliveredAt: {
        type: Date
    }
}, {
    timestamps: true
})

// Generate unique order number
orderSchema.pre('save', async function(next) {
    if (this.isNew && !this.orderNumber) {
        const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
        const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
        this.orderNumber = `ORD${date}${random}`
    }

    if (this.isModified('orderStatus') && this.orderStatus === 'delivered') {
        this.isDelivered = true
        if (!this.deliveredAt) {
            this.deliveredAt = new Date()
        }
    }

    if (this.isModified('paymentStatus') && this.paymentStatus === 'paid' && !this.paymentDetails.paidAt) {
        this.paymentDetails.paidAt = new Date()
    }

    next()
})

// Indexes

orderSchema.index({ orderStatus: 1 })
orderSchema.index({ paymentStatus: 1 })
orderSchema.index({ 'shippingAddress.postalCode': 1 })

// Virtual for order age
orderSchema.virtual('orderAge').get(function() {
    return Math.floor((Date.now() - this.createdAt) / (1000 * 60 * 60 * 24))
})

// Method to check if order can be cancelled
orderSchema.methods.canBeCancelled = function() {
    return ['processing', 'confirmed'].includes(this.orderStatus)
}

// Export enums for use in other files
export { PAYMENT_METHODS, PAYMENT_STATUS, ORDER_STATUS }
export const Order = mongoose.model('Order', orderSchema)