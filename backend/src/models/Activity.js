import mongoose from "mongoose";

const activitySchema = new mongoose.Schema(
  {
    workspace: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
      index: true,
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      index: true,
    },
    projectName: {
      type: String,
    },
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    actorName: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
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
      required: true,
    },
    task: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
    },
    taskTitle: {
      type: String,
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
    },
  },
  {
    timestamps: true,
  },
);

activitySchema.index({ workspace: 1, createdAt: -1 });
activitySchema.index({ project: 1, createdAt: -1 });

const Activity = mongoose.model("Activity", activitySchema);

export default Activity;
