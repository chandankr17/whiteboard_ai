import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";

import geminiRoutes from "./routes/gemini.routes.js";
import authRoutes from "./routes/auth.js";
import boardsRoutes from "./routes/board.js";

dotenv.config();

const app = express();

app.use(cors({
  origin: ["http://localhost:5173", "http://localhost:3000"],
  credentials: true,
}));
app.use(express.json());

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.log(err));

app.use("/api/auth", authRoutes);
app.use("/api/gemini", geminiRoutes);
app.use("/api/boards", boardsRoutes);

app.get("/", (req, res) => {
  res.send("Whiteboard Backend Running");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
