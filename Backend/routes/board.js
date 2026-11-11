import express from "express";
import { randomBytes } from "node:crypto";
import { verifyToken } from "../middleware/auth.js";
import Board from "../models/board.js";
import { hasBoardAccess, hashShareToken } from "../services/boardAccess.js";
import { closeBoardRoom, revokeInviteSessions } from "../socketServer.js";

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
    const board = await Board.findById(req.params.id).select("+shareTokenHash");
    if (!board) return res.status(404).json({ error: "Board not found" });
    if (!hasBoardAccess(board, req.user.id, req.query.shareToken)) {
      return res.status(404).json({ error: "Board not found" });
    }

    const { shareTokenHash, ...boardData } = board.toObject();
    res.json({ ...boardData, isOwner: board.user.toString() === req.user.id });
  } catch (err) {
    console.error("Get board error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/:id/share", verifyToken, async (req, res) => {
  try {
    const board = await Board.findOne({ _id: req.params.id, user: req.user.id });
    if (!board) return res.status(404).json({ error: "Board not found" });

    const shareToken = randomBytes(32).toString("hex");
    board.shareTokenHash = hashShareToken(shareToken);
    await board.save();
    const io = req.app.get("io");
    if (io) await revokeInviteSessions(io, board.id);

    res.json({ shareToken });
  } catch (err) {
    console.error("Create board invite error:", err);
    res.status(500).json({ error: "Unable to create a board invite" });
  }
});

// Delete board
router.delete("/:id", verifyToken, async (req, res) => {
  try {
    const board = await Board.findOneAndDelete({ _id: req.params.id, user: req.user.id });
    if (!board) return res.status(404).json({ error: "Board not found" });
    const io = req.app.get("io");
    if (io) await closeBoardRoom(io, req.params.id);
    res.json({ message: "Board deleted" });
  } catch (err) {
    console.error("Delete board error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;