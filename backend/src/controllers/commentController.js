import Comment from "../models/Comment.js";
import Task from "../models/Task.js";
import Notification from "../models/Notification.js";
import Membership from "../models/Membership.js";

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

    const comment = await Comment.create({
      content: commentContent,
      task: taskId,
      author: req.user._id,
    });

    const populatedComment = await Comment.findById(comment._id).populate(
      "author",
      "name email",
    );

    req.io
      .to(`project:${task.project._id.toString()}`)
      .emit("project:comment_created", {
        projectId: task.project._id.toString(),
        taskId,
        comment: populatedComment,
      });

    if (task.createdBy.toString() !== req.user._id.toString()) {
      await Notification.create({
        user: task.createdBy,
        message: "New comment on your task",
        type: "comment",
      });

      req.io.to(task.createdBy.toString()).emit("notification", {
        message: "New comment on your task",
      });
    }

    res.status(201).json({
      message: "Comment added successfully",
      comment: populatedComment,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

export const getTaskComments = async (req, res) => {
  try {
    const { taskId } = req.params;

    const comments = await Comment.find({
      task: taskId,
    })
      .populate("author", "name email")
      .sort({ createdAt: -1 });

    res.json(comments);
  } catch (error) {
    res.status(500).json({
      message: error.message,
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
        select: "workspace",
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
      message: error.message,
    });
  }
};
