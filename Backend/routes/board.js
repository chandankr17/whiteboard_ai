import express from "express";
import jwt from "jsonwebtoken";
import Board from "../models/Board.js";

const router = express.Router();

const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: "Invalid token" });
  }
};

router.post("/save", verifyToken, async (req, res) => {
  try {
    const { id, title, boardData } = req.body;

    if (id) {
      let board = await Board.findOne({ _id: id, user: req.user.id });
      if (!board) return res.status(404).json({ error: "Board not found" });

      board.data = boardData;
      if (title) board.title = title;
      await board.save();
      return res.json(board);
    } else {
      const board = await Board.create({
        user: req.user.id,
        title: title || "Untitled Board",
        data: boardData
      });
      res.json(board);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/load", verifyToken, async (req, res) => {
  try {
    const boards = await Board.find({ user: req.user.id })
      .select("title createdAt updatedAt")
      .sort({ updatedAt: -1 });
    res.json(boards);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/:id", verifyToken, async (req, res) => {
  try {
    const board = await Board.findOne({ _id: req.params.id, user: req.user.id });
    if (!board) return res.status(404).json({ error: "Board not found" });
    res.json(board);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
