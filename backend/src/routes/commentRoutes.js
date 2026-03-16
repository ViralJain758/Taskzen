import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  addComment,
  getTaskComments,
  deleteComment,
} from "../controllers/commentController.js";

const router = express.Router();

router.post("/:taskId", protect, addComment);

router.get("/:taskId", protect, getTaskComments);

router.delete("/:commentId", protect, deleteComment);

export default router;
