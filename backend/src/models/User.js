import mongoose from "mongoose";
import { normalizeStringField } from "./normalization.js";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [80, "Name cannot exceed 80 characters"],
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      trim: true,
      lowercase: true,
      maxlength: [254, "Email cannot exceed 254 characters"],
      match: [EMAIL_REGEX, "Please provide a valid email address"],
    },

    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [8, "Password must be at least 8 characters"],
      maxlength: [128, "Password cannot exceed 128 characters"],
    },

    avatar: {
      type: String,
      trim: true,
      maxlength: [2048, "Avatar URL cannot exceed 2048 characters"],
      match: [/^https?:\/\//i, "Avatar must be a valid http(s) URL"],
    },
  },
  {
    timestamps: true,
    strict: "throw",
  },
);

userSchema.index({ email: 1 }, { unique: true });

userSchema.pre("validate", function normalizeUserFields() {
  normalizeStringField(this, "name");

  if (typeof this.email === "string") {
    this.email = this.email.trim().toLowerCase();
  }

  normalizeStringField(this, "avatar");
});

const User = mongoose.model("User", userSchema);

export default User;
