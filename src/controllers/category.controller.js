import {Category} from "../models/category.model.js";
import {asyncHandler} from "../utils/asyncHandler.js";
import slugify from "slugify";
import {ApiResponse} from "../utils/ApiResponse.js";


const createCategory = asyncHandler(async (req, res) => {
    const{name, description} = req.body;
    if (!name){
        throw new Error("Name is required")
    }
    const slug = slugify(name,{ lower: true, strict: true });
    const category = await Category.create({
        name,
        slug,
        description
    });
    return res.status(201).json(
        new ApiResponse(201, category, "Category created Successfully")
    );

})

const getAllCategories = asyncHandler(async (req, res) => {  // asyncHandler add karo
    const categories = await Category.find().select("-__v");
    return res.status(200).json(
        new ApiResponse(200, { categories }, "Categories fetched successfully")
    );
});

const getCategoryById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const category = await Category.findById(id).select("-__v");
    if (!category) {
        throw new Error("Category not found");
    }
    return res.status(200).json(
        new ApiResponse(200, category, "Category fetched successfully")
    );
})

const updateCategory = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name, description } = req.body;

    if (!name) {
        throw new Error("Name is required");
    }

    const slug = slugify(name, { lower: true, strict: true });
    const updatedCategory = await Category.findByIdAndUpdate(
        id,
        { name, slug, description },
        { new: true }
    ).select("-__v");

    if (!updatedCategory) {
        throw new Error("Category not found");
    }

    return res.status(200).json(
        new ApiResponse(200, updatedCategory, "Category updated successfully")
    );
})

const deleteCategory = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const deletedCategory = await Category.findByIdAndDelete(id).select("-__v");

    if (!deletedCategory) {
        throw new Error("Category not found");
    }

    return res.status(200).json(
        new ApiResponse(200, {}, "Category deleted successfully")
    );
})

export {
    createCategory,
    getAllCategories,
    getCategoryById,
    updateCategory,
    deleteCategory
};