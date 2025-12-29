import express from "express";
import { getGeminiSuggestion } from "../services/gemini.js";

const router = express.Router();

router.post("/suggest", async (req, res) => {
  try {
    const { boardData } = req.body;

    const prompt = `
Analyze this whiteboard data and suggest:
- cleaner shapes
- better labels
- improvements

Data:
${JSON.stringify(boardData)}
`;

    const suggestion = await getGeminiSuggestion(prompt);
    res.json({ suggestion });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Gemini error" });
  }
});

export default router;
