import express from "express";
import { verifyToken } from "../middleware/auth.js";
import Board from "../models/board.js";

const router = express.Router();

// Save or update board
router.post("/save", verifyToken, async (req, res) => {
  try {
    const { id, title, boardData } = req.body;

    if (!boardData) {
      return res.status(400).json({ error: "boardData is required" });
    }

    if (id) {
      const board = await Board.findOne({ _id: id, user: req.user.id });
      if (!board) return res.status(404).json({ error: "Board not found" });

      board.data = boardData;
      if (title) board.title = title;
      await board.save();
      return res.json(board);
    }

    const board = await Board.create({
      user: req.user.id,
      title: title || "Untitled Board",
      data: boardData,
    });

    res.status(201).json(board);
  } catch (err) {
    console.error("Save board error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Load all boards for user
router.get("/load", verifyToken, async (req, res) => {
  try {
    const boards = await Board.find({ user: req.user.id })
      .select("title createdAt updatedAt")
      .sort({ updatedAt: -1 });
    res.json(boards);
  } catch (err) {
    console.error("Load boards error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Get single board by id
router.get("/:id", verifyToken, async (req, res) => {
  try {
    const board = await Board.findOne({ _id: req.params.id, user: req.user.id });
    if (!board) return res.status(404).json({ error: "Board not found" });
    res.json(board);
  } catch (err) {
    console.error("Get board error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Delete board
router.delete("/:id", verifyToken, async (req, res) => {
  try {
    const board = await Board.findOneAndDelete({ _id: req.params.id, user: req.user.id });
    if (!board) return res.status(404).json({ error: "Board not found" });
    res.json({ message: "Board deleted" });
  } catch (err) {
    console.error("Delete board error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;