import Task from "../../models/Task.js";
import Membership from "../../models/Membership.js";
import Activity from "../../models/Activity.js";
import {
  INTERNAL_SERVER_ERROR,
  STATUS_LABELS,
  VALID_STATUSES,
} from "./constants.js";

export const updateTaskStatus = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { status } = req.body;

    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        message: "Invalid status value",
      });
    }

    const existingTask = await Task.findById(taskId).populate("project");

    if (!existingTask) {
      return res.status(404).json({
        message: "Task not found",
      });
    }

    const membership = await Membership.findOne({
      user: req.user._id,
      workspace: existingTask.project.workspace,
    });

    if (!membership) {
      return res.status(403).json({
        message: "You are not a member of this workspace",
      });
    }

    if (existingTask.status === status) {
      const unchangedTask = await Task.findById(taskId)
        .populate("project")
        .populate("assignee", "name email")
        .populate("createdBy", "name email");

      return res.json({
        message: "Task status unchanged",
        task: unchangedTask,
      });
    }

    const task = await Task.findByIdAndUpdate(taskId, { status }, { new: true })
      .populate("project")
      .populate("assignee", "name email")
      .populate("createdBy", "name email");

    if (!task) {
      return res.status(404).json({
        message: "Task not found",
      });
    }

    const projectId = task.project._id.toString();

    req.io.to(`project:${projectId}`).emit("project:task_updated", {
      projectId,
      task,
    });

    const actorName = req.user?.name || "Someone";
    const fromStatus = VALID_STATUSES.includes(existingTask.status)
      ? existingTask.status
      : undefined;

    try {
      const activity = await Activity.create({
        workspace: task.project.workspace,
        project: projectId,
        projectName: task.project.name,
        actor: req.user._id,
        actorName,
        message: `${actorName} moved task "${task.title}" to ${STATUS_LABELS[status] || status}`,
        type: "task_status",
        task: task._id,
        taskTitle: task.title,
        fromStatus,
        toStatus: status,
      });

      req.io.to(`project:${projectId}`).emit("project:activity_created", {
        projectId,
        activity,
      });

      req.io
        .to(`workspace:${task.project.workspace.toString()}`)
        .emit("workspace:activity_created", {
          workspaceId: task.project.workspace.toString(),
          activity,
        });
    } catch (activityError) {
      console.error(
        "Failed to create task status activity:",
        activityError?.message || activityError,
      );
    }

    res.json({
      message: "Task status updated",
      task,
    });
  } catch (error) {
    res.status(500).json({
      message: INTERNAL_SERVER_ERROR,
    });
  }
};
