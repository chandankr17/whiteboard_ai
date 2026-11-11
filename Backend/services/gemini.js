import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export const getImageSearchQueries = async (image) => {
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: { responseMimeType: "application/json" },
  });
  const imageData = image.replace(/^data:image\/png;base64,/, "");
  const result = await model.generateContent([
    {
      text: `Look at this whiteboard screenshot and identify the main recognizable subjects or concepts.
Return only valid JSON in this exact shape: {"queries":["search phrase 1","search phrase 2","search phrase 3"]}.
Write concise image-search phrases for relevant real pictures, not drawing tutorials or diagram templates.
If the drawing is unclear, use only what is visibly supported and do not guess.`,
    },
    { inlineData: { mimeType: "image/png", data: imageData } },
  ]);
  const response = await result.response;
  const text = response.text().trim().replace(/^```(?:json)?\s*|\s*```$/g, "");
  const parsed = JSON.parse(text);
  if (!Array.isArray(parsed.queries)) {
    throw new Error("Image analysis returned no search queries");
  }

  return parsed.queries
    .filter((query) => typeof query === "string")
    .map((query) => query.trim())
    .filter(Boolean)
    .slice(0, 3);
};