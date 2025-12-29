import React from "react";

export default function Toolbar({ tool, setTool, shapeType, setShapeType, color, setColor, strokeWidth, setStrokeWidth, onUndo, onRedo, onClear, onSave, onLogout, onNewPage, onListBoards }) {
  return (
    <div
      style={{
        display: "flex", alignItems: "center", padding: "10px", background: "#1e3a8a", gap: "10px", color: "white", flexWrap: "wrap", borderBottom: "2px solid #3b82f6",
      }}
    >
      <button
        onClick={() => setTool("pen")}
        style={{ padding: "5px 10px", background: tool === "pen" ? "#3b82f6" : "#2563eb", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}
      >
        ✏️ Pen
      </button>

      <input
        type="color"
        value={color}
        onChange={(e) => setColor(e.target.value)}
        title="Pick color"
        style={{ width: "40px", height: "30px", border: "none", cursor: "pointer" }}
      />

      <select
        value={strokeWidth}
        onChange={(e) => setStrokeWidth(Number(e.target.value))}
      >
        {[1, 2, 3, 4, 5, 6, 8, 10].map((w) => (
          <option key={w} value={w}>{w}px</option>
        ))}
      </select>

      <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
        <button
          onClick={() => setTool("shape")}
          style={{ padding: "5px 10px", background: tool === "shape" ? "#3b82f6" : "#2563eb", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}
        >
          ⬜ Shapes
        </button>
        <select value={shapeType} onChange={(e) => setShapeType(e.target.value)}>
          <option value="rectangle">Rectangle</option>
          <option value="square">Square</option>
          <option value="circle">Circle</option>
          <option value="triangle">Triangle</option>
          <option value="arrow">Arrow</option>
        </select>
      </div>

      <button onClick={onClear} style={buttonStyle}>🧹 Clear</button>
      <button onClick={onUndo} style={buttonStyle}>↩️ Undo</button>
      <button onClick={onRedo} style={buttonStyle}>↪️ Redo</button>
      <button onClick={onListBoards} style={{ ...buttonStyle, background: "#8b5cf6" }}>📂 My Boards</button>
      <button onClick={onNewPage} style={{ ...buttonStyle, background: "#f59e0b" }}>📄 New Page</button>
      <button onClick={onSave} style={{ ...buttonStyle, background: "#10b981" }}>💾 Save</button>
      <button onClick={onLogout} style={{ ...buttonStyle, background: "#ef4444" }}>🚪 Logout</button>
    </div>
  );
}

const buttonStyle = { padding: "5px 10px", background: "#2563eb", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" };
