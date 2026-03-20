import mongoose from "mongoose";

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

const Comment = mongoose.model("Comment", commentSchema);

export default Comment;
