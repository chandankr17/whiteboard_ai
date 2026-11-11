import api from "./api";

export const searchImages = (query) =>
  api.get("/gemini/images", { params: { q: query } });
