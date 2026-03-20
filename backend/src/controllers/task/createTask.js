import Task from "../../models/Task.js";
import Project from "../../models/Project.js";
import Notification from "../../models/Notification.js";
import Membership from "../../models/Membership.js";
import Activity from "../../models/Activity.js";
import { INTERNAL_SERVER_ERROR } from "./constants.js";

export const createTask = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { title, description, priority, assignee, dueDate } = req.body;

    if (!title) {
      return res.status(400).json({
        message: "Task title is required",
      });
    }

    const project = await Project.findById(projectId);

    if (!project) {
      return res.status(404).json({
        message: "Project not found",
      });
    }

    const membership = await Membership.findOne({
      user: req.user._id,
      workspace: project.workspace,
    });

    if (!membership) {
      return res.status(403).json({
        message: "You are not a member of this workspace",
      });
    }

    if (assignee) {
      const assigneeMembership = await Membership.findOne({
        user: assignee,
        workspace: project.workspace,
      });

      if (!assigneeMembership) {
        return res.status(400).json({
          message: "Assignee must be a member of this workspace",
        });
      }
    }

    const task = await Task.create({
      title,
      description,
      priority,
      assignee,
      dueDate,
      project: projectId,
      createdBy: req.user._id,
    });

    const populatedTask = await Task.findById(task._id)
      .populate("assignee", "name email")
      .populate("createdBy", "name email");

    req.io.to(`project:${projectId}`).emit("project:task_created", {
      projectId,
      task: populatedTask,
    });

    const actorName = req.user?.name || "Someone";
    const createdActivity = await Activity.create({
      workspace: project.workspace,
      project: project._id,
      projectName: project.name,
      actor: req.user._id,
      actorName,
      message: `${actorName} created task "${task.title}"`,
      type: "task_created",
      task: task._id,
      taskTitle: task.title,
    });

    req.io
      .to(`workspace:${project.workspace.toString()}`)
      .emit("workspace:activity_created", {
        workspaceId: project.workspace.toString(),
        activity: createdActivity,
      });

    if (assignee) {
      await Notification.create({
        user: assignee,
        message: "You were assigned a task",
        type: "task",
      });

      const assigneeName = populatedTask.assignee?.name || "a member";
      const assignedActivity = await Activity.create({
        workspace: project.workspace,
        project: project._id,
        projectName: project.name,
        actor: req.user._id,
        actorName,
        message: `${actorName} assigned task "${task.title}" to ${assigneeName}`,
        type: "task_assigned",
        task: task._id,
        taskTitle: task.title,
        targetUser: assignee,
        targetUserName: assigneeName,
      });

      req.io
        .to(`workspace:${project.workspace.toString()}`)
        .emit("workspace:activity_created", {
          workspaceId: project.workspace.toString(),
          activity: assignedActivity,
        });

      req.io.to(assignee.toString()).emit("notification", {
        message: "You were assigned a task",
      });
    }

    res.status(201).json({
      message: "Task created successfully",
      task: populatedTask,
    });
  } catch (error) {
    res.status(500).json({
      message: INTERNAL_SERVER_ERROR,
    });
  }
};
