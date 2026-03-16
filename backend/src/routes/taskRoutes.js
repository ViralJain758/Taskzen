import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  createTask,
  getProjectTasks,
  updateTaskStatus,
  updateTask,
} from "../controllers/taskController.js";

const router = express.Router();

router.post("/:projectId", protect, createTask);

router.get("/:projectId", protect, getProjectTasks);

router.patch("/:taskId/status", protect, updateTaskStatus);

router.patch("/:taskId", protect, updateTask);

export default router;
