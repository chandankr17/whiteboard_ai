import React from "react";

export default function Toolbar({ tool, setTool, drawMode, onSelectTextMode, onSelectDrawMode, shapeType, setShapeType, color, setColor, textFontSize, setTextFontSize, strokeWidth, setStrokeWidth, onUndo, onRedo, onClear, onLogout, onNewBoard, onListBoards, theme, onToggleTheme }) {
  return (
    <div className="toolbar">
      <div className="toolbar-topline">
        <div className="toolbar-brand">
          <span className="toolbar-brand-mark">W</span>
          <span>Whiteboard AI</span>
        </div>
        <div className="toolbar-top-actions">
          <button
            className="toolbar-action theme-toggle"
            onClick={onToggleTheme}
            aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
            aria-pressed={theme === "dark"}
          >
            <span aria-hidden="true">{theme === "light" ? "☾" : "☀"}</span>
            {theme === "light" ? "Dark mode" : "Light mode"}
          </button>
          <button className="toolbar-action toolbar-logout" onClick={onLogout}>Log out</button>
        </div>
      </div>

      <div className="toolbar-controls">
        <div className="toolbar-tools" aria-label="Drawing tools">
          <button
            className={`tool-button mode-button ${!drawMode ? "is-active" : ""}`}
            onClick={onSelectTextMode}
            aria-pressed={!drawMode}
          >
            <span aria-hidden="true">T</span> Text
          </button>

          <button
            className={`tool-button mode-button ${drawMode ? "is-active" : ""}`}
            onClick={onSelectDrawMode}
            aria-pressed={drawMode}
          >
            <span aria-hidden="true">✎</span> Draw
          </button>

          {!drawMode && (
            <>
              <label className="color-control" title="Pick text color">
                <span className="sr-only">Text color</span>
                <input
                  type="color"
                  value={color}
                  onChange={(event) => setColor(event.target.value)}
                />
              </label>

              <label className="toolbar-select" title="Text size">
                <span className="sr-only">Text size</span>
                <select
                  value={textFontSize}
                  onChange={(event) => setTextFontSize(Number(event.target.value))}
                >
                  {[12, 14, 16, 18, 24, 32, 48].map((size) => (
                    <option key={size} value={size}>{size}px</option>
                  ))}
                </select>
              </label>
            </>
          )}

          {drawMode && (
            <>
              <button
                className={`tool-button ${tool === "pen" ? "is-active" : ""}`}
                onClick={() => setTool("pen")}
                aria-pressed={tool === "pen"}
              >
                <span aria-hidden="true">✎</span> Pen
              </button>

              <button
                className={`tool-button ${tool === "fill" ? "is-active" : ""}`}
                onClick={() => setTool("fill")}
                aria-pressed={tool === "fill"}
                title="Fill a closed shape with the selected color"
              >
                <span aria-hidden="true">◩</span> Fill
              </button>

              <div className="shape-control">
                <button
                  className={`tool-button ${tool === "shape" ? "is-active" : ""}`}
                  onClick={() => setTool("shape")}
                  aria-pressed={tool === "shape"}
                >
                  <span aria-hidden="true">◇</span> Shapes
                </button>

                <label className="toolbar-select">
                  <span className="sr-only">Shape type</span>
                  <select value={shapeType} onChange={(e) => setShapeType(e.target.value)}>
                    <option value="rectangle">Rectangle</option>
                    <option value="square">Square</option>
                    <option value="circle">Circle</option>
                    <option value="triangle">Triangle</option>
                    <option value="arrow">Arrow</option>
                  </select>
                </label>
              </div>

              <label className="color-control" title="Pick drawing color">
                <span className="sr-only">Drawing color</span>
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                />
              </label>

              <label className="toolbar-select stroke-select">
                <span className="sr-only">Stroke width</span>
                <select
                  value={strokeWidth}
                  onChange={(e) => setStrokeWidth(Number(e.target.value))}
                >
                  {[1, 2, 3, 4, 5, 6, 8, 10].map((w) => (
                    <option key={w} value={w}>{w}px</option>
                  ))}
                </select>
              </label>
            </>
          )}
        </div>

        <div className="toolbar-actions">
          <button className="toolbar-action" onClick={onUndo} aria-label="Undo">↶ <span>Undo</span></button>
          <button className="toolbar-action" onClick={onRedo} aria-label="Redo">↷ <span>Redo</span></button>
          <button className="toolbar-action" onClick={onClear}>Clear</button>
          <span className="toolbar-divider" />
          <button className="toolbar-action" onClick={onListBoards}>My boards</button>
          <button className="toolbar-action" onClick={onNewBoard}>New board</button>
        </div>
      </div>
    </div>
  );
}
