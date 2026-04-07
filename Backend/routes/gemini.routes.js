import express from "express";
import { verifyToken } from "../middleware/auth.js";
import { getGeminiSuggestion } from "../services/gemini.js";

const router = express.Router();

router.post("/suggest", verifyToken, async (req, res) => {
  try {
    const { boardData } = req.body;

    if (!boardData) {
      return res.status(400).json({ error: "boardData is required" });
    }

    const prompt = `
You are an AI assistant helping improve whiteboard diagrams.
Analyze this whiteboard data and provide suggestions for:
- Cleaner layout and organization
- Better labels and descriptions
- Missing connections or elements
- Overall improvements

Whiteboard Data:
${JSON.stringify(boardData)}

Give short, clear, actionable suggestions.
    `;

    const suggestion = await getGeminiSuggestion(prompt);
    res.json({ suggestion });
  } catch (err) {
    console.error("Gemini error:", err);
    res.status(500).json({ error: "Failed to get AI suggestion" });
  }
});

export default router;