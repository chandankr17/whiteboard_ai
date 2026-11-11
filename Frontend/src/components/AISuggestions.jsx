import { useState } from "react";
import { searchImages } from "../api/gemini";

export default function AISuggestions({ onAddImage }) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState([]);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);

  const handleSearch = async (event) => {
    event.preventDefault();
    const searchTerm = query.trim();
    if (!searchTerm) return;
    setLoading(true);
    setError("");
    setImages([]);
    setSearched(true);
    try {
      const res = await searchImages(searchTerm);
      setImages(res.data.images);
    } catch (err) {
      console.error(err);
      if (err.response) {
        setError(err.response.data.error || `Server Error: ${err.response.status}`);
      } else {
        setError("Could not reach image search. Check that the backend is running.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ai-suggestions">
      <form className="image-search-form" onSubmit={handleSearch}>
        <label className="sr-only" htmlFor="image-search">Search images</label>
        <input
          id="image-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search images…"
          maxLength={100}
        />
        <button className="ai-suggest-button" type="submit" disabled={loading || !query.trim()}>
          {loading ? "Searching…" : "Search"}
        </button>
      </form>
      {error && <p className="ai-message ai-error" role="alert">{error}</p>}
      {loading && <p className="ai-message">Searching Wikimedia Commons…</p>}
      {!loading && !error && searched && images.length === 0 && (
        <p className="ai-message">No images found. Try a different search.</p>
      )}
      {!searched && <p className="ai-message">Search for a picture to add to your board.</p>}
      {images.length > 0 && (
        <div className="image-results-heading">
          <h3>Search results</h3>
          <span>{images.length} images</span>
        </div>
      )}
      <div className="image-results-grid">
        {images.map((image) => (
          <article className="image-result" key={image.pageUrl}>
            <a
              className="image-result-source"
              href={image.pageUrl}
              target="_blank"
              rel="noreferrer"
              aria-label={`${image.title}, ${image.license}. Opens image source in new tab.`}
            >
              <img src={image.thumbnailUrl} alt={image.title} loading="lazy" />
              <span className="image-result-caption">
                <span className="image-result-title">{image.title}</span>
                <span className="image-result-license">{image.license}</span>
              </span>
            </a>
            <button className="image-add-button" onClick={() => onAddImage(image)}>
              Add to board
            </button>
          </article>
        ))}
      </div>
    </div>
  );
}
