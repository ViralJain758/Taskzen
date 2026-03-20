import Task from "../../models/Task.js";
import Membership from "../../models/Membership.js";
import Activity from "../../models/Activity.js";
import { INTERNAL_SERVER_ERROR } from "./constants.js";

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
