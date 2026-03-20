import mongoose from "mongoose";

const membershipSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User is required"],
    },

    workspace: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: [true, "Workspace is required"],
    },

    role: {
      type: String,
      enum: ["owner", "admin", "member"],
      default: "member",
    },
  },
  {
    timestamps: true,
    strict: "throw",
  },
);

membershipSchema.index({ user: 1, workspace: 1 }, { unique: true });

const Membership = mongoose.model("Membership", membershipSchema);

export default Membership;
