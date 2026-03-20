import mongoose from "mongoose";
import { normalizeStringField } from "./normalization.js";

const projectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Project name is required"],
      trim: true,
      minlength: [1, "Project name is required"],
      maxlength: [120, "Project name cannot exceed 120 characters"],
    },

    description: {
      type: String,
      trim: true,
      maxlength: [2000, "Description cannot exceed 2000 characters"],
    },

    workspace: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: [true, "Workspace is required"],
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Project creator is required"],
    },
  },
  {
    timestamps: true,
    strict: "throw",
  },
);

projectSchema.pre("validate", function normalizeProjectFields(next) {
  normalizeStringField(this, "name");
  normalizeStringField(this, "description");
  next();
});

const Project = mongoose.model("Project", projectSchema);

export default Project;
