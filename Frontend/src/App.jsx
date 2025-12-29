import { useState } from "react";
import Whiteboard from "./components/Whiteboard";
import Toolbar from "./components/Toolbar";
import AISuggestions from "./components/AISuggestions";

function App() {
  const [tool, setTool] = useState("pen");
  const [shapeType, setShapeType] = useState("rectangle");
  const [color, setColor] = useState("#ff0000");
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [boardData, setBoardData] = useState(null);

  const [undoTrigger, setUndoTrigger] = useState(0);
  const [redoTrigger, setRedoTrigger] = useState(0);
  const [clearTrigger, setClearTrigger] = useState(0);

  return (
    <div style={{ display: "flex", height: "100vh", background: "#f0f4f8" }}>
      {/* Left Panel: Toolbar + Whiteboard */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <Toolbar
          tool={tool} setTool={setTool}
          color={color} setColor={setColor}
          strokeWidth={strokeWidth} setStrokeWidth={setStrokeWidth}
          shapeType={shapeType} setShapeType={setShapeType}
          onUndo={() => setUndoTrigger((prev) => prev + 1)}
          onRedo={() => setRedoTrigger((prev) => prev + 1)}
          onClear={() => setClearTrigger((prev) => prev + 1)}
        />

        <div style={{
          flex: 1,
          margin: "10px",
          border: "2px solid #1e40af",
          borderRadius: "10px",
          overflow: "hidden",
          background: "#ffffff",
        }}>
          <Whiteboard
            tool={tool}
            shapeType={shapeType}
            color={color}
            strokeWidth={strokeWidth}
            onChange={setBoardData}
            undoTrigger={undoTrigger}
            redoTrigger={redoTrigger}
            clearTrigger={clearTrigger}
          />
        </div>
      </div>

      {/* Right Panel: AI Suggestions */}
      <div style={{
        width: "20%",
        borderLeft: "2px solid #1e40af",
        background: "#e0e7ff",
        padding: "10px",
        overflowY: "auto"
      }}>
        <h3 style={{ textAlign: "center", color: "#1e3a8a" }}>AI Suggestions</h3>
        <AISuggestions boardData={boardData} />
      </div>
    </div>
  );
}

export default App;
