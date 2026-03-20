import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { validateRequest } from "../middleware/validationMiddleware.js";
import {
  getProjectActivities,
  getWorkspaceActivities,
} from "../controllers/activityController.js";
import {
  activityProjectSchema,
  activityWorkspaceSchema,
} from "../validation/schemas.js";

const router = express.Router();

router.get(
  "/workspace/:workspaceId",
  protect,
  validateRequest(activityWorkspaceSchema),
  getWorkspaceActivities,
);
router.get(
  "/:projectId",
  protect,
  validateRequest(activityProjectSchema),
  getProjectActivities,
);

export default router;
