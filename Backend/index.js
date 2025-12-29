import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import geminiRoutes from "./routes/gemini.routes.js";

dotenv.config();


const app = express();

// Middlewares
app.use(cors({
  origin: "http://localhost:3000",
  credentials: true,
}));

app.use(express.json());

// Routes
app.use("/api/gemini", geminiRoutes);

// Test route
app.get("/", (req, res) => {
  res.send("Whiteboard Backend Running");
});

// Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
