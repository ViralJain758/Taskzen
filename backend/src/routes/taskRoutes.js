import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  createTask,
  getProjectTasks,
  getProjectAssignees,
  updateTaskStatus,
  updateTask,
  deleteTask,
} from "../controllers/taskController.js";

const router = express.Router();

router.post("/:projectId", protect, createTask);

router.get("/:projectId", protect, getProjectTasks);

router.get("/:projectId/assignees", protect, getProjectAssignees);

router.patch("/:taskId/status", protect, updateTaskStatus);

router.patch("/:taskId", protect, updateTask);

router.delete("/:taskId", protect, deleteTask);

export default router;
