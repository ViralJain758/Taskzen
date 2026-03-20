import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { validateRequest } from "../middleware/validationMiddleware.js";
import {
  createTask,
  getProjectTasks,
  getProjectAssignees,
  updateTaskStatus,
  updateTask,
  deleteTask,
} from "../controllers/taskController.js";
import {
  taskCreateSchema,
  taskProjectParamsSchema,
  taskStatusSchema,
  taskUpdateSchema,
  taskIdParamsSchema,
} from "../validation/schemas.js";

const router = express.Router();

router.post(
  "/:projectId",
  protect,
  validateRequest(taskCreateSchema),
  createTask,
);

router.get(
  "/:projectId",
  protect,
  validateRequest(taskProjectParamsSchema),
  getProjectTasks,
);

router.get(
  "/:projectId/assignees",
  protect,
  validateRequest(taskProjectParamsSchema),
  getProjectAssignees,
);

router.patch(
  "/:taskId/status",
  protect,
  validateRequest(taskStatusSchema),
  updateTaskStatus,
);

router.patch(
  "/:taskId",
  protect,
  validateRequest(taskUpdateSchema),
  updateTask,
);

router.delete(
  "/:taskId",
  protect,
  validateRequest(taskIdParamsSchema),
  deleteTask,
);

export default router;
