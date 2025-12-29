const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
require("dotenv").config();

const connectDB = require("./config/db");
const Board = require("./models/Board");

// Connect MongoDB
connectDB();

const app = express();
app.use(cors());

const server = http.createServer(app);

// Socket.io setup
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

// In-memory board state (latest)
let boardState = {
  lines: [],
  rects: [],
  texts: [],
};

io.on("connection", async (socket) => {
  console.log("User connected:", socket.id);

  // Load latest board from DB
  const board = await Board.findOne({ boardId: "default" });
  if (board && board.versions.length > 0) {
    boardState = board.versions[board.versions.length - 1].state;
  }

  // Send board to new user
  socket.emit("board:init", boardState);

  // Listen for board updates
  socket.on("board:update", async (state) => {
    boardState = state;

    await Board.findOneAndUpdate(
      { boardId: "default" },
      {
        $push: {
          versions: {
            state,
            updatedBy: socket.id,
          },
        },
      },
      { upsert: true }
    );

    socket.broadcast.emit("board:update", boardState);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
