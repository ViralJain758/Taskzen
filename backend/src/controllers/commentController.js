import Comment from "../models/Comment.js";

export const addComment = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({
        message: "Comment content is required",
      });
    }

    const comment = await Comment.create({
      content,
      task: taskId,
      author: req.user._id,
    });

    res.status(201).json({
      message: "Comment added successfully",
      comment,
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

    const comment = await Comment.findById(commentId);

    if (!comment) {
      return res.status(404).json({
        message: "Comment not found",
      });
    }

    await comment.deleteOne();

    res.json({
      message: "Comment deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};
