import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { authorizeWorkspaceRole } from "../middleware/workspaceRoleMiddleware.js";
import {
  createWorkspace,
  getUserWorkspaces,
  inviteMember,
  getWorkspaceMembers,
  removeWorkspaceMember,
  updateWorkspaceMemberRole,
  leaveWorkspace,
  deleteWorkspace,
} from "../controllers/workspaceController.js";

const router = express.Router();

router.post("/", protect, createWorkspace);
router.get("/", protect, getUserWorkspaces);
router.delete(
  "/:workspaceId",
  protect,
  authorizeWorkspaceRole(["owner"]),
  deleteWorkspace,
);
router.post(
  "/:workspaceId/invite",
  protect,
  authorizeWorkspaceRole(["owner", "admin"]),
  inviteMember,
);
router.get(
  "/:workspaceId/members",
  protect,
  authorizeWorkspaceRole(["owner", "admin", "member"]),
  getWorkspaceMembers,
);
router.delete(
  "/:workspaceId/members/:memberId",
  protect,
  authorizeWorkspaceRole(["owner", "admin"]),
  removeWorkspaceMember,
);
router.patch(
  "/:workspaceId/members/:memberId/role",
  protect,
  authorizeWorkspaceRole(["owner", "admin"]),
  updateWorkspaceMemberRole,
);
router.delete(
  "/:workspaceId/leave",
  protect,
  authorizeWorkspaceRole(["admin", "member"]),
  leaveWorkspace,
);

export default router;
