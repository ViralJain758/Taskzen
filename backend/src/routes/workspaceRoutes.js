import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  createWorkspace,
  getUserWorkspaces,
} from "../controllers/workspaceController.js";

const router = express.Router();

router.post("/", protect, createWorkspace);
router.get("/", protect, getUserWorkspaces);

export default router;
