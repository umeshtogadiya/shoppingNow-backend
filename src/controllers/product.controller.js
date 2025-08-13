import {asyncHandler} from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js";
import {Product} from "../models/product.model.js";
import {ApiResponse} from "../utils/ApiResponse.js";
import slugify from "slugify";
import {uploadOnCloudinary} from "../utils/cloudinary.js";
import {Category} from "../models/category.model.js";

const createProduct = asyncHandler( async (req, res) =>{
    const { name, description, purchasePrice, sellingPrice, stock, category } = req.body;

    // // Debug logs add karo
    // console.log("Received data:", {
    //     name, description, purchasePrice, sellingPrice, stock, category
    // });
    // console.log("User data:", req.user);
    // // Category existence check karo
    // const categoryExists = await Category.findById(category);
    // if (!categoryExists) {
    //     throw new ApiError(400, "Invalid category ID provided");
    // }


    if (!name?.trim()){
        throw new ApiError(400, "All fields are required")
    }
    if(purchasePrice == null || stock == null || !category){
        throw new ApiError(400, "All fields are required")
    }
    if(purchasePrice < 0 || sellingPrice < 0 || stock < 0){
        throw new ApiError(400, "All fields must be greater than 0")
    }
    if(sellingPrice < purchasePrice)
    {
        throw new ApiError(400, "Selling price cannot be less than purchase price")
    }
    let imageLocalPath;
    if (req.file) { // If using upload.single('image')
        imageLocalPath = req.file.path;
    } else if (req.files && req.files.image) { // If using upload.fields()
        imageLocalPath = req.files.image[0].path;
    }

    if (!imageLocalPath) {
        throw new ApiError(400, "Image is required")
    }

    const image = await uploadOnCloudinary(imageLocalPath);
    if (!image) {
        throw new ApiError(400, "Error while uploading image")
    }

    const slug = slugify(name,{ lower: true, strict: true });
    const product = await Product.create({
        name,
        slug,
        description,
        purchasePrice,
        sellingPrice,
        stock,
        category,
        image: image?.secure_url || null,
        lowStockThreshold: 10,
        createdBy: req.user?._id,
    })

    if (!product){
        throw new ApiError(500, "Something went wrong while creating the product")
    }

    return res.status(201).json(
        new ApiResponse(201, product, "Product created Successfully")
    )
})

const getProductById = asyncHandler(async (req, res) => {
    const {id} = req.params;

    if (!id) {
        throw new ApiError(400, "Product ID is required")
    }

    const product = await Product.findById(id).populate("category", "name");

    if (!product) {
        throw new ApiError(404, "Product not found")
    }

    return res.status(200).json(
        new ApiResponse(200, product, "Product retrieved successfully")
    )
})

const getAllProducts = asyncHandler(async (req, res) => {
    const products = await Product.find()
        .populate("category", "name")
        .sort({ createdAt: -1 });

    return res.status(200).json(
        new ApiResponse(200, products, "Products retrieved successfully")
    );
});

const updateProduct = asyncHandler(async (req, res) => {
    const {id} = req.params;
    const {name, description, purchasePrice, sellingPrice, stock, category} = req.body;

    if (!id) {
        throw new ApiError(400, "Product ID is required")
    }

    if (!name?.trim()) {
        throw new ApiError(400, "Name is required")
    }
    if (purchasePrice == null || stock == null || !category) {
        throw new ApiError(400, "All fields are required")
    }
    if (purchasePrice < 0 || sellingPrice < 0 || stock < 0) {
        throw new ApiError(400, "All fields must be greater than 0")
    }
    if (sellingPrice < purchasePrice) {
        throw new ApiError(400, "Selling price cannot be less than purchase price")
    }

    const updateData = {
        name,
        slug: slugify(name, {lower: true, strict: true}),
        description,
        purchasePrice,
        sellingPrice,
        stock,
        category,
        lowStockThreshold: 10,
        createdBy: req.user._id,
    };
    console.log("File received:", req.file);
    const imageLocalPath = req.files?.image[0]?.path;
    if (imageLocalPath) {
        const image = await uploadOnCloudinary(imageLocalPath);
        updateData.image = image?.secure_url || null;
    }

    const updatedProduct = await Product.findByIdAndUpdate(
        id,
        updateData,
        {new: true}
    ).populate("category", "name");

    if (!updatedProduct) {
        throw new ApiError(404, "Product not found or could not be updated")
    }

    return res.status(200).json(
        new ApiResponse(200, updatedProduct, "Product updated successfully")
    )
})

const deleteProduct = asyncHandler(async (req, res) => {
    const {id} = req.params;

    if (!id) {
        throw new ApiError(400, "Product ID is required")
    }

    const deletedProduct = await Product.findByIdAndDelete(id);

    if (!deletedProduct) {
        throw new ApiError(404, "Product not found or could not be deleted")
    }

    return res.status(200).json(
        new ApiResponse(200, {}, "Product deleted successfully")
    )
})

const searchProducts = asyncHandler(async (req, res) => {
    const {query} = req.query;

    if (!query?.trim()) {
        throw new ApiError(400, "Search query is required")
    }

    const products = await Product.find({
        $or: [
            {name: {$regex: query, $options: 'i'}},
            {description: {$regex: query, $options: 'i'}}
        ]
    }).populate("category", "name").sort({ createdAt: -1 });

    if (!products || products.length === 0) {
        throw new ApiError(404, "No products found matching the search criteria")
    }

    return res.status(200).json(
        new ApiResponse(200, products, "Products retrieved successfully")
    )
})

const filterProducts = asyncHandler(async (req, res) => {
    const {category, minPrice, maxPrice, inStock} = req.query;

    const filters = {};

    if (category) {
        filters.category = category;
    }
    if (minPrice) {
        filters.sellingPrice = {$gte: parseFloat(minPrice)};
    }
    if (maxPrice) {
        filters.sellingPrice = {...filters.sellingPrice, $lte: parseFloat(maxPrice)};
    }
    if (inStock === 'true') {
        filters.stock = {$gt: 0};
    }

    const products = await Product.find(filters).populate("category", "name").sort({ createdAt: -1 });

    if (!products || products.length === 0) {
        throw new ApiError(404, "No products found matching the filter criteria")
    }

    return res.status(200).json(
        new ApiResponse(200, products, "Products retrieved successfully")
    )
})

const minStockProducts = asyncHandler(async (req, res) => {
    const {threshold} = req.query;

    if (!threshold) {
        throw new ApiError(400, "Threshold is required")
    }

    const products = await Product.find({
        stock: {$lt: parseInt(threshold)},
        isDeleted: false
    }).populate("category", "name").sort({ createdAt: -1 });

    if (!products || products.length === 0) {
        throw new ApiError(404, "No products found with stock below the specified threshold")
    }

    return res.status(200).json(
        new ApiResponse(200, products, "Products retrieved successfully")
    )
})

const getFeaturedProducts = asyncHandler(async (req, res) => {
    const products = await Product.find({ isFeatured: true, isDeleted: false })
        .populate("category", "name")
        .sort({ createdAt: -1 })
        .limit(10);

    if (!products || products.length === 0) {
        throw new ApiError(404, "No featured products found")
    }

    return res.status(200).json(
        new ApiResponse(200, products, "Featured products retrieved successfully")
    )
})

export {
    createProduct,
    getProductById,
    getAllProducts,
    updateProduct,
    deleteProduct,
    searchProducts,
    filterProducts,
    minStockProducts,
    getFeaturedProducts
}