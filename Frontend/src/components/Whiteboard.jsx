
import { Stage, Layer, Line, Rect, Circle, Arrow, RegularPolygon, Text } from "react-konva";
import { useState, useRef, useEffect } from "react";

export default function Whiteboard({ tool, shapeType, color, strokeWidth, onChange, undoTrigger, redoTrigger, clearTrigger, initialData }) {
  const stageRef = useRef();
  const isDrawing = useRef(false);

  // Initialize state with initialData if available
  const [lines, setLines] = useState(initialData?.lines || []);
  const [shapes, setShapes] = useState(initialData?.shapes || []);
  const [texts, setTexts] = useState(initialData?.texts || []);
  const [editingText, setEditingText] = useState(null);

  const history = useRef([]);
  const redoStack = useRef([]);

  const saveHistory = () => {
    history.current.push({
      lines: JSON.parse(JSON.stringify(lines)),
      shapes: JSON.parse(JSON.stringify(shapes)),
      texts: JSON.parse(JSON.stringify(texts)),
    });
    redoStack.current = [];
  };

  const handleUndo = () => {
    if (!history.current.length) return;
    redoStack.current.push({ lines, shapes, texts });
    const prev = history.current.pop();
    setLines(prev.lines);
    setShapes(prev.shapes);
    setTexts(prev.texts);
  };

  const handleRedo = () => {
    if (!redoStack.current.length) return;
    history.current.push({ lines, shapes, texts });
    const next = redoStack.current.pop();
    setLines(next.lines);
    setShapes(next.shapes);
    setTexts(next.texts);
  };

  const handleClear = () => {
    saveHistory();
    setLines([]);
    setShapes([]);
    setTexts([]);
  };

  useEffect(() => { if (undoTrigger) handleUndo(); }, [undoTrigger]);
  useEffect(() => { if (redoTrigger) handleRedo(); }, [redoTrigger]);
  useEffect(() => { if (clearTrigger) handleClear(); }, [clearTrigger]);

  const handleMouseDown = (e) => {
    const pos = stageRef.current.getPointerPosition();
    console.log("MouseDown", { tool, pos });
    if (!pos) return;
    saveHistory();

    if (tool === "pen") {
      isDrawing.current = true;
      setLines(prevLines => [...prevLines, { points: [pos.x, pos.y], stroke: color, strokeWidth }]);
    }

    if (tool === "text") {
      setEditingText({ x: pos.x, y: pos.y, index: texts.length });
      setTexts(prevTexts => [...prevTexts, { x: pos.x, y: pos.y, text: "", fill: color }]);
    }

    if (tool === "shape") {
      isDrawing.current = true;
      const currentShapeType = shapeType || "rectangle";
      setShapes(prevShapes => [...prevShapes, { x: pos.x, y: pos.y, width: 0, height: 0, shapeType: currentShapeType, stroke: color, strokeWidth }]);
    }
  };

  const handleMouseMove = (e) => {
    if (!isDrawing.current) return;
    const pos = stageRef.current.getPointerPosition();
    if (!pos) return;

    if (tool === "pen") {
      setLines((prevLines) => {
        if (prevLines.length === 0) return prevLines;
        const lastLine = { ...prevLines[prevLines.length - 1] };
        lastLine.points = lastLine.points.concat([pos.x, pos.y]);
        return [...prevLines.slice(0, -1), lastLine];
      });
    }

    if (tool === "shape") {
      setShapes((prevShapes) => {
        if (prevShapes.length === 0) return prevShapes;
        const lastShape = { ...prevShapes[prevShapes.length - 1] };
        lastShape.width = pos.x - lastShape.x;
        lastShape.height = pos.y - lastShape.y;
        return [...prevShapes.slice(0, -1), lastShape];
      });
    }

    onChange?.({ lines, shapes, texts });
  };

  const handleMouseUp = () => { isDrawing.current = false; };

  const handleTextChange = (e) => {
    const newTexts = [...texts];
    newTexts[editingText.index].text = e.target.value;
    setTexts(newTexts);
    onChange?.({ lines, shapes, texts: newTexts });
  };

  const handleTextBlur = () => setEditingText(null);

  // Update parent when state changes (initial load or edits)
  useEffect(() => {
    onChange?.({ lines, shapes, texts });
  }, [lines, shapes, texts]);


  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      <Stage
        width={window.innerWidth * 0.8}
        height={window.innerHeight - 60}
        ref={stageRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        style={{ background: "#ffffff", cursor: tool === "pen" ? "crosshair" : "default" }}
      >

        <Layer>
          {lines.map((line, i) => <Line key={i} points={line.points} stroke={line.stroke} strokeWidth={line.strokeWidth} lineCap="round" lineJoin="round" />)}

          {shapes.map((s, i) => {
            switch (s.shapeType) {
              case "rectangle": return <Rect key={i} x={s.x} y={s.y} width={s.width} height={s.height} stroke={s.stroke} strokeWidth={s.strokeWidth} />;
              case "square": const size = Math.max(Math.abs(s.width), Math.abs(s.height)); return <Rect key={i} x={s.x} y={s.y} width={size} height={size} stroke={s.stroke} strokeWidth={s.strokeWidth} />;
              case "circle": const r = Math.max(Math.abs(s.width), Math.abs(s.height)) / 2; return <Circle key={i} x={s.x + r} y={s.y + r} radius={r} stroke={s.stroke} strokeWidth={s.strokeWidth} />;
              case "triangle": return <RegularPolygon key={i} x={s.x + s.width / 2} y={s.y + s.height / 2} sides={3} radius={Math.max(Math.abs(s.width), Math.abs(s.height)) / 2} stroke={s.stroke} strokeWidth={s.strokeWidth} />;
              case "arrow": return <Arrow key={i} points={[s.x, s.y, s.x + s.width, s.y + s.height]} stroke={s.stroke} strokeWidth={s.strokeWidth} />;
              default: return null;
            }
          })}

          {texts.map((t, i) => <Text key={i} x={t.x} y={t.y} text={t.text} fill={t.fill} fontSize={18} fontStyle="bold" />)}
        </Layer>
      </Stage>

      {editingText && (
        <input
          autoFocus
          style={{ position: "absolute", top: editingText.y, left: editingText.x, fontSize: "18px", border: "1px solid #333", padding: "2px", zIndex: 10 }}
          value={texts[editingText.index].text}
          onChange={handleTextChange}
          onBlur={handleTextBlur}
        />
      )}
    </div>
  );
}
