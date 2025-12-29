import { useState } from "react";
import Whiteboard from "./components/Whiteboard";

function App() {
  const [tool, setTool] = useState("pen");

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Toolbar */}
      <div style={{ padding: "8px", borderBottom: "1px solid #ccc" }}>
        <button onClick={() => setTool("pen")}>Pen</button>
        <button onClick={() => setTool("rect")}>Rectangle</button>
        <button onClick={() => setTool("text")}>Text</button>
        <button onClick={() => setTool("clear")}>Clear</button>
      </div>

      {/* Whiteboard */}
      <div style={{ flex: 1 }}>
        <Whiteboard tool={tool} />
      </div>
    </div>
  );
}

export default App;
