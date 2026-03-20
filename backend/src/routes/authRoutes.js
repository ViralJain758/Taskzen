import express from "express";
import { register, login } from "../controllers/authController.js";
import { rateLimit } from "express-rate-limit";
import { validateRequest } from "../middleware/validationMiddleware.js";
import { authLoginSchema, authRegisterSchema } from "../validation/schemas.js";

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    message: "Too many login attempts, please try again after 15 minutes",
  },
});

const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: { message: "Too many requests, please try again later" },
});

router.post(
  "/register",
  authLimiter,
  validateRequest(authRegisterSchema),
  register,
);
router.post("/login", loginLimiter, validateRequest(authLoginSchema), login);

export default router;
