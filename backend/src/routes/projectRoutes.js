import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { authorizeWorkspaceRole } from "../middleware/workspaceRoleMiddleware.js";
import { validateRequest } from "../middleware/validationMiddleware.js";
import {
  createProject,
  getWorkspaceProjects,
  getProjectById,
  deleteProject,
  getProjectInsights,
} from "../controllers/projectController.js";
import {
  projectCreateSchema,
  projectIdParamsSchema,
  workspaceOnlyParamsSchema,
  workspaceProjectParamsSchema,
} from "../validation/schemas.js";

const router = express.Router();

router.get(
  "/detail/:projectId",
  protect,
  validateRequest(projectIdParamsSchema),
  getProjectById,
);

router.get(
  "/insights/:projectId",
  protect,
  validateRequest(projectIdParamsSchema),
  getProjectInsights,
);

router.post(
  "/:workspaceId",
  protect,
  validateRequest(projectCreateSchema),
  authorizeWorkspaceRole(["owner", "admin", "member"]),
  createProject,
);

router.get(
  "/:workspaceId",
  protect,
  validateRequest(workspaceOnlyParamsSchema),
  authorizeWorkspaceRole(["owner", "admin", "member"]),
  getWorkspaceProjects,
);

router.delete(
  "/:workspaceId/:projectId",
  protect,
  validateRequest(workspaceProjectParamsSchema),
  authorizeWorkspaceRole(["owner", "admin"]),
  deleteProject,
);

export default router;
