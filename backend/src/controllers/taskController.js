import Task from "../models/Task.js";
import Project from "../models/Project.js";
import Notification from "../models/Notification.js";
import Membership from "../models/Membership.js";
import Activity from "../models/Activity.js";

const INTERNAL_SERVER_ERROR = "Internal server error";

const statusLabels = {
  todo: "To Do",
  in_progress: "In Progress",
  completed: "Done",
};

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

export const getProjectTasks = async (req, res) => {
  try {
    const { projectId } = req.params;

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

    const tasks = await Task.find({
      project: projectId,
    })
      .populate("assignee", "name email")
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 });

    res.json(tasks);
  } catch (error) {
    res.status(500).json({
      message: INTERNAL_SERVER_ERROR,
    });
  }
};

export const getProjectAssignees = async (req, res) => {
  try {
    const { projectId } = req.params;

    const project = await Project.findById(projectId);

    if (!project) {
      return res.status(404).json({
        message: "Project not found",
      });
    }

    const userMembership = await Membership.findOne({
      user: req.user._id,
      workspace: project.workspace,
    });

    if (!userMembership) {
      return res.status(403).json({
        message: "You are not a member of this workspace",
      });
    }

    const memberships = await Membership.find({
      workspace: project.workspace,
    }).populate("user", "name email");

    const assignees = memberships
      .filter((membership) => membership.user)
      .map((membership) => ({
        _id: membership.user._id,
        name: membership.user.name,
        email: membership.user.email,
        role: membership.role,
      }));

    res.json(assignees);
  } catch (error) {
    res.status(500).json({
      message: INTERNAL_SERVER_ERROR,
    });
  }
};

export const updateTaskStatus = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { status } = req.body;

    const validStatuses = ["todo", "in_progress", "completed"];

    if (!validStatuses.includes(status)) {
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
    const fromStatus = validStatuses.includes(existingTask.status)
      ? existingTask.status
      : undefined;

    try {
      const activity = await Activity.create({
        workspace: task.project.workspace,
        project: projectId,
        projectName: task.project.name,
        actor: req.user._id,
        actorName,
        message: `${actorName} moved task \"${task.title}\" to ${statusLabels[status] || status}`,
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
      // Activity logging should not block a successful status update.
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

    // Get the original task to check if assignee is being changed
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

    // Create notification if assignee changed
    if (isAssigneeChanging && updates.assignee) {
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

export const deleteTask = async (req, res) => {
  try {
    const { taskId } = req.params;

    const task = await Task.findById(taskId).populate("project");

    if (!task) {
      return res.status(404).json({
        message: "Task not found",
      });
    }

    const membership = await Membership.findOne({
      user: req.user._id,
      workspace: task.project.workspace,
    });

    if (!membership) {
      return res.status(403).json({
        message: "You are not a member of this workspace",
      });
    }

    const projectId = task.project._id.toString();

    const actorName = req.user?.name || "Someone";
    const activity = await Activity.create({
      workspace: task.project.workspace,
      project: task.project._id,
      projectName: task.project.name,
      actor: req.user._id,
      actorName,
      message: `${actorName} deleted task "${task.title}"`,
      type: "task_deleted",
      task: task._id,
      taskTitle: task.title,
    });

    await task.deleteOne();

    req.io.to(`project:${projectId}`).emit("project:task_deleted", {
      projectId,
      taskId: task._id.toString(),
    });

    req.io
      .to(`workspace:${task.project.workspace.toString()}`)
      .emit("workspace:activity_created", {
        workspaceId: task.project.workspace.toString(),
        activity,
      });

    res.json({
      message: "Task deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: INTERNAL_SERVER_ERROR,
    });
  }
};
