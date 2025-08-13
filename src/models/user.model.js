import mongoose,{Schema} from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";








const UserSchema = new Schema(
    {
        username: {
            type: String,
            required: true,
            unique: true,
            trim: true
        },
        email: {
            type: String,
            required: true,
            trim: true,
            lowercase: true,
        },
        password: {
            type: String,
            required: true
        },
        fullName: {
            type: String,
            required: true,
            trim: true
        },
        refreshToken: {
            type: String,
            select: false
        },
    },

    {
        timestamps: true,
        toJSON: {
            transform: function (doc, ret) {
                // Remove sensitive fields from the response
                delete ret.password;
                delete ret.refreshToken;
                return ret;
            }
        },
    }


);




UserSchema.pre("save", async function (next) {
    if (this.isModified("password")) {
        this.password = await bcrypt.hash(this.password, 10);
    }
    next();
});


UserSchema.methods.isPasswordCorrect = async function(password){
    return await bcrypt.compare(password, this.password)
}


UserSchema.methods.generateAccessToken = function(){
    return jwt.sign(
        {
            _id: this._id,
            email: this.email,
            username: this.username
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY
        }
    )
}
UserSchema.methods.generateRefreshToken = function(){
    return jwt.sign(
        {
            _id: this._id,

        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY
        }
    )
}

UserSchema.statics.findByRefreshToken = async function (token) {
    const user = await this.findOne({ refreshToken: token }).select("+refreshToken");
    if (!user) {
        throw new Error("Invalid refresh token");
    }
    return user;
}

UserSchema.methods.clearRefreshToken = async function () {
    this.refreshToken = null;
    await this.save(); // 🔁 Save the cleared token in DB
}

UserSchema.statics.findByCredentials = async function (email, password) {
    const user = await this.findOne({ email }).select("+password");
    if (!user) {
        throw new Error("Invalid email or password");
    }

    const isMatch = await user.isPasswordCorrect(password);
    if (!isMatch) {
        throw new Error("Invalid email or password");
    }

    return user;
}


const User = mongoose.model("User", UserSchema);
export { User};

