import { useState } from "react";
import { getSuggestions } from "../api/gemini";

export default function AISuggestions({ boardData }) {
  const [loading, setLoading] = useState(false);
  const [suggestion, setSuggestion] = useState("");

  const handleSuggest = async () => {
    setLoading(true);
    try {
      const res = await getSuggestions(boardData);
      setSuggestion(res.data.suggestion);
    } catch (err) {
      setSuggestion("Error getting suggestions");
    }
    setLoading(false);
  };

  return (
    <div style={{
      width: "300px",
      borderLeft: "1px solid #ccc",
      padding: "10px",
      background: "#fafafa"
    }}>
      <h3>AI Suggestions</h3>
      <button onClick={handleSuggest} disabled={loading}>
        {loading ? "Thinking..." : "Get Suggestions"}
      </button>

      <pre style={{ marginTop: 10, whiteSpace: "pre-wrap" }}>
        {suggestion}
      </pre>
    </div>
  );
}
