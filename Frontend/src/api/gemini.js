import api from "./api";

export const getSuggestions = (boardData) =>
  api.post("/gemini/suggest", { boardData });
