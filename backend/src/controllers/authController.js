import User from "../models/User.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import logger from "../utils/logger.js";

const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: "1d",
  });
};

export const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      logger.warn(`Failed registration attempt: Email already exists - ${email}`);
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
    });

    const token = generateToken(user._id);

    const safeUser = user.toObject();
    delete safeUser.password;

    res.status(201).json({
      message: "Registration successful.",
      token,
      user: safeUser,
    });
    logger.info(`New user registered successfully: ${email} (ID: ${user._id})`);
  } catch (error) {
    logger.error(`Registration error for ${req.body.email}: ${error.message}`);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      logger.warn(`Failed login attempt: Invalid email - ${email}`);
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      logger.warn(`Failed login attempt: Incorrect password - ${email}`);
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = generateToken(user._id);

    const safeUser = user.toObject();
    delete safeUser.password;

    res.json({
      message: "Login successful",
      token,
      user: safeUser,
    });
    logger.info(`User logged in successfully: ${email} (ID: ${user._id})`);
  } catch (error) {
    logger.error(`Login error for ${req.body.email}: ${error.message}`);
    res.status(500).json({ message: "Internal server error" });
  }
};
