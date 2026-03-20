import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { authorizeWorkspaceRole } from "../middleware/workspaceRoleMiddleware.js";
import { validateRequest } from "../middleware/validationMiddleware.js";
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
import {
  workspaceCreateSchema,
  workspaceIdParamsSchema,
  workspaceInviteSchema,
  workspaceMembersQuerySchema,
  workspaceMemberParamsSchema,
  workspaceMemberRoleSchema,
} from "../validation/schemas.js";

const router = express.Router();

router.post(
  "/",
  protect,
  validateRequest(workspaceCreateSchema),
  createWorkspace,
);
router.get("/", protect, getUserWorkspaces);
router.delete(
  "/:workspaceId",
  protect,
  validateRequest(workspaceIdParamsSchema),
  authorizeWorkspaceRole(["owner"]),
  deleteWorkspace,
);
router.post(
  "/:workspaceId/invite",
  protect,
  validateRequest(workspaceInviteSchema),
  authorizeWorkspaceRole(["owner", "admin"]),
  inviteMember,
);
router.get(
  "/:workspaceId/members",
  protect,
  validateRequest(workspaceMembersQuerySchema),
  authorizeWorkspaceRole(["owner", "admin", "member"]),
  getWorkspaceMembers,
);
router.delete(
  "/:workspaceId/members/:memberId",
  protect,
  validateRequest(workspaceMemberParamsSchema),
  authorizeWorkspaceRole(["owner", "admin"]),
  removeWorkspaceMember,
);
router.patch(
  "/:workspaceId/members/:memberId/role",
  protect,
  validateRequest(workspaceMemberRoleSchema),
  authorizeWorkspaceRole(["owner", "admin"]),
  updateWorkspaceMemberRole,
);
router.delete(
  "/:workspaceId/leave",
  protect,
  validateRequest(workspaceIdParamsSchema),
  authorizeWorkspaceRole(["admin", "member"]),
  leaveWorkspace,
);

export default router;
