import Task from "../models/Task.js";
import Project from "../models/Project.js";
import Notification from "../models/Notification.js";

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

    const task = await Task.create({
      title,
      description,
      priority,
      assignee,
      dueDate,
      project: projectId,
      createdBy: req.user._id,
    });

    req.io.to(project.workspace.toString()).emit("taskCreated", task);

    if (assignee) {
      await Notification.create({
        user: assignee,
        message: "You were assigned a task",
        type: "task",
      });

      req.io.to(assignee.toString()).emit("notification", {
        message: "You were assigned a task",
      });
    }

    res.status(201).json({
      message: "Task created successfully",
      task,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

export const getProjectTasks = async (req, res) => {
  try {
    const { projectId } = req.params;

    const tasks = await Task.find({
      project: projectId,
    })
      .populate("assignee", "name email")
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 });

    res.json(tasks);
  } catch (error) {
    res.status(500).json({
      message: error.message,
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

    const task = await Task.findByIdAndUpdate(
      taskId,
      { status },
      { new: true },
    ).populate("project");

    if (!task) {
      return res.status(404).json({
        message: "Task not found",
      });
    }

    req.io.to(task.project.workspace.toString()).emit("taskUpdated", task);

    if (assignee) {
      await Notification.create({
        user: assignee,
        message: "You were assigned a task",
        type: "task",
      });

      req.io.to(assignee.toString()).emit("notification", {
        message: "You were assigned a task",
      });
    }

    res.json({
      message: "Task status updated",
      task,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

export const updateTask = async (req, res) => {
  try {
    const { taskId } = req.params;

    const updatedTask = await Task.findByIdAndUpdate(taskId, req.body, {
      new: true,
    });

    if (!updatedTask) {
      return res.status(404).json({
        message: "Task not found",
      });
    }

    res.json({
      message: "Task updated successfully",
      task: updatedTask,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
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

    await task.deleteOne();

    req.io.to(task.project.workspace.toString()).emit("taskUpdated", task);

    res.json({
      message: "Task deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};
