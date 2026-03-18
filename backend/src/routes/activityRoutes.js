import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  getProjectActivities,
  getWorkspaceActivities,
} from "../controllers/activityController.js";

const router = express.Router();

router.get("/workspace/:workspaceId", protect, getWorkspaceActivities);
router.get("/:projectId", protect, getProjectActivities);

export default router;
