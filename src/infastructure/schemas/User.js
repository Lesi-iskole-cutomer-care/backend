import mongoose from "mongoose";
const { Schema } = mongoose;

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    gender: { type: String, enum: ["male", "female"], required: true },
    phonenumber: { type: String, required: true, unique: true, trim: true },

    password: { type: String, required: true, select: false },

    role: { type: String, enum: ["agent", "admin"], default: "agent" },

    isVerified: { type: Boolean, default: false, index: true },
    otpStatus: {
      type: String,
      enum: ["none", "verified", "failed"],
      default: "none",
    },

    approvalStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
    },
  },
  { timestamps: true }
);

const User = mongoose.models.User || mongoose.model("User", userSchema);
export default User;