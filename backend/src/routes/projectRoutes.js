import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { authorizeWorkspaceRole } from "../middleware/workspaceRoleMiddleware.js";
import {
  createProject,
  getWorkspaceProjects,
  getProjectById,
  deleteProject,
  getProjectInsights,
} from "../controllers/projectController.js";

const router = express.Router();

router.get("/detail/:projectId", protect, getProjectById);

router.get("/insights/:projectId", protect, getProjectInsights);

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
