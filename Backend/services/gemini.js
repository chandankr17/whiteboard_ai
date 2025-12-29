import axios from "axios";

export const getGeminiSuggestion = async (prompt) => {
  const res = await axios.post(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent",
    {
      contents: [{ parts: [{ text: prompt }] }]
    },
    {
      params: { key: process.env.GEMINI_API_KEY }
    }
  );

  return res.data.candidates[0].content.parts[0].text;
};
