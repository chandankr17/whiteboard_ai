import { Stage, Layer, Line, Rect, Circle, Arrow, RegularPolygon, Text, Image as KonvaImage, Transformer } from "react-konva";
import { useState, useRef, useEffect, useLayoutEffect, useCallback } from "react";

function BoardImage({ item, selected, onSelect, onMove, onTransformEnd, transformerRef }) {
  const [image, setImage] = useState(null);
  const imageNodeRef = useRef(null);

  useEffect(() => {
    const loadedImage = new window.Image();
    loadedImage.crossOrigin = "anonymous";
    loadedImage.onload = () => setImage(loadedImage);
    loadedImage.onerror = () => console.error("Unable to load board image:", item.thumbnailUrl);
    loadedImage.src = item.thumbnailUrl;

    return () => {
      loadedImage.onload = null;
      loadedImage.onerror = null;
    };
  }, [item.thumbnailUrl]);

  useEffect(() => {
    if (!selected || !imageNodeRef.current || !transformerRef.current) return;
    transformerRef.current.nodes([imageNodeRef.current]);
    transformerRef.current.getLayer()?.batchDraw();
  }, [selected, image, transformerRef]);

  if (!image) return null;

  const scale = Math.min(220 / image.naturalWidth, 180 / image.naturalHeight, 1);
  const width = item.width ?? image.naturalWidth * scale;
  const height = item.height ?? image.naturalHeight * scale;

  return (
    <KonvaImage
      ref={imageNodeRef}
      image={image}
      name="board-image"
      x={item.x}
      y={item.y}
      width={width}
      height={height}
      draggable
      onClick={onSelect}
      onTap={onSelect}
      onDragStart={onSelect}
      onDragEnd={(event) => onMove(item.id, {
        x: event.target.x(),
        y: event.target.y(),
      })}
      onTransformEnd={(event) => {
        const node = event.target;
        const nextWidth = Math.max(40, node.width() * node.scaleX());
        const nextHeight = Math.max(40, node.height() * node.scaleY());
        node.scaleX(1);
        node.scaleY(1);
        onTransformEnd(item.id, {
          x: node.x(),
          y: node.y(),
          width: nextWidth,
          height: nextHeight,
        });
      }}
    />
  );
}

const isPointInsideShape = (shape, point) => {
  if (shape.shapeType === "arrow") return false;

  if (shape.shapeType === "rectangle" || shape.shapeType === "square") {
    const size = shape.shapeType === "square"
      ? Math.max(Math.abs(shape.width), Math.abs(shape.height))
      : null;
    const width = size ?? Math.abs(shape.width);
    const height = size ?? Math.abs(shape.height);
    const left = shape.shapeType === "square" ? shape.x : Math.min(shape.x, shape.x + shape.width);
    const top = shape.shapeType === "square" ? shape.y : Math.min(shape.y, shape.y + shape.height);
    return point.x >= left && point.x <= left + width && point.y >= top && point.y <= top + height;
  }

  const radius = Math.max(Math.abs(shape.width), Math.abs(shape.height)) / 2;
  const centerX = shape.shapeType === "circle" ? shape.x + radius : shape.x + shape.width / 2;
  const centerY = shape.shapeType === "circle" ? shape.y + radius : shape.y + shape.height / 2;

  if (shape.shapeType === "circle") {
    return (point.x - centerX) ** 2 + (point.y - centerY) ** 2 <= radius ** 2;
  }

  if (shape.shapeType === "triangle") {
    const vertices = Array.from({ length: 3 }, (_, index) => {
      const angle = (index * 2 * Math.PI) / 3;
      return {
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
      };
    });
    let inside = false;

    for (let index = 0, previous = vertices.length - 1; index < vertices.length; previous = index, index += 1) {
      const currentVertex = vertices[index];
      const previousVertex = vertices[previous];
      const crossesRay = (currentVertex.y > point.y) !== (previousVertex.y > point.y);
      const intersectionX = ((previousVertex.x - currentVertex.x) * (point.y - currentVertex.y))
        / (previousVertex.y - currentVertex.y) + currentVertex.x;
      if (crossesRay && point.x < intersectionX) inside = !inside;
    }

    return inside;
  }

  return false;
};

