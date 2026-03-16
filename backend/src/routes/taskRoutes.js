import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { createTask } from "../controllers/taskController.js";

const router = express.Router();

router.post("/:projectId", protect, createTask);

export default router;
