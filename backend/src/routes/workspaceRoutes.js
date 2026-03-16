import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { createWorkspace } from "../controllers/workspaceController.js";

const router = express.Router();

router.post("/", protect, createWorkspace);

export default router;
