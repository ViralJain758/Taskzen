import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { authorizeWorkspaceRole } from "../middleware/workspaceRoleMiddleware.js";
import { rateLimit } from "express-rate-limit";
import {
  createProject,
  getWorkspaceProjects,
  getProjectById,
  deleteProject,
  getProjectInsights,
} from "../controllers/projectController.js";

const router = express.Router();

const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, 
  max: 5, 
  message: { message: "Too many AI insight generation requests. Please try again in an hour." },
});

router.get("/detail/:projectId", protect, getProjectById);

router.get("/insights/:projectId", protect, aiLimiter, getProjectInsights);

router.post(
  "/:workspaceId",
  protect,
  authorizeWorkspaceRole(["owner", "admin", "member"]),
  createProject,
);

router.get(
  "/:workspaceId",
  protect,
  authorizeWorkspaceRole(["owner", "admin", "member"]),
  getWorkspaceProjects,
);

router.delete(
  "/:workspaceId/:projectId",
  protect,
  authorizeWorkspaceRole(["owner", "admin"]),
  deleteProject,
);

export default router;
