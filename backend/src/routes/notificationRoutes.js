import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  getUserNotifications,
  markAsRead,
} from "../controllers/notificationController.js";

const router = express.Router();

router.get("/", protect, getUserNotifications);

router.patch("/:notificationId/read", protect, markAsRead);

export default router;
