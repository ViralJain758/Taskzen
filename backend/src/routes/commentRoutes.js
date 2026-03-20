import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { validateRequest } from "../middleware/validationMiddleware.js";
import {
  addComment,
  getTaskComments,
  deleteComment,
} from "../controllers/commentController.js";
import {
  commentCreateSchema,
  taskIdParamsSchema,
  commentIdParamsSchema,
} from "../validation/schemas.js";

const router = express.Router();

router.post(
  "/:taskId",
  protect,
  validateRequest(commentCreateSchema),
  addComment,
);

router.get(
  "/:taskId",
  protect,
  validateRequest(taskIdParamsSchema),
  getTaskComments,
);

router.delete(
  "/:commentId",
  protect,
  validateRequest(commentIdParamsSchema),
  deleteComment,
);

export default router;
