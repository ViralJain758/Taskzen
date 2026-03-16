import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { authorizeWorkspaceRole } from "../middleware/workspaceRoleMiddleware.js";
import { createProject } from "../controllers/projectController.js";

const router = express.Router();

router.post(
  "/:workspaceId",
  protect,
  authorizeWorkspaceRole(["owner", "admin", "member"]),
  createProject,
);

export default router;
