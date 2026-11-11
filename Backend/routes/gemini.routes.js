import express from "express";
import { verifyToken } from "../middleware/auth.js";
import { getImageSearchQueries } from "../services/gemini.js";

const router = express.Router();

router.get("/images", verifyToken, async (req, res) => {
  try {
    const searchTerm = typeof req.query.q === "string" ? req.query.q.trim() : "";
    if (!searchTerm) {
      return res.status(400).json({ error: "Enter a search term" });
    }

    if (searchTerm.length > 100) {
      return res.status(400).json({ error: "Search term must be 100 characters or fewer" });
    }

    const params = new URLSearchParams({
      action: "query",
      generator: "search",
      gsrsearch: searchTerm,
      gsrnamespace: "6",
      gsrlimit: "24",
      prop: "imageinfo",
      iiprop: "url|extmetadata",
      iiurlwidth: "480",
      format: "json",
    });
    const searchResponse = await fetch(`https://commons.wikimedia.org/w/api.php?${params}`, {
      headers: { "User-Agent": "WhiteboardAI/1.0 (image search)" },
    });
    if (!searchResponse.ok) {
      throw new Error(`Wikimedia image search failed with status ${searchResponse.status}`);
    }

    const searchData = await searchResponse.json();
    const images = Object.values(searchData.query?.pages ?? {})
      .map((page) => {
        const imageInfo = page.imageinfo?.[0];
        if (!imageInfo?.thumburl || !imageInfo?.descriptionurl) return null;

        return {
          title: page.title.replace(/^File:/, ""),
          thumbnailUrl: imageInfo.thumburl,
          pageUrl: imageInfo.descriptionurl,
          license: imageInfo.extmetadata?.LicenseShortName?.value || "See source for license",
        };
      })
      .filter(Boolean);

    res.json({ images });
  } catch (err) {
    console.error("Image search error:", err);
    res.status(502).json({ error: "Image search is temporarily unavailable" });
  }
});

router.post("/suggest", verifyToken, async (req, res) => {
  try {
    const { image } = req.body;

    if (typeof image !== "string" || !image.startsWith("data:image/png;base64,")) {
      return res.status(400).json({ error: "A PNG board image is required" });
    }

    const imageSize = Buffer.byteLength(image, "utf8");
    if (imageSize > 5 * 1024 * 1024) {
      return res.status(413).json({ error: "Board image must be smaller than 5 MB" });
    }

    const queries = await getImageSearchQueries(image);
    const uniqueImages = new Map();

    for (const query of queries) {
      const params = new URLSearchParams({
        action: "query",
        generator: "search",
        gsrsearch: query,
        gsrnamespace: "6",
        gsrlimit: "4",
        prop: "imageinfo",
        iiprop: "url|extmetadata",
        iiurlwidth: "480",
        format: "json",
      });
      const searchResponse = await fetch(`https://commons.wikimedia.org/w/api.php?${params}`, {
        headers: { "User-Agent": "WhiteboardAI/1.0 (image suggestions)" },
      });
      if (!searchResponse.ok) {
        throw new Error(`Wikimedia image search failed with status ${searchResponse.status}`);
      }

      const searchData = await searchResponse.json();
      for (const page of Object.values(searchData.query?.pages ?? {})) {
        const imageInfo = page.imageinfo?.[0];
        if (!imageInfo?.thumburl || !imageInfo?.descriptionurl) continue;

        uniqueImages.set(imageInfo.descriptionurl, {
          title: page.title.replace(/^File:/, ""),
          thumbnailUrl: imageInfo.thumburl,
          pageUrl: imageInfo.descriptionurl,
          license: imageInfo.extmetadata?.LicenseShortName?.value || "See source for license",
        });
      }
    }

    res.json({ images: Array.from(uniqueImages.values()).slice(0, 12) });
  } catch (err) {
    console.error("Image suggestion error:", err);
    res.status(500).json({ error: "Failed to find image suggestions" });
  }
});

export default router;