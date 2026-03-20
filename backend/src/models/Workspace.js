import mongoose from "mongoose";
import { normalizeStringField } from "./normalization.js";

const workspaceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Workspace name is required"],
      trim: true,
      minlength: [1, "Workspace name is required"],
      maxlength: [80, "Workspace name cannot exceed 80 characters"],
    },

    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Workspace owner is required"],
    },
  },
  {
    timestamps: true,
    strict: "throw",
  },
);

workspaceSchema.pre("validate", function normalizeWorkspaceFields() {
  normalizeStringField(this, "name");
});

const Workspace = mongoose.model("Workspace", workspaceSchema);

export default Workspace;
