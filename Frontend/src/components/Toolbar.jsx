import React from "react";

export default function Toolbar({
  tool, setTool,
  shapeType, setShapeType,
  color, setColor,
  strokeWidth, setStrokeWidth,
  onUndo, onRedo, onClear
}) {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      padding: "10px",
      background: "linear-gradient(90deg, #4ade80, #22d3ee)",
      gap: "10px",
      color: "white",
      flexWrap: "wrap"
    }}>
      {/* Pen */}
      <button onClick={() => setTool("pen")} style={{ padding: "5px 10px" }}>✏️ Pen</button>

      {/* Color Picker */}
      <input
        type="color"
        value={color}
        onChange={(e) => setColor(e.target.value)}
        title="Pick color"
        style={{ width: "40px", height: "30px", border: "none", padding: 0 }}
      />

      {/* Stroke Width */}
      <select value={strokeWidth} onChange={(e) => setStrokeWidth(Number(e.target.value))}>
        {[1,2,3,4,5,6,8,10].map((w) => (
          <option key={w} value={w}>{w}px</option>
        ))}
      </select>

      {/* Shapes */}
      <button onClick={() => setTool("shape")} style={{ padding: "5px 10px" }}>⬜ Shapes</button>
      <select value={shapeType} onChange={(e) => setShapeType(e.target.value)}>
        <option value="rectangle">Rectangle</option>
        <option value="square">Square</option>
        <option value="circle">Circle</option>
        <option value="triangle">Triangle</option>
        <option value="arrow">Arrow</option>
      </select>

      {/* Undo, Redo, Clear */}
      <div style={{ marginLeft: "auto", display: "flex", gap: "5px" }}>
        <button onClick={onClear} style={{ padding: "5px 10px", background: "#ef4444", color: "white" }}>🧹 Clear</button>
        <button onClick={onUndo} style={{ padding: "5px 10px", background: "#facc15" }}>↩️ Undo</button>
        <button onClick={onRedo} style={{ padding: "5px 10px", background: "#22c55e", color: "white" }}>↪️ Redo</button>
      </div>
    </div>
  );
}
