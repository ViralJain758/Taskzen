import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Notification user is required"],
    },

    message: {
      type: String,
      required: [true, "Notification message is required"],
      trim: true,
      minlength: [1, "Notification message is required"],
      maxlength: [500, "Notification message cannot exceed 500 characters"],
    },

    type: {
      type: String,
      enum: ["task", "comment", "workspace"],
      required: [true, "Notification type is required"],
    },

    isRead: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    strict: "throw",
  },
);

const Notification = mongoose.model("Notification", notificationSchema);

export default Notification;
