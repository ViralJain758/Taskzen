import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { validateRequest } from "../middleware/validationMiddleware.js";
import {
  getUserNotifications,
  markAsRead,
} from "../controllers/notificationController.js";
import { notificationIdParamsSchema } from "../validation/schemas.js";

const router = express.Router();

router.get("/", protect, getUserNotifications);

router.patch(
  "/:notificationId/read",
  protect,
  validateRequest(notificationIdParamsSchema),
  markAsRead,
);

export default router;
