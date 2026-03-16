import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { authorizeWorkspaceRole } from "../middleware/workspaceRoleMiddleware.js";
import {
  createWorkspace,
  getUserWorkspaces,
  inviteMember,
} from "../controllers/workspaceController.js";

const router = express.Router();

router.post("/", protect, createWorkspace);
router.get("/", protect, getUserWorkspaces);
router.post(
  "/:workspaceId/invite",
  protect,
  authorizeWorkspaceRole(["owner", "admin"]),
  inviteMember,
);

export default router;
