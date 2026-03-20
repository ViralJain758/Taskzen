import Task from "../../models/Task.js";
import Notification from "../../models/Notification.js";
import Membership from "../../models/Membership.js";
import Activity from "../../models/Activity.js";
import { INTERNAL_SERVER_ERROR } from "./constants.js";

export const updateTask = async (req, res) => {
  try {
    const { taskId } = req.params;

    const allowedFields = [
      "title",
      "description",
      "priority",
      "assignee",
      "dueDate",
    ];
    const updates = {};

    allowedFields.forEach((field) => {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        updates[field] = req.body[field];
      }
    });

    if (Object.prototype.hasOwnProperty.call(updates, "assignee")) {
      updates.assignee = updates.assignee || null;
    }

    const originalTask = await Task.findById(taskId).populate("project");

    if (!originalTask) {
      return res.status(404).json({
        message: "Task not found",
      });
    }

    const membership = await Membership.findOne({
      user: req.user._id,
      workspace: originalTask.project.workspace,
    });

    if (!membership) {
      return res.status(403).json({
        message: "You are not a member of this workspace",
      });
    }

    if (updates.assignee) {
      const assigneeMembership = await Membership.findOne({
        user: updates.assignee,
        workspace: originalTask.project.workspace,
      });

      if (!assigneeMembership) {
        return res.status(400).json({
          message: "Assignee must be a member of this workspace",
        });
      }
    }

    const isAssigneeChanging =
      updates.assignee &&
      originalTask.assignee?.toString() !== updates.assignee;

    const updatedTask = await Task.findByIdAndUpdate(taskId, updates, {
      new: true,
    })
      .populate("project")
      .populate("assignee", "name email")
      .populate("createdBy", "name email");

    if (!updatedTask) {
      return res.status(404).json({
        message: "Task not found",
      });
    }

    const projectId = updatedTask.project._id.toString();

    req.io.to(`project:${projectId}`).emit("project:task_updated", {
      projectId,
      task: updatedTask,
    });

    if (isAssigneeChanging && updates.assignee) {
      try {
        await Notification.create({
          user: updates.assignee,
          message: "You were assigned a task",
          type: "task",
        });

        const actorName = req.user?.name || "Someone";
        const assigneeName = updatedTask.assignee?.name || "a member";
        const activity = await Activity.create({
          workspace: updatedTask.project.workspace,
          project: updatedTask.project._id,
          projectName: updatedTask.project.name,
          actor: req.user._id,
          actorName,
          message: `${actorName} assigned task "${updatedTask.title}" to ${assigneeName}`,
          type: "task_assigned",
          task: updatedTask._id,
          taskTitle: updatedTask.title,
          targetUser: updates.assignee,
          targetUserName: assigneeName,
        });

        req.io
          .to(`workspace:${updatedTask.project.workspace.toString()}`)
          .emit("workspace:activity_created", {
            workspaceId: updatedTask.project.workspace.toString(),
            activity,
          });

        req.io.to(updates.assignee.toString()).emit("notification", {
          message: "You were assigned a task",
        });
      } catch (assigneeSideEffectError) {
        console.error(
          "Failed to create assignee side effects:",
          assigneeSideEffectError?.message || assigneeSideEffectError,
        );
      }
    }

    res.json({
      message: "Task updated successfully",
      task: updatedTask,
    });
  } catch (error) {
    res.status(500).json({
      message: INTERNAL_SERVER_ERROR,
    });
  }
};
