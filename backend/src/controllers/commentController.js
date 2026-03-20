import Comment from "../models/Comment.js";
import Task from "../models/Task.js";
import Notification from "../models/Notification.js";
import Membership from "../models/Membership.js";
import Activity from "../models/Activity.js";

export const addComment = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { content } = req.body;
    const commentContent = content?.trim();

    if (!commentContent) {
      return res.status(400).json({
        message: "Comment content is required",
      });
    }

    const task = await Task.findById(taskId).populate("project");

    if (!task) {
      return res.status(404).json({
        message: "Task not found",
      });
    }

    if (!task.project) {
      return res.status(404).json({
        message: "Project not found for this task",
      });
    }

    if (!task.project.workspace) {
      return res.status(409).json({
        message: "Task project is missing workspace metadata",
      });
    }

    const projectId = task.project._id?.toString();
    const workspaceId = task.project.workspace?.toString();

    if (!projectId || !workspaceId) {
      return res.status(409).json({
        message: "Task project metadata is invalid",
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

    const comment = await Comment.create({
      content: commentContent,
      task: taskId,
      author: req.user._id,
    });

    const populatedComment = await Comment.findById(comment._id).populate(
      "author",
      "name email",
    );

    req.io?.to(`project:${projectId}`).emit("project:comment_created", {
      projectId,
      taskId,
      comment: populatedComment,
    });

    const actorName = req.user?.name || "Someone";

    try {
      const activity = await Activity.create({
        workspace: task.project.workspace,
        project: task.project._id,
        projectName: task.project.name,
        actor: req.user._id,
        actorName,
        message: `${actorName} commented on task "${task.title}"`,
        type: "comment_added",
        task: task._id,
        taskTitle: task.title,
      });

      req.io
        ?.to(`workspace:${workspaceId}`)
        .emit("workspace:activity_created", {
          workspaceId,
          activity,
        });
    } catch (activityError) {
      console.error(
        "Failed to create comment activity:",
        activityError?.message || activityError,
      );
    }

    const createdById = task.createdBy?.toString();
    if (createdById && createdById !== req.user._id.toString()) {
      try {
        await Notification.create({
          user: task.createdBy,
          message: "New comment on your task",
          type: "comment",
        });

        req.io?.to(createdById).emit("notification", {
          message: "New comment on your task",
        });
      } catch (notificationError) {
        console.error(
          "Failed to create comment notification:",
          notificationError?.message || notificationError,
        );
      }
    }

    res.status(201).json({
      message: "Comment added successfully",
      comment: populatedComment,
    });
  } catch (error) {
    console.error("Failed to add comment:", error?.message || error);
    res.status(500).json({
      message: "Internal server error",
    });
  }
};

export const getTaskComments = async (req, res) => {
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

    const comments = await Comment.find({
      task: taskId,
    })
      .populate("author", "name email")
      .sort({ createdAt: -1 });

    res.json(comments);
  } catch (error) {
    res.status(500).json({
      message: "Internal server error",
    });
  }
};

export const deleteComment = async (req, res) => {
  try {
    const { commentId } = req.params;

    const comment = await Comment.findById(commentId).populate({
      path: "task",
      populate: {
        path: "project",
        select: "workspace name",
      },
    });

    if (!comment) {
      return res.status(404).json({
        message: "Comment not found",
      });
    }

    const isAuthor = comment.author.toString() === req.user._id.toString();

    if (!isAuthor) {
      const membership = await Membership.findOne({
        workspace: comment.task.project.workspace,
        user: req.user._id,
      });

      if (!membership || !["owner", "admin"].includes(membership.role)) {
        return res.status(403).json({
          message: "You do not have permission to delete this comment",
        });
      }
    }

    await comment.deleteOne();

    const actorName = req.user?.name || "Someone";
    const projectName = comment.task.project.name || "Project";
    const activity = await Activity.create({
      workspace: comment.task.project.workspace,
      project: comment.task.project._id,
      projectName,
      actor: req.user._id,
      actorName,
      message: `${actorName} deleted a comment on a task`,
      type: "comment_deleted",
      task: comment.task._id,
      taskTitle: comment.task.title,
    });

    req.io
      .to(`workspace:${comment.task.project.workspace.toString()}`)
      .emit("workspace:activity_created", {
        workspaceId: comment.task.project.workspace.toString(),
        activity,
      });

    req.io
      .to(`project:${comment.task.project._id.toString()}`)
      .emit("project:comment_deleted", {
        projectId: comment.task.project._id.toString(),
        taskId: comment.task._id.toString(),
        commentId,
      });

    res.json({
      message: "Comment deleted successfully",
      commentId,
    });
  } catch (error) {
    res.status(500).json({
      message: "Internal server error",
    });
  }
};
