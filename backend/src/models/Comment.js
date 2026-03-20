import mongoose from "mongoose";
import { normalizeStringField } from "./normalization.js";

const commentSchema = new mongoose.Schema(
  {
    content: {
      type: String,
      required: [true, "Comment content is required"],
      trim: true,
      minlength: [1, "Comment content is required"],
      maxlength: [2000, "Comment cannot exceed 2000 characters"],
    },

    task: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
      required: [true, "Task is required"],
    },

    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Comment author is required"],
    },
  },
  {
    timestamps: true,
    strict: "throw",
  },
);

commentSchema.pre("validate", function normalizeCommentFields() {
  normalizeStringField(this, "content");
});

const Comment = mongoose.model("Comment", commentSchema);

export default Comment;
