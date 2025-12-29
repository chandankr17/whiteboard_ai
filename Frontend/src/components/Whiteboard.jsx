import { Stage, Layer, Line, Rect, Text } from "react-konva";
import { useState, useRef, useEffect } from "react";
import socket from "../socket";


export default function Whiteboard({ tool }) {
  const [lines, setLines] = useState([]);
  const [rects, setRects] = useState([]);
  const [texts, setTexts] = useState([]);

  const isDrawing = useRef(false);

  const undoStack = useRef([]);
  const redoStack = useRef([]);

  // Save state snapshot
  const saveHistory = () => {
    undoStack.current.push({
      lines: JSON.parse(JSON.stringify(lines)),
      rects: JSON.parse(JSON.stringify(rects)),
      texts: JSON.parse(JSON.stringify(texts)),
    });
    redoStack.current = [];
  };

  // Undo
  const undo = () => {
    if (!undoStack.current.length) return;

    redoStack.current.push({ lines, rects, texts });
    const prev = undoStack.current.pop();

    setLines(prev.lines);
    setRects(prev.rects);
    setTexts(prev.texts);
  };

  // Redo
  const redo = () => {
    if (!redoStack.current.length) return;

    undoStack.current.push({ lines, rects, texts });
    const next = redoStack.current.pop();

    setLines(next.lines);
    setRects(next.rects);
    setTexts(next.texts);
  };


  useEffect(() => {
  socket.on("board:init", (state) => {
    setLines(state.lines);
    setRects(state.rects);
    setTexts(state.texts);
  });

  socket.on("board:update", (state) => {
    setLines(state.lines);
    setRects(state.rects);
    setTexts(state.texts);
  });

  return () => {
    socket.off("board:init");
    socket.off("board:update");
  };
}, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.key === "z") undo();
      if (e.ctrlKey && e.key === "y") redo();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [lines, rects, texts]);

  const handleMouseDown = (e) => {
    saveHistory();
    isDrawing.current = true;

    const stage = e.target.getStage();
    const pos = stage.getPointerPosition();

    if (tool === "pen") {
      setLines([...lines, { points: [pos.x, pos.y] }]);
    }

    if (tool === "rect") {
      setRects([
        ...rects,
        { x: pos.x, y: pos.y, width: 0, height: 0 },
      ]);
    }

    if (tool === "text") {
      setTexts([...texts, { x: pos.x, y: pos.y, text: "Text" }]);
      isDrawing.current = false;
    }
  };

  const handleMouseMove = (e) => {
    if (!isDrawing.current) return;

    const stage = e.target.getStage();
    const pos = stage.getPointerPosition();

    if (tool === "pen") {
      const lastLine = lines[lines.length - 1];
      lastLine.points = lastLine.points.concat([pos.x, pos.y]);
      setLines([...lines.slice(0, -1), lastLine]);
    }

    if (tool === "rect") {
      const lastRect = rects[rects.length - 1];
      lastRect.width = pos.x - lastRect.x;
      lastRect.height = pos.y - lastRect.y;
      setRects([...rects.slice(0, -1), lastRect]);
    }
  };

  const handleMouseUp = () => {
    isDrawing.current = false;
  };

  useEffect(() => {
  socket.emit("board:update", { lines, rects, texts });
}, [lines, rects, texts]);


  return (
    <Stage
      width={window.innerWidth}
      height={window.innerHeight - 60}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      <Layer>
        {lines.map((line, i) => (
          <Line
            key={i}
            points={line.points}
            stroke="black"
            strokeWidth={2}
            lineCap="round"
            lineJoin="round"
          />
        ))}

        {rects.map((rect, i) => (
          <Rect
            key={i}
            x={rect.x}
            y={rect.y}
            width={rect.width}
            height={rect.height}
            stroke="black"
          />
        ))}

        {texts.map((text, i) => (
          <Text key={i} x={text.x} y={text.y} text={text.text} />
        ))}
      </Layer>
    </Stage>
  );
}
