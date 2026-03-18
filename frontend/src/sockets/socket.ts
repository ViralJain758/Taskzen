import { io } from "socket.io-client";

const socket = io("http://localhost:5000", {
  withCredentials: true,
  transports: ["websocket", "polling"],
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 500,
  reconnectionDelayMax: 5000,
});

export const syncSocketAuth = (token: string | null) => {
  if (!token) {
    socket.auth = {};
    if (socket.connected || socket.active) {
      socket.disconnect();
    }
    return;
  }

  const currentToken =
    typeof socket.auth === "object" && socket.auth !== null
      ? (socket.auth as { token?: string }).token
      : undefined;

  // If token changed while connected, reconnect so server re-authenticates this socket.
  if (socket.connected && currentToken && currentToken !== token) {
    socket.disconnect();
  }

  socket.auth = { token };

  if (!socket.connected) {
    socket.connect();
  }
};

export const joinProjectRoom = (projectId: string) => {
  socket.emit("joinProject", projectId);
};

export const leaveProjectRoom = (projectId: string) => {
  socket.emit("leaveProject", projectId);
};

export default socket;
