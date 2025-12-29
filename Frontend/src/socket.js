// src/socket.js
import { io } from "socket.io-client";

// Connect to backend
const socket = io("http://localhost:5000", {
  transports: ["websocket"], // ensures WebSocket transport
});

export default socket;
