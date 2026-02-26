// models/UserModel.js
// User schema with secure defaults, embedded profiles, and virtual links to Instructor/Learner.

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const { Schema, model } = mongoose;

const UserSchema = new Schema(
    {
        // _id (ObjectId) is the primary key; virtual userId exposed below
        name: {
            type: String,
            trim: true,
            minlength: 1,
            maxlength: 200,
            required: [true, "Name is required"],
        },
        email: {
            type: String,
            trim: true,
            lowercase: true,
            unique: true,
            required: [true, "Email is required"],
            match: [
                /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                "Please provide a valid email address",
            ],
            index: true,
        },
        role: {
            type: String,
            enum: ["learner", "instructor"],
            default: "learner",
            index: true,
        },
        passwordHash: {
            type: String,
            required: [true, "Password hash is required"],
            select: false, // never return by default
        },
        dob: {
            type: Date,
            validate: {
                validator: (v) => {
                    if (!v) return true;
                    const now = new Date();
                    const min = new Date(
                        now.getFullYear() - 130,
                        now.getMonth(),
                        now.getDate(),
                    );
                    return v <= now && v >= min;
                },
                message: "Please provide a valid date of birth",
            },
        },
        gender: {
            type: String,
            enum: [
                "male",
                "female",
                "other"
            ],
            default: "male",
        },
    },
    {
        timestamps: true, // createdAt, updatedAt
        versionKey: false,
        toJSON: {
            virtuals: true,
            transform: (_doc, ret) => {
                delete ret.passwordHash;
                return ret;
            },
        },
        toObject: { virtuals: true },
    },
);
// Virtual alias for _id
UserSchema.virtual("userId").get(function () {
    return this._id;
});

/** Virtual populate to linked collections (one-to-one) */
UserSchema.virtual("instructor", {
    ref: "Instructor",
    localField: "_id",
    foreignField: "userId",
    justOne: true,
});

UserSchema.virtual("learner", {
    ref: "Learner",
    localField: "_id",
    foreignField: "userId",
    justOne: true,
});
/** Helper methods for password handling */
UserSchema.methods.setPassword = async function setPassword(
    plainPassword,
    saltRounds = 12,
) {
    if (typeof plainPassword !== "string" || plainPassword.length < 8) {
        throw new Error("Password must be at least 8 characters");
    }
    const salt = await bcrypt.genSalt(saltRounds);
    this.passwordHash = await bcrypt.hash(plainPassword, salt);
};

UserSchema.methods.validatePassword = async function validatePassword(
    plainPassword,
) {
    if (typeof plainPassword !== "string") return false;
    if (!this.passwordHash) {
        // Ensure you queried with .select('+passwordHash')
        throw new Error(
            'passwordHash not selected; use .select("+passwordHash")',
        );
    }
    return bcrypt.compare(plainPassword, this.passwordHash);
};

UserSchema.statics.findByEmail = function findByEmail(email) {
    return this.findOne({ email: (email || "").trim().toLowerCase() });
};

UserSchema.index({ role: 1, createdAt: -1 });

const User = mongoose.models.User || model("User", UserSchema);
module.exports = User;
