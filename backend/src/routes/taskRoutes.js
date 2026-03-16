import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { createTask, getProjectTasks } from "../controllers/taskController.js";

const router = express.Router();

router.post("/:projectId", protect, createTask);
router.get("/:projectId", protect, getProjectTasks);

export default router;
