import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import http from "http";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";

import connectDB from "./src/config/db.js";
import { registerRoutes } from "./src/routes/index.js";

dotenv.config();

connectDB();

const app = express();

const allowedOrigins = [
  /^http:\/\/(localhost|127\.0\.0\.1):\d+$/,
  /^https:\/\/taskzen-orpin\.vercel\.app$/,
];

const corsOrigin = (origin, callback) => {
  // Allow non-browser requests and whitelisted origins.
  if (!origin || allowedOrigins.some((pattern) => pattern.test(origin))) {
    callback(null, true);
    return;
  }

  callback(new Error("Not allowed by CORS"));
};

app.use(
  cors({
    origin: corsOrigin,
    credentials: true,
  }),
);

app.use(express.json());
app.use(cookieParser());

app.use((req, res, next) => {
  req.io = io;
  next();
});

app.get("/", (req, res) => {
  res.send("Taskzen API running");
});

registerRoutes(app);

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: corsOrigin,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Extract and verify JWT token for Socket.io authentication
const verifyToken = (token) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded;
  } catch (error) {
    return null;
  }
};

io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error("Authentication required"));
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return next(new Error("Invalid token"));
  }

  // Login token payload uses userId; keep id fallback for compatibility.
  socket.userId = decoded.userId || decoded.id;
  if (!socket.userId) {
    return next(new Error("Invalid token payload"));
  }
  next();
});

io.on("connection", (socket) => {
  console.log("[Socket] User connected:", socket.userId);

  // Join user to their notification room
  socket.on("latency:test", (startTime, ack) => {
    console.log("[Socket] latency:test received, startTime:", startTime);
    ack?.({ startTime, serverTime: Date.now() });
    socket.emit("latency:response", startTime);
    console.log("[Socket] latency:response emitted");
  });
  if (socket.userId) {
    socket.join(socket.userId);
  }

  socket.on("joinWorkspace", (workspaceId, callback) => {
    if (!workspaceId) {
      callback?.({ ok: false, message: "workspaceId is required" });
      return;
    }

    socket.join(`workspace:${workspaceId}`);
    callback?.({ ok: true });
  });

  socket.on("leaveWorkspace", (workspaceId, callback) => {
    if (!workspaceId) {
      callback?.({ ok: false, message: "workspaceId is required" });
      return;
    }

    socket.leave(`workspace:${workspaceId}`);
    callback?.({ ok: true });
  });

  socket.on("joinProject", (projectId, callback) => {
    if (!projectId) {
      callback?.({ ok: false, message: "projectId is required" });
      return;
    }

    socket.join(`project:${projectId}`);
    callback?.({ ok: true });
  });

  socket.on("leaveProject", (projectId, callback) => {
    if (!projectId) {
      callback?.({ ok: false, message: "projectId is required" });
      return;
    }

    socket.leave(`project:${projectId}`);
    callback?.({ ok: true });
  });

  socket.on("disconnect", () => {});
});

const PORT = process.env.PORT || 5000;

server.listen(PORT);
