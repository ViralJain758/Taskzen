import { io } from "socket.io-client";

const socket = io("http://localhost:5000", {
  withCredentials: true,
  transports: ["websocket", "polling"],
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 500,
  reconnectionDelayMax: 5000,
});

export const joinProjectRoom = (projectId: string) => {
  socket.emit("joinProject", projectId);
};

export const leaveProjectRoom = (projectId: string) => {
  socket.emit("leaveProject", projectId);
};

export default socket;
