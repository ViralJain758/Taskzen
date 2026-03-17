import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { authorizeWorkspaceRole } from "../middleware/workspaceRoleMiddleware.js";
import {
  createProject,
  getWorkspaceProjects,
  deleteProject,
} from "../controllers/projectController.js";

const router = express.Router();

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
