import mongoose from "mongoose";
import { normalizeStringField } from "./normalization.js";

const activitySchema = new mongoose.Schema(
  {
    workspace: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: [true, "Workspace is required"],
      index: true,
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      index: true,
    },
    projectName: {
      type: String,
      trim: true,
      maxlength: [120, "Project name cannot exceed 120 characters"],
    },
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Actor is required"],
    },
    actorName: {
      type: String,
      required: [true, "Actor name is required"],
      trim: true,
      minlength: [1, "Actor name is required"],
      maxlength: [120, "Actor name cannot exceed 120 characters"],
    },
    message: {
      type: String,
      required: [true, "Activity message is required"],
      trim: true,
      minlength: [1, "Activity message is required"],
      maxlength: [1000, "Activity message cannot exceed 1000 characters"],
    },
    type: {
      type: String,
      enum: [
        "project_created",
        "project_deleted",
        "task_created",
        "task_deleted",
        "task_assigned",
        "task_status",
        "comment_added",
        "comment_deleted",
        "member_added",
        "member_removed",
        "member_role_updated",
      ],
      required: [true, "Activity type is required"],
    },
    task: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
    },
    taskTitle: {
      type: String,
      trim: true,
      maxlength: [200, "Task title cannot exceed 200 characters"],
    },
    fromStatus: {
      type: String,
      enum: ["todo", "in_progress", "completed"],
    },
    toStatus: {
      type: String,
      enum: ["todo", "in_progress", "completed"],
    },
    targetUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    targetUserName: {
      type: String,
      trim: true,
      maxlength: [120, "Target user name cannot exceed 120 characters"],
    },
  },
  {
    timestamps: true,
    strict: "throw",
  },
);

activitySchema.pre("validate", function normalizeActivityFields() {
  normalizeStringField(this, "projectName");
  normalizeStringField(this, "actorName");
  normalizeStringField(this, "message");
  normalizeStringField(this, "taskTitle");
  normalizeStringField(this, "targetUserName");
});

activitySchema.index({ workspace: 1, createdAt: -1 });
activitySchema.index({ project: 1, createdAt: -1 });

const Activity = mongoose.model("Activity", activitySchema);

export default Activity;
