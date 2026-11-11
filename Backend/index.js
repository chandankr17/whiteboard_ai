import express from "express";
import { createServer } from "node:http";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./config/db.js";
import { attachSocketServer } from "./socketServer.js";
import geminiRoutes from "./routes/gemini.routes.js";
import authRoutes from "./routes/auth.js";
import boardsRoutes from "./routes/board.js";

dotenv.config();

const app = express();
const httpServer = createServer(app);
app.set("io", attachSocketServer(httpServer));

app.use(cors({
  origin: "*",
  credentials: true,
}));
app.use(express.json({ limit: "10mb" }));

app.use("/api/auth", authRoutes);
app.use("/api/gemini", geminiRoutes);
app.use("/api/boards", boardsRoutes);

app.get("/", (req, res) => res.send("Whiteboard Backend Running"));

const PORT = process.env.PORT || 5000;
await connectDB();
httpServer.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));