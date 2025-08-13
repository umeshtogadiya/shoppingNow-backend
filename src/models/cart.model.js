import mongoose from 'mongoose'

const cartItemSchema = new mongoose.Schema({
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    quantity: {
        type: Number,
        required: true,
        default: 1,
        min: 1
    },
    priceAtAddTime: {
        type: Number,
        required: true,
        min: 0
    }
}, { _id: false })

const cartSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    items: [cartItemSchema],
    totalPrice: {
        type: Number,
        default: 0,
        min: 0
    },
    totalItems: {
        type: Number,
        default: 0,
        min: 0
    }
}, {
    timestamps: true
})

cartSchema.pre('save', function(next) {
    this.totalPrice = this.items.reduce((total, item) => total + (item.quantity * item.priceAtAddTime), 0)
    this.totalItems = this.items.reduce((total, item) => total + item.quantity, 0)
    next()
})


export const Cart = mongoose.model('Cart', cartSchema)