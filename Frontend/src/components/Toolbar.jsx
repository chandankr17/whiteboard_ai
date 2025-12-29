import React from "react";

const Toolbar = ({ tool, setTool }) => {
  return (
    <div style={{ padding: 10, borderBottom: "1px solid #ccc" }}>
      <button onClick={() => setTool("pen")}>Pen</button>
      <button onClick={() => setTool("rect")}>Rectangle</button>
      <button onClick={() => setTool("text")}>Text</button>
      <button onClick={() => setTool("clear")}>Clear</button>
    </div>
  );
};

export default Toolbar;
