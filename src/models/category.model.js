
import mongoose, {Schema} from "mongoose";


const categorySchema =  new Schema({

    name: {
        type: String,
        required: true,
        trim: true,
        unique: true
    },
    slug: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    description: {
        type: String,
        default: "",
        trim: true
    },
}, {
    timestamps: true
})

export const Category = mongoose.model("Category", categorySchema);