export default function Whiteboard({ pageId, pageZoom = 1, tool, shapeType, color, textFontSize = 18, strokeWidth, onChange, undoTrigger, redoTrigger, clearTrigger, initialData, imageToAdd, onImageAdded, pageFormat = "freeform" }) {
  const stageRef = useRef();
  const viewportRef = useRef();
  const textEditorRef = useRef(null);
  const isDrawing = useRef(false);

  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const isA4 = pageFormat === "a4-portrait" || pageFormat === "a4-landscape";
  const pageWidth = pageFormat === "a4-portrait" ? 794 : 1123;
  const pageHeight = pageFormat === "a4-portrait" ? 1123 : 794;
  const stageWidth = isA4 ? pageWidth : canvasSize.width;
  const stageHeight = isA4 ? pageHeight : canvasSize.height;
  const stageScale = isA4
    ? Math.max(0.01, Math.min((canvasSize.width - 40) / pageWidth, (canvasSize.height - 40) / pageHeight, 1))
    : 1;
  const stageOffsetX = isA4 ? 20 + Math.max(0, (canvasSize.width - 40 - pageWidth * stageScale) / 2) : 0;
  const stageOffsetY = isA4 ? 20 + Math.max(0, (canvasSize.height - 40 - pageHeight * stageScale) / 2) : 0;
  const [lines, setLines] = useState(initialData?.lines || []);
  const [shapes, setShapes] = useState(initialData?.shapes || []);
  const [texts, setTexts] = useState(initialData?.texts || []);
  const [images, setImages] = useState(initialData?.images || []);
  const [editingText, setEditingText] = useState(null);
  const [selectedImageId, setSelectedImageId] = useState(null);

  const history = useRef([]);
  const redoStack = useRef([]);
  const transformerRef = useRef(null);
  const previousTriggers = useRef({ undo: undoTrigger, redo: redoTrigger, clear: clearTrigger });
  const lastAddedImageId = useRef(null);

  useEffect(() => {
    if (selectedImageId) return;
    transformerRef.current?.nodes([]);
    transformerRef.current?.getLayer()?.batchDraw();
  }, [selectedImageId]);

  useEffect(() => {
    if (selectedImageId && !images.some((image) => image.id === selectedImageId)) {
      // Clear selection when undo or redo removes the selected image.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedImageId(null);
    }
  }, [images, selectedImageId]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return undefined;

    const resizeObserver = new ResizeObserver(() => {
      const bounds = viewport.getBoundingClientRect();
      setCanvasSize({
        width: Math.floor(bounds.width / pageZoom),
        height: Math.floor(bounds.height / pageZoom),
      });
    });
    resizeObserver.observe(viewport);
    return () => resizeObserver.disconnect();
  }, [pageZoom]);

  const saveHistory = useCallback(() => {
    history.current.push({
      lines: JSON.parse(JSON.stringify(lines)),
      shapes: JSON.parse(JSON.stringify(shapes)),
      texts: JSON.parse(JSON.stringify(texts)),
      images: JSON.parse(JSON.stringify(images)),
    });
    redoStack.current = [];
  }, [images, lines, shapes, texts]);

  const handleUndo = useCallback(() => {
    if (!history.current.length) return;
    redoStack.current.push({ lines, shapes, texts, images });
    const prev = history.current.pop();
    setLines(prev.lines);
    setShapes(prev.shapes);
    setTexts(prev.texts);
    setImages(prev.images || []);
  }, [images, lines, shapes, texts]);

  const handleRedo = useCallback(() => {
    if (!redoStack.current.length) return;
    history.current.push({ lines, shapes, texts, images });
    const next = redoStack.current.pop();
    setLines(next.lines);
    setShapes(next.shapes);
    setTexts(next.texts);
    setImages(next.images || []);
  }, [images, lines, shapes, texts]);

  const handleClear = useCallback(() => {
    saveHistory();
    setLines([]);
    setShapes([]);
    setTexts([]);
    setImages([]);
    setSelectedImageId(null);
  }, [saveHistory]);

  useEffect(() => {
    if (!imageToAdd || lastAddedImageId.current === imageToAdd.id) return;
    if (imageToAdd.targetPageId && imageToAdd.targetPageId !== pageId) return;
    lastAddedImageId.current = imageToAdd.id;
    saveHistory();
    // Applying a one-time add-image command updates the canvas state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setImages((currentImages) => [
      ...currentImages,
      {
        ...imageToAdd,
        x: Math.max(12, (stageWidth - 220) / 2),
        y: Math.max(12, (stageHeight - 180) / 2),
      },
    ]);
    onImageAdded?.();
  }, [canvasSize.height, canvasSize.width, imageToAdd, onImageAdded, pageId, saveHistory, stageHeight, stageWidth]);

  const updateBoardImage = useCallback((imageId, changes) => {
    saveHistory();
    setImages((currentImages) =>
      currentImages.map((image) => image.id === imageId ? { ...image, ...changes } : image)
    );
  }, [saveHistory]);

  const removeImage = (imageId) => {
    saveHistory();
    setImages((currentImages) => currentImages.filter((image) => image.id !== imageId));
    setSelectedImageId(null);
  };

  const handleFillShape = useCallback((index) => {
    const shape = shapes[index];
    if (tool !== "fill" || !shape || shape.shapeType === "arrow" || shape.fill === color) return;

    saveHistory();
    setShapes((currentShapes) =>
      currentShapes.map((currentShape, currentIndex) =>
        currentIndex === index ? { ...currentShape, fill: color } : currentShape
      )
    );
  }, [color, saveHistory, shapes, tool]);

  useEffect(() => {
    if (undoTrigger?.pageId === pageId && previousTriggers.current.undo !== undoTrigger.version) {
      handleUndo();
    }
    previousTriggers.current.undo = undoTrigger?.version ?? undoTrigger;
  }, [undoTrigger, handleUndo, pageId]);

  useEffect(() => {
    if (redoTrigger?.pageId === pageId && previousTriggers.current.redo !== redoTrigger.version) {
      handleRedo();
    }
    previousTriggers.current.redo = redoTrigger?.version ?? redoTrigger;
  }, [redoTrigger, handleRedo, pageId]);

  useEffect(() => {
    if (clearTrigger?.pageId === pageId && previousTriggers.current.clear !== clearTrigger.version) {
      previousTriggers.current.clear = clearTrigger.version;
      // The toolbar trigger represents a user action, so applying it updates canvas state.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      handleClear();
    }
  }, [clearTrigger, handleClear, pageId]);

  const handleMouseDown = (event) => {
    const pos = stageRef.current.getPointerPosition();
    if (!pos) return;
    if (event.target === event.target.getStage()) {
      setSelectedImageId(null);
    }
    if (event.target.hasName("board-image")) return;
    if (event.target.hasName("board-text")) return;
    if (event.target.findAncestor("Transformer", true)) return;
    if (tool === "fill") {
      let shapeIndex = -1;
      for (let index = shapes.length - 1; index >= 0; index -= 1) {
        if (isPointInsideShape(shapes[index], pos)) {
          shapeIndex = index;
          break;
        }
      }
      if (shapeIndex >= 0) handleFillShape(shapeIndex);
      return;
    }
    saveHistory();

    if (tool === "pen") {
      isDrawing.current = true;
      setLines(prevLines => [...prevLines, { points: [pos.x, pos.y], stroke: color, strokeWidth }]);
    }

    if (tool === "text") {
      const currentDraft = editingText && !texts[editingText.index]?.text
        ? editingText.index
        : -1;

      if (currentDraft >= 0) {
        setTexts((currentTexts) => currentTexts.map((text, index) =>
          index === currentDraft
            ? { ...text, x: pos.x, y: pos.y, fill: color, fontSize: textFontSize }
            : text
        ));
        setEditingText({ x: pos.x, y: pos.y, index: currentDraft });
      } else {
        const index = texts.length;
        setEditingText({ x: pos.x, y: pos.y, index });
        setTexts((prevTexts) => [
          ...prevTexts,
          { x: pos.x, y: pos.y, text: "", fill: color, fontSize: textFontSize },
        ]);
      }
    }

    if (tool === "shape") {
      isDrawing.current = true;
      const currentShapeType = shapeType || "rectangle";
      setShapes(prevShapes => [...prevShapes, { x: pos.x, y: pos.y, width: 0, height: 0, shapeType: currentShapeType, stroke: color, strokeWidth }]);
    }
  };

  const handleMouseMove = () => {
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

    onChange?.({ lines, shapes, texts, images });
  };

  const handleMouseUp = () => { isDrawing.current = false; };

  const handleTextChange = (e) => {
    const updatedText = e.target.value;
    const newTexts = texts.map((text, index) =>
      index === editingText.index
        ? { ...text, text: updatedText, fill: color, fontSize: textFontSize }
        : text
    );
    setTexts(newTexts);
    onChange?.({ lines, shapes, texts: newTexts, images });
  };

  const handleStartTextEdit = (index, event) => {
    if (editingText?.index === index) return;
    saveHistory();
    const text = texts[index];
    setEditingText({ x: text.x, y: text.y, index });
    event.cancelBubble = true;
  };

  const handleTextBlur = () => setEditingText(null);

  useLayoutEffect(() => {
    if (!editingText || !textEditorRef.current) return;
    textEditorRef.current.focus();
    const cursorPosition = textEditorRef.current.value.length;
    textEditorRef.current.setSelectionRange(cursorPosition, cursorPosition);
  }, [editingText]);

  const handleTextKeyDown = (event) => {
    if (event.key === "Escape" || (event.key === "Enter" && (event.ctrlKey || event.metaKey))) {
      event.preventDefault();
      event.currentTarget.blur();
    }
  };

  useEffect(() => {
    onChange?.({ lines, shapes, texts, images });
  }, [images, lines, shapes, texts, onChange]);

  return (
    <div ref={viewportRef} className={`canvas-viewport ${isA4 ? "is-a4" : ""}`}>
      <div
        className={`stage-frame ${isA4 ? "is-a4" : ""}`}
        style={isA4 ? { width: pageWidth * stageScale, height: pageHeight * stageScale } : undefined}
      >
      <Stage
        width={stageWidth}
        height={stageHeight}
        ref={stageRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        style={{
          background: "#ffffff",
          cursor: tool === "pen" ? "crosshair" : tool === "fill" ? "cell" : tool === "text" ? "text" : "default",
          ...(isA4 ? { transform: `scale(${stageScale})`, transformOrigin: "top left" } : {}),
        }}
      >

        <Layer>
          {lines.map((line, i) => <Line key={i} points={line.points} stroke={line.stroke} strokeWidth={line.strokeWidth} lineCap="round" lineJoin="round" />)}

          {shapes.map((s, i) => {
            const fillProps = s.shapeType === "arrow" ? {} : { fill: s.fill || "transparent" };
            switch (s.shapeType) {
              case "rectangle": return <Rect key={i} {...fillProps} x={s.x} y={s.y} width={s.width} height={s.height} stroke={s.stroke} strokeWidth={s.strokeWidth} />;
              case "square": {
                const size = Math.max(Math.abs(s.width), Math.abs(s.height));
                return <Rect key={i} {...fillProps} x={s.x} y={s.y} width={size} height={size} stroke={s.stroke} strokeWidth={s.strokeWidth} />;
              }
              case "circle": {
                const r = Math.max(Math.abs(s.width), Math.abs(s.height)) / 2;
                return <Circle key={i} {...fillProps} x={s.x + r} y={s.y + r} radius={r} stroke={s.stroke} strokeWidth={s.strokeWidth} />;
              }
              case "triangle": return <RegularPolygon key={i} {...fillProps} x={s.x + s.width / 2} y={s.y + s.height / 2} sides={3} radius={Math.max(Math.abs(s.width), Math.abs(s.height)) / 2} stroke={s.stroke} strokeWidth={s.strokeWidth} />;
              case "arrow": return <Arrow key={i} points={[s.x, s.y, s.x + s.width, s.y + s.height]} stroke={s.stroke} strokeWidth={s.strokeWidth} />;
              default: return null;
            }
          })}

          {images.map((image) => (
            <BoardImage
              key={image.id}
              item={image}
              selected={image.id === selectedImageId}
              onSelect={() => setSelectedImageId(image.id)}
              onMove={updateBoardImage}
              onTransformEnd={updateBoardImage}
              transformerRef={transformerRef}
            />
          ))}

          <Transformer
            ref={transformerRef}
            rotateEnabled={false}
            flipEnabled={false}
            keepRatio={false}
            enabledAnchors={["top-left", "top-right", "bottom-left", "bottom-right"]}
            boundBoxFunc={(oldBox, newBox) =>
              newBox.width < 40 || newBox.height < 40 ? oldBox : newBox
            }
          />

          {texts.map((t, i) => (
            <Text
              key={i}
              name="board-text"
              x={t.x}
              y={t.y}
              text={t.text}
              fill={t.fill}
              fontSize={t.fontSize || 18}
              fontStyle={t.fontStyle || "bold"}
              onMouseDown={(event) => {
                if (tool === "text") handleStartTextEdit(i, event);
              }}
              onClick={(event) => {
                if (tool === "text") handleStartTextEdit(i, event);
              }}
              onTap={(event) => {
                if (tool === "text") handleStartTextEdit(i, event);
              }}
              onDblClick={(event) => handleStartTextEdit(i, event)}
              onDblTap={(event) => handleStartTextEdit(i, event)}
            />
          ))}
        </Layer>
      </Stage>

      {images.filter((image) => image.id === selectedImageId).map((image) => {
        const left = Math.max(6, Math.min(stageWidth - 96, image.x));
        const top = Math.max(6, image.y - 38);

        return (
          <button
            key={image.id}
            className="canvas-remove-image"
            style={{
              left: stageOffsetX + left * stageScale,
              top: stageOffsetY + top * stageScale,
            }}
            onClick={() => removeImage(image.id)}
            aria-label={`Remove ${image.title} from board`}
          >
            Remove
          </button>
        );
      })}

      {editingText && (
        <textarea
          ref={textEditorRef}
          style={{
            position: "absolute",
            top: stageOffsetY + editingText.y * stageScale,
            left: stageOffsetX + editingText.x * stageScale,
            fontSize: `${(texts[editingText.index]?.fontSize || textFontSize) * stageScale}px`,
            color: texts[editingText.index]?.fill || color,
            fontFamily: "Arial, sans-serif",
            fontWeight: "bold",
            lineHeight: 1.35,
            border: "none",
            borderRadius: 0,
            outline: "none",
            background: "transparent",
            caretColor: texts[editingText.index]?.fill || color,
            padding: 0,
            zIndex: 10,
            minWidth: "180px",
            minHeight: "32px",
            resize: "none",
            overflow: "hidden",
            pointerEvents: "auto",
          }}
          value={texts[editingText.index]?.text ?? ""}
          onChange={handleTextChange}
          onBlur={() => {
            if (!texts[editingText.index]?.text) {
              setTexts((currentTexts) =>
                currentTexts.filter((_, index) => index !== editingText.index)
              );
            }
            handleTextBlur();
          }}
          onKeyDown={handleTextKeyDown}
          onMouseDown={(event) => event.stopPropagation()}
          onTouchStart={(event) => event.stopPropagation()}
        />
      )}
      </div>
    </div>
  );
}
