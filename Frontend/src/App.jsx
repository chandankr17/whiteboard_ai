import { useCallback, useState } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import Whiteboard from "./components/Whiteboard";
import Toolbar from "./components/Toolbar";
import AISuggestions from "./components/AISuggestions";
import Login from "./components/login";
import Signup from "./components/Signup";
import BoardList from "./components/BoardList";
import api from "./api/api";

const createPage = (number) => ({
  id: `page-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  title: `Page ${number}`,
  format: "a4-portrait",
  lines: [],
  shapes: [],
  texts: [],
  images: [],
});

const createBoardDocument = (data) => {
  if (Array.isArray(data?.pages) && data.pages.length > 0) {
    const pages = data.pages.map((page, index) => ({
      ...page,
      id: page.id || `page-${index + 1}`,
      title: page.title || `Page ${index + 1}`,
      format: page.format || "freeform",
      lines: page.lines || [],
      shapes: page.shapes || [],
      texts: page.texts || [],
      images: page.images || [],
    }));
    const activePageId = pages.some((page) => page.id === data.activePageId)
      ? data.activePageId
      : pages[0].id;
    return { pages, activePageId };
  }

  const firstPage = {
    ...createPage(1),
    ...(data || {}),
    id: "page-1",
    title: "Page 1",
    format: data?.format || (data ? "freeform" : "a4-portrait"),
    lines: data?.lines || [],
    shapes: data?.shapes || [],
    texts: data?.texts || [],
    images: data?.images || [],
  };
  return { pages: [firstPage], activePageId: firstPage.id };
};

function App() {
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [theme, setTheme] = useState(() =>
    localStorage.getItem("workspace-theme") === "dark" ? "dark" : "light"
  );
  const navigate = useNavigate();

  const [tool, setTool] = useState("pen");
  const [drawMode, setDrawMode] = useState(false);
  const [shapeType, setShapeType] = useState("rectangle");
  const [color, setColor] = useState("#ff0000");
  const [textFontSize, setTextFontSize] = useState(18);
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [boardData, setBoardData] = useState(() => createBoardDocument());
  const [imageToAdd, setImageToAdd] = useState(null);

  const [boardId, setBoardId] = useState(null);
  const [documentVersion, setDocumentVersion] = useState(0);
  const [boardTitle, setBoardTitle] = useState("Untitled Board");
  const [isBoardListOpen, setIsBoardListOpen] = useState(false);

  const [undoTrigger, setUndoTrigger] = useState({ pageId: null, version: 0 });
  const [redoTrigger, setRedoTrigger] = useState({ pageId: null, version: 0 });
  const [clearTrigger, setClearTrigger] = useState({ pageId: null, version: 0 });
  const [pageZoom, setPageZoom] = useState(100);
  const activePage = boardData.pages.find((page) => page.id === boardData.activePageId) || boardData.pages[0];

  const handleLogin = (newToken) => {
    setToken(newToken);
    navigate("/");
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setBoardId(null);
    setBoardTitle("Untitled Board");
    setBoardData(createBoardDocument());
    setDocumentVersion((version) => version + 1);
    navigate("/login");
  };

  const handleToggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    localStorage.setItem("workspace-theme", nextTheme);
    setTheme(nextTheme);
  };

  const handleSave = async () => {
    const hasContent = boardData.pages.some((page) =>
      page.lines.length > 0 ||
      page.shapes.length > 0 ||
      page.texts.length > 0 ||
      page.images.length > 0
    );
    if (!hasContent) {
      return alert("Nothing to save!");
    }

    let titleToSave = boardTitle;
    if (!boardId) {
      const userTitle = prompt("Enter a name for this board:", boardTitle);
      if (userTitle === null) return; // Cancelled
      titleToSave = userTitle || "Untitled Board";
      setBoardTitle(titleToSave);
    }

    try {
      const res = await api.post("/boards/save", {
        id: boardId,
        title: titleToSave,
        boardData
      });
      setBoardId(res.data._id);
      alert("Board saved successfully!");
    } catch (err) {
      console.error(err);
      alert("Failed to save board");
    }
  };

  const handleNewBoard = () => {
    if (confirm("Are you sure? Unsaved changes will be lost.")) {
      setBoardId(null);
      setBoardTitle("Untitled Board");
      setBoardData(createBoardDocument());
    }
  };

  const handleLoadBoard = (board) => {
    setBoardId(board._id);
    setBoardTitle(board.title);
    setBoardData(createBoardDocument(board.data));
    setDocumentVersion((version) => version + 1);
  };

  const handlePageDataChange = useCallback((pageId, pageData) => {
    setBoardData((current) => ({
      ...current,
      pages: current.pages.map((page) =>
        page.id === pageId ? { ...page, ...pageData } : page
      ),
    }));
  }, []);

  const handleAddPage = () => {
    const newPage = createPage(boardData.pages.length + 1);
    setBoardData((current) => {
      return {
        pages: [...current.pages, newPage],
        activePageId: newPage.id,
      };
    });
    requestAnimationFrame(() => {
      document.getElementById(`document-page-${newPage.id}`)?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  };

  const handleSelectPage = (pageId) => {
    setBoardData((current) => ({ ...current, activePageId: pageId }));
    requestAnimationFrame(() => {
      document.getElementById(`document-page-${pageId}`)?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  };

  const handleRemovePage = (pageId) => {
    if (boardData.pages.length < 2) {
      alert("A board must have at least one page.");
      return;
    }

    const pageToRemove = boardData.pages.find((page) => page.id === pageId);
    if (!confirm(`Remove ${pageToRemove?.title || "this page"}? This cannot be undone.`)) return;

    setBoardData((current) => {
      const pageIndex = current.pages.findIndex((page) => page.id === pageId);
      const pages = current.pages.filter((page) => page.id !== pageId);
      const nextActivePage = pageId === current.activePageId
        ? pages[Math.min(pageIndex, pages.length - 1)]
        : pages.find((page) => page.id === current.activePageId);
      return { pages, activePageId: nextActivePage.id };
    });
  };

  const handleUndo = () => {
    setUndoTrigger((current) => ({ pageId: activePage.id, version: current.version + 1 }));
  };

  const handleRedo = () => {
    setRedoTrigger((current) => ({ pageId: activePage.id, version: current.version + 1 }));
  };

  const handleClear = () => {
    setClearTrigger((current) => ({ pageId: activePage.id, version: current.version + 1 }));
  };

  const handlePageFormatChange = (event) => {
    const format = event.target.value;
    setBoardData((current) => ({
      ...current,
      pages: current.pages.map((page) =>
        page.id === current.activePageId ? { ...page, format } : page
      ),
    }));
  };

  const handleAddImage = (image) => {
    setImageToAdd({
      ...image,
      id: `${image.pageUrl}-${Date.now()}`,
      targetPageId: activePage.id,
    });
  };

  return (
    <Routes>
      <Route path="/login" element={!token ? <Login onLogin={handleLogin} /> : <Navigate to="/" />} />
      <Route path="/signup" element={!token ? <Signup onLogin={handleLogin} /> : <Navigate to="/" />} />
      <Route
        path="/"
        element={
          token ? (
            <div className="workspace" data-theme={theme}>
              <BoardList
                isOpen={isBoardListOpen}
                onClose={() => setIsBoardListOpen(false)}
                onLoad={handleLoadBoard}
                currentBoardId={boardId}
              />

              <main className="workspace-main">
                <Toolbar
                  tool={tool} setTool={setTool}
                  color={color} setColor={setColor}
                  textFontSize={textFontSize} setTextFontSize={setTextFontSize}
                  strokeWidth={strokeWidth} setStrokeWidth={setStrokeWidth}
                  shapeType={shapeType} setShapeType={setShapeType}
                  onUndo={handleUndo}
                  onRedo={handleRedo}
                  onClear={handleClear}
                  drawMode={drawMode}
                  onSelectTextMode={() => setDrawMode(false)}
                  onSelectDrawMode={() => setDrawMode(true)}
                  onNewBoard={handleNewBoard}
                  onListBoards={() => setIsBoardListOpen(true)}
                  onLogout={handleLogout}
                  theme={theme}
                  onToggleTheme={handleToggleTheme}
                />

                <header className="board-heading">
                  <div>
                    <h1>{boardTitle}</h1>
                    <p>{drawMode ? "Choose a drawing tool, then sketch on the page" : "Click anywhere on a page to type"}</p>
                  </div>
                  <div className="board-heading-actions">
                    <span className="board-status">Workspace ready</span>
                    <button className="board-save-button" onClick={handleSave}>Save board</button>
                  </div>
                </header>

                <nav className="board-pagebar" aria-label="Whiteboard pages">
                  <div className="board-page-tabs">
                    {boardData.pages.map((page, index) => (
                      <span className={`board-page-tab-group ${page.id === activePage.id ? "is-active" : ""}`} key={page.id}>
                        <button
                          type="button"
                          className={`board-page-tab ${page.id === activePage.id ? "is-active" : ""}`}
                          onClick={() => handleSelectPage(page.id)}
                          aria-current={page.id === activePage.id ? "page" : undefined}
                        >
                          {page.title || `Page ${index + 1}`}
                        </button>
                        <button
                          type="button"
                          className="board-page-remove"
                          onClick={() => handleRemovePage(page.id)}
                          aria-label={`Remove ${page.title || `Page ${index + 1}`}`}
                          title={`Remove ${page.title || `Page ${index + 1}`}`}
                          disabled={boardData.pages.length < 2}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                    <button className="board-add-page" onClick={handleAddPage}>+ Add page</button>
                  </div>
                  <label className="page-format-select">
                    <span className="sr-only">Page size and orientation</span>
                    <select value={activePage.format} onChange={handlePageFormatChange}>
                      <option value="freeform">Free canvas</option>
                      <option value="a4-portrait">A4 Portrait</option>
                      <option value="a4-landscape">A4 Landscape</option>
                    </select>
                  </label>
                  <label className="page-zoom-select">
                    <span className="sr-only">Page zoom</span>
                    <span className="page-zoom-label" aria-hidden="true">Zoom</span>
                    <select value={pageZoom} onChange={(event) => setPageZoom(Number(event.target.value))}>
                      <option value={50}>50%</option>
                      <option value={75}>75%</option>
                      <option value={100}>100%</option>
                    </select>
                  </label>
                </nav>

                <section className="canvas-shell" aria-label="Whiteboard document">
                  <div className="document-pages">
                    <div
                      className="document-pages-content"
                      style={{
                        zoom: pageZoom / 100,
                        width: `${10000 / pageZoom}%`,
                      }}
                    >
                      {boardData.pages.map((page, index) => (
                        <article
                          key={`${boardId || "new"}-${documentVersion}-${page.id}`}
                          id={`document-page-${page.id}`}
                          className={`document-page ${page.format === "freeform" ? "is-freeform" : page.format}`}
                          aria-label={page.title || `Page ${index + 1}`}
                        >
                          <div className="document-page-label">
                            {page.title || `Page ${index + 1}`}
                            {page.id === activePage.id && <span>Current page</span>}
                          </div>
                          <Whiteboard
                            pageId={page.id}
                            pageZoom={pageZoom / 100}
                            initialData={page}
                            pageFormat={page.format}
                            imageToAdd={imageToAdd}
                            onImageAdded={() => setImageToAdd(null)}
                            tool={drawMode ? tool : "text"}
                            shapeType={shapeType}
                            color={color}
                            textFontSize={textFontSize}
                            strokeWidth={strokeWidth}
                            onChange={handlePageDataChange}
                            undoTrigger={undoTrigger}
                            redoTrigger={redoTrigger}
                            clearTrigger={clearTrigger}
                          />
                        </article>
                      ))}
                    </div>
                  </div>
                </section>
              </main>

              <aside className="ai-panel" aria-label="AI image suggestions">
                <div className="ai-panel-header">
                  <h2>Image suggestions</h2>
                  <p>Discover real images related to what you sketch on the board.</p>
                </div>
                <div className="ai-panel-content">
                  <AISuggestions onAddImage={handleAddImage} />
                </div>
              </aside>
            </div>
          ) : (
            <Navigate to="/login" />
          )
        }
      />
    </Routes>
  );
}

export default App;
