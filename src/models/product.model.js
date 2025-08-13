import mongoose from "mongoose";
import generateRandomSKU from "../utils/generateRandomSKU.js";



const PRODUCT_STATUS = {
    ACTIVE: "ACTIVE",
    DRAFT: "DRAFT",
    OUT_OF_STOCK: "OUT_OF_STOCK",
    DISCONTINUED: "DISCONTINUED"
};


const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        default: "",
        trim: true,
        maxLength: 1000,
    },
    slug: {
        type: String,
        required: true,
        unique: true,
        index: true,
    },
    purchasePrice: {
        type: Number,
        required: true,
    },
    sellingPrice: {
        type: Number,
    },
    stock: {
        type: Number,
        default: 0,
        min: 0
    },
    lowStockThreshold: {
        type: Number,
        default: 10,
        min: 0
    },
    status: {
        type: String,
        enum: Object.values(PRODUCT_STATUS),
        default: PRODUCT_STATUS.DRAFT
    },
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Category",
        required: true,
        index: true,
    },
    image: {
        type: String,
        default: null
    },
    sku: {
        type: String,
        unique: true,
        sparse: true,
        default: null
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    isDeleted: {
        type: Boolean,
        default: false
    },
    isFeatured: {
        type: Boolean,
        default: false
    },
},
    {
        timestamps: true
    }
);


productSchema.virtual("isInStock").get(function (){
    return this.stock > 0 && this.status !== PRODUCT_STATUS.OUT_OF_STOCK;
})
productSchema.virtual("isLowStock").get(function (){
    return this.stock <= this.lowStockThreshold && this.stock > 0 ;
})
productSchema.virtual("stockStatus").get(function () {
    if (this.stock <= this.lowStockThreshold) return "low-stock";
    if(this.stock === 0 || this.status === PRODUCT_STATUS.OUT_OF_STOCK) return "out-of-stock";
    return "in-stock";
})
productSchema.virtual("profitMargin").get(function () {
    if(this.purchasePrice && this.sellingPrice){
        return ((this.sellingPrice - this.purchasePrice) / this.purchasePrice) * 100;
    }
    return null;
})
productSchema.virtual("formattedPrice").get(function () {
    return `₹${this.sellingPrice.toFixed(2)}`;
});
productSchema.virtual("statusBadgeColor").get(function () {
    const map = {
        ACTIVE: "green",
        DRAFT: "gray",
        OUT_OF_STOCK: "orange",
        DISCONTINUED: "red"
    };
    return map[this.status] || "gray";
});
productSchema.set("toObject", { virtuals: true });
productSchema.set("toJSON", { virtuals: true });


//pre-save hook
productSchema.pre("save", function (next) {
    if(this.isModified("name")){
        this.slug = this.name.toLowerCase().replace(/ /g, "-");
    }
    if(this.isModified("sellingPrice")) this.sellingPrice = Math.round(this.sellingPrice * 100) / 100;
    if(this.isModified("purchasePrice")) this.purchasePrice = Math.round(this.purchasePrice * 100) / 100;
    if(this.isModified("stock")){
        if(this.stock === 0 && this.status === PRODUCT_STATUS.ACTIVE){
            this.status = PRODUCT_STATUS.OUT_OF_STOCK;
        }
        if(this.stock > 0 && this.status === PRODUCT_STATUS.OUT_OF_STOCK){
            this.status = PRODUCT_STATUS.ACTIVE;
        }
    }
    next();
})

productSchema.pre("save", async function (next) {
    if (this.sku) return next(); // Skip if already set manually

    let newSKU;
    let exists = true;

    // Keep generating until we find a unique SKU
    while (exists) {
        newSKU = generateRandomSKU(); // e.g. PRD-12345
        const found = await mongoose.models.Product.findOne({ sku: newSKU });
        exists = !!found;
    }

    this.sku = newSKU.toUpperCase(); // Set the unique SKU
    next();
});

productSchema.methods.getFormattedPrice = function () {
    return `₹${this.sellingPrice.toFixed(2)}`;
}
productSchema.methods.getFormattedPurchasePrice = function () {
    return `₹${this.purchasePrice.toFixed(2)}`;
}
productSchema.methods.getDiscountPrice = function (persent) {
    if (this.sellingPrice) {
        const discount = (this.sellingPrice * percent) / 100;
        this.sellingPrice = Math.max(0, this.sellingPrice - discount);
        return this.sellingPrice;
    }
}
productSchema.methods.removeDiscountPrice = function (){
    if(this.purchasePrice){
        this.sellingPrice = this.purchasePrice;
        this.purchasePrice = undefined;
    }
    return this.sellingPrice;
}
productSchema.methods.getProfitMargin = function () {
    if(this.purchasePrice && this.sellingPrice){
        return ((this.sellingPrice - this.purchasePrice) / this.purchasePrice) * 100;
    }
    return null;
}
productSchema.methods.updateStock = function (quantity,op="set") {
    switch (op){
        case "add":
            this.stock += quantity;
            break;
        case "subtract":
            this.stock = Math.max(0,this.stock - quantity);
            break;
        default:
            this.stock = Math.max(0,quantity);
            break;
    }
    return this.stock;
}
productSchema.methods.softDelete = function () {
    this.isDeleted = true;
    this.status = PRODUCT_STATUS.DISCONTINUED; // Set status to DRAFT on delete
    return this.save();
}
productSchema.methods.restore = function () {
    this.isDeleted = false;
    this.status = this.stock > 0 ? PRODUCT_STATUS.ACTIVE : PRODUCT_STATUS.OUT_OF_STOCK;
    return this.save();
}

productSchema.methods.getStatusBadgeColor = function () {
    const map = {
        ACTIVE: "green",
        DRAFT: "gray",
        OUT_OF_STOCK: "orange",
        DISCONTINUED: "red"
    };
    return map[this.status] || "gray";
}



productSchema.statics.getProductsByCategory = async function (category, status, limit, skip) {
    const query = { category, status };
    if (limit) query.limit = limit;
    if (skip) query.skip = skip;
    return await this.find(query).populate("createdBy");
}
productSchema.statics.findBySlug = function (){
    return this.findOne({slug,isDeleted:false});
}
productSchema.statics.findBySKU = function () {
    return this.findOne({sku:sku.toUpperCase(),isDeleted:false});
}
productSchema.statics.bulkUpdateStock = function (items){
    const ops = items.map(item => ({
            updateOne:{
                filter: {_id:item._id,isDeleted:false},
                update:{$inc:{stock:-item.quantity},$set:{"updatedAt":new Date()}}
            }
        }));
    return this.bulkWrite(ops);
}
productSchema.statics.findActiveProducts = function (filters = {}) {
    return this.find({ ...filters, status: PRODUCT_STATUS.ACTIVE, isDeleted: false });
};

productSchema.statics.findLowStockProducts = function () {
    return this.find({
        isDeleted: false,
        status: PRODUCT_STATUS.ACTIVE,
        $expr: { $lte: ["$stock", "$lowStockThreshold"] }
    });
};

productSchema.statics.findFeaturedProducts = function (limit = 10) {
    return this.find({
        isFeatured: true,
        status: PRODUCT_STATUS.ACTIVE,
        isDeleted: false
    }).sort({ createdAt: -1 }).limit(limit);
};


productSchema.pre(/^find/, function (next) {
    if (!this.getQuery().isDeleted) {
        this.where({ isDeleted: { $ne: true } });
    }
    next();
});


const Product = mongoose.model("Product", productSchema);
export { Product, PRODUCT_STATUS };
