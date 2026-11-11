import { useCallback, useEffect, useRef, useState } from "react";
import { Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import Whiteboard from "./components/Whiteboard";
import Toolbar from "./components/Toolbar";
import AISuggestions from "./components/AISuggestions";
import Login from "./components/login";
import Signup from "./components/Signup";
import BoardList from "./components/BoardList";
import api from "./api/api";
import socket from "./socket";

const createPage = (number) => ({
  id: `page-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  title: `Page ${number}`,
  format: "a4-portrait",
  lines: [],
  shapes: [],
  texts: [],
  images: [],
});

const normalizePageItems = (page) => {
  const normalized = { ...page };
  for (const collection of ["lines", "shapes", "texts", "images"]) {
    normalized[collection] = (page[collection] || []).map((item, index) => ({
      ...item,
      id: item.id || `${page.id}-${collection}-${index}`,
    }));
  }
  return normalized;
};

const getRemovedItems = (previousPage, nextPage) => Object.fromEntries(
  ["lines", "shapes", "texts", "images"].map((collection) => {
    const nextIds = new Set((nextPage[collection] || []).map((item, index) =>
      item.id || `${nextPage.id}-${collection}-${index}`
    ));
    return [
      collection,
      (previousPage?.[collection] || [])
        .map((item, index) => item.id || `${nextPage.id}-${collection}-${index}`)
        .filter((id) => !nextIds.has(id)),
    ];
  })
);

const mergePendingPageChanges = (serverPage, localPage, removedIds = {}) => {
  const mergedPage = { ...serverPage, ...localPage, id: serverPage.id };
  for (const collection of ["lines", "shapes", "texts", "images"]) {
    const itemsById = new Map(
      (serverPage[collection] || []).map((item, index) => [
        item.id || `${serverPage.id}-${collection}-${index}`,
        item,
      ])
    );
    for (const id of removedIds[collection] || []) itemsById.delete(id);
    (localPage[collection] || []).forEach((item, index) => {
      const id = item.id || `${serverPage.id}-${collection}-${index}`;
      itemsById.set(id, { ...item, id });
    });
    mergedPage[collection] = [...itemsById.values()];
  }
  return mergedPage;
};

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
    })).map(normalizePageItems);
    const activePageId = pages.some((page) => page.id === data.activePageId)
      ? data.activePageId
      : pages[0].id;
    return { pages, activePageId };
  }

  const firstPage = normalizePageItems({
    ...createPage(1),
    ...(data || {}),
    id: "page-1",
    title: "Page 1",
    format: data?.format || (data ? "freeform" : "a4-portrait"),
    lines: data?.lines || [],
    shapes: data?.shapes || [],
    texts: data?.texts || [],
    images: data?.images || [],
  });
  return { pages: [firstPage], activePageId: firstPage.id };
};

function App() {
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [theme, setTheme] = useState(() =>
    localStorage.getItem("workspace-theme") === "dark" ? "dark" : "light"
  );
  const navigate = useNavigate();
  const location = useLocation();

  const [tool, setTool] = useState("pen");
  const [drawMode, setDrawMode] = useState(false);
  const [shapeType, setShapeType] = useState("rectangle");
  const [color, setColor] = useState("#ff0000");
  const [textFontSize, setTextFontSize] = useState(18);
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [boardData, setBoardData] = useState(() => createBoardDocument());
  const [imageToAdd, setImageToAdd] = useState(null);

  const [boardId, setBoardId] = useState(null);
  const [shareToken, setShareToken] = useState(null);
  const [isBoardOwner, setIsBoardOwner] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState("idle");
  const [collaboratorCount, setCollaboratorCount] = useState(0);
  const [collaborationError, setCollaborationError] = useState("");
  const [remoteUpdate, setRemoteUpdate] = useState(null);
  const [documentVersion, setDocumentVersion] = useState(0);
  const [boardTitle, setBoardTitle] = useState("Untitled Board");
  const [isBoardListOpen, setIsBoardListOpen] = useState(false);

  const [undoTrigger, setUndoTrigger] = useState({ pageId: null, version: 0 });
  const [redoTrigger, setRedoTrigger] = useState({ pageId: null, version: 0 });
  const [clearTrigger, setClearTrigger] = useState({ pageId: null, version: 0 });
  const [pageZoom, setPageZoom] = useState(100);
  const joinedBoardId = useRef(null);
  const remoteUpdateVersion = useRef(0);
  const pageUpdateTimers = useRef(new Map());
  const pageSnapshots = useRef(new Map());
  const activePage = boardData.pages.find((page) => page.id === boardData.activePageId) || boardData.pages[0];
  const rememberDocumentPages = (document) => {
    pageSnapshots.current.clear();
    document.pages.forEach((page) => pageSnapshots.current.set(page.id, page));
  };

  const handleLogin = (newToken) => {
    setToken(newToken);
    const pendingInvite = sessionStorage.getItem("pending-board-invite");
    sessionStorage.removeItem("pending-board-invite");
    navigate(pendingInvite || "/");
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setBoardId(null);
    setShareToken(null);
    setIsBoardOwner(true);
    setBoardTitle("Untitled Board");
    setRemoteUpdate(null);
    const newDocument = createBoardDocument();
    rememberDocumentPages(newDocument);
    setBoardData(newDocument);
    setDocumentVersion((version) => version + 1);
    navigate("/login");
  };

  const handleToggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    localStorage.setItem("workspace-theme", nextTheme);
    setTheme(nextTheme);
  };

  const handleSave = async () => {
    if (!isBoardOwner) return;
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
      setIsBoardOwner(true);
      alert("Board saved successfully!");
    } catch (err) {
      console.error(err);
      alert("Failed to save board");
    }
  };

  const handleNewBoard = () => {
    if (confirm("Are you sure? Unsaved changes will be lost.")) {
      setBoardId(null);
      setShareToken(null);
      setIsBoardOwner(true);
      setBoardTitle("Untitled Board");
      setRemoteUpdate(null);
      const newDocument = createBoardDocument();
      rememberDocumentPages(newDocument);
      setBoardData(newDocument);
    }
  };

  const handleLoadBoard = (board) => {
    setBoardId(board._id);
    setShareToken(null);
    setIsBoardOwner(true);
    setCollaborationError("");
    setBoardTitle(board.title);
    const document = createBoardDocument(board.data);
    setRemoteUpdate(null);
    rememberDocumentPages(document);
    setBoardData(document);
    setDocumentVersion((version) => version + 1);
  };

  const handlePageDataChange = useCallback((pageId, pageData) => {
    if (typeof pageId !== "string" || !pageData || typeof pageData !== "object") {
      console.error("Ignoring invalid whiteboard page update.", { pageId, pageData });
      return;
    }

    const previousPage = pageSnapshots.current.get(pageId);
    const removedIds = getRemovedItems(previousPage, pageData);
    pageSnapshots.current.set(pageId, pageData);
    setBoardData((current) => ({
      ...current,
      pages: current.pages.map((page) =>
        page.id === pageId ? { ...page, ...pageData } : page
      ),
    }));
    const targetBoardId = joinedBoardId.current;
    const previous = pageUpdateTimers.current.get(pageId);
    if (previous) clearTimeout(previous.timer);
    const pendingUpdate = { targetBoardId, pageData, removedIds, timer: null };
    pendingUpdate.timer = setTimeout(() => {
      const update = pageUpdateTimers.current.get(pageId);
      if (targetBoardId && joinedBoardId.current === targetBoardId) {
        socket.emit("board:page-update", {
          pageId,
          pageData: update?.pageData || pageData,
          removedIds: update?.removedIds || removedIds,
        });
      }
      pageUpdateTimers.current.delete(pageId);
    }, 80);
    pageUpdateTimers.current.set(pageId, pendingUpdate);
  }, []);

  const publishDocumentUpdate = (nextDocument, operation) => {
    setBoardData(nextDocument);
    if (joinedBoardId.current) {
      socket.emit("board:document-operation", operation);
    }
  };

  const handleAddPage = () => {
    const newPage = createPage(boardData.pages.length + 1);
    const nextDocument = {
      pages: [...boardData.pages, newPage],
      activePageId: newPage.id,
    };
    publishDocumentUpdate(nextDocument, { type: "add-page", page: newPage });
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
    const pendingPageUpdate = pageUpdateTimers.current.get(pageId);
    if (pendingPageUpdate) {
      clearTimeout(pendingPageUpdate.timer);
      pageUpdateTimers.current.delete(pageId);
    }
    pageSnapshots.current.delete(pageId);

    const pageIndex = boardData.pages.findIndex((page) => page.id === pageId);
    const pages = boardData.pages.filter((page) => page.id !== pageId);
    const nextActivePage = pageId === boardData.activePageId
        ? pages[Math.min(pageIndex, pages.length - 1)]
        : pages.find((page) => page.id === boardData.activePageId);
    publishDocumentUpdate(
      { pages, activePageId: nextActivePage.id },
      { type: "remove-page", pageId }
    );
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
    publishDocumentUpdate({
      ...boardData,
      pages: boardData.pages.map((page) =>
        page.id === boardData.activePageId ? { ...page, format } : page
      ),
    }, { type: "set-format", pageId: boardData.activePageId, format });
  };

  const handleAddImage = (image) => {
    setImageToAdd({
      ...image,
      id: `${image.pageUrl}-${Date.now()}`,
      targetPageId: activePage.id,
    });
  };

  const handleCreateShareLink = async () => {
    if (!boardId || !isBoardOwner) return;
    setCollaborationError("");
    try {
      const response = await api.post(`/boards/${boardId}/share`);
      const inviteUrl = `${window.location.origin}/share/${boardId}/${response.data.shareToken}`;
      try {
        await navigator.clipboard.writeText(inviteUrl);
        alert("Invite link copied. Anyone with this link can edit this board.");
      } catch {
        window.prompt("Copy this invite link. Anyone with the link can edit this board:", inviteUrl);
      }
    } catch (error) {
      console.error("Create board invite failed:", error);
      setCollaborationError(
        error.response?.data?.error || "Could not create or copy the board invite link."
      );
    }
  };

  useEffect(() => {
    const invite = location.pathname.match(/^\/share\/([^/]+)\/([^/]+)$/);
    if (!invite) return undefined;

    if (!token) {
      sessionStorage.setItem("pending-board-invite", location.pathname);
      navigate("/login", { replace: true });
      return undefined;
    }

    let active = true;
    api.get(`/boards/${invite[1]}`, { params: { shareToken: invite[2] } })
      .then((response) => {
        if (!active) return;
        const document = createBoardDocument(response.data.data);
        setCollaborationError("");
        setBoardId(response.data._id);
        setShareToken(invite[2]);
        setIsBoardOwner(Boolean(response.data.isOwner));
        setBoardTitle(response.data.title);
        rememberDocumentPages(document);
        setBoardData(document);
        setDocumentVersion((version) => version + 1);
        navigate("/", { replace: true });
      })
      .catch((error) => {
        if (!active) return;
        console.error("Open shared board failed:", error);
        setCollaborationError(
          error.response?.data?.error || "This invite link is invalid or has expired."
        );
      });

    return () => { active = false; };
  }, [location.pathname, navigate, token]);

  useEffect(() => {
    if (!token || !boardId) {
      joinedBoardId.current = null;
      socket.disconnect();
      return undefined;
    }

    let active = true;
    const scheduledPageUpdates = pageUpdateTimers.current;
    socket.auth = { token };

    const handleConnect = () => {
      setConnectionStatus("joining");
      setCollaborationError("");
      socket.emit("board:join", { boardId, shareToken }, (result) => {
        if (!active) return;
        if (result?.error) {
          joinedBoardId.current = null;
          setConnectionStatus("error");
          setCollaborationError(result.error);
          return;
        }

        joinedBoardId.current = boardId;
        setConnectionStatus("connected");
        setBoardTitle(result.title);
        setIsBoardOwner(Boolean(result.isOwner));
        const document = createBoardDocument(result.boardData);
        rememberDocumentPages(document);
        setRemoteUpdate({
          kind: "document",
          boardData: document,
          version: ++remoteUpdateVersion.current,
        });
        setBoardData(document);
      });
    };
    const handleConnectError = (error) => {
      if (!active) return;
      setConnectionStatus("error");
      setCollaborationError(error.message || "Could not connect to live collaboration.");
    };
    const handleDisconnect = () => {
      joinedBoardId.current = null;
      setConnectionStatus("offline");
      setCollaboratorCount(0);
    };
    const handlePresence = ({ count }) => {
      if (active) setCollaboratorCount(count);
    };
    const handlePageUpdate = ({ pageId, pageData }) => {
      const pendingUpdate = pageUpdateTimers.current.get(pageId);
      const mergedPageData = pendingUpdate
        ? mergePendingPageChanges(pageData, pendingUpdate.pageData, pendingUpdate.removedIds)
        : pageData;
      if (pendingUpdate) pendingUpdate.pageData = mergedPageData;
      pageSnapshots.current.set(pageId, mergedPageData);
      setRemoteUpdate({
        kind: "page",
        pageId,
        pageData: mergedPageData,
        version: ++remoteUpdateVersion.current,
      });
      setBoardData((current) => ({
        ...current,
        pages: current.pages.map((page) =>
          page.id === pageId ? { ...page, ...mergedPageData } : page
        ),
      }));
    };
    const handleDocumentOperation = ({ operation } = {}) => {
      if (!operation) return;
      setBoardData((current) => {
        if (operation.type === "add-page") {
          if (current.pages.some((page) => page.id === operation.page?.id)) return current;
          return { ...current, pages: [...current.pages, operation.page] };
        }
        if (operation.type === "remove-page") {
          const removedIndex = current.pages.findIndex((page) => page.id === operation.pageId);
          if (removedIndex < 0 || current.pages.length < 2) return current;
          pageSnapshots.current.delete(operation.pageId);
          const pages = current.pages.filter((page) => page.id !== operation.pageId);
          const activePageId = current.activePageId === operation.pageId
            ? pages[Math.min(removedIndex, pages.length - 1)].id
            : current.activePageId;
          return { pages, activePageId };
        }
        if (operation.type === "set-format") {
          return {
            ...current,
            pages: current.pages.map((page) =>
              page.id === operation.pageId ? { ...page, format: operation.format } : page
            ),
          };
        }
        return current;
      });
    };
    const handleBoardError = ({ message }) => {
      if (active) {
        setConnectionStatus("error");
        setCollaborationError(message);
      }
    };

    socket.on("connect", handleConnect);
    socket.on("connect_error", handleConnectError);
    socket.on("disconnect", handleDisconnect);
    socket.on("board:presence", handlePresence);
    socket.on("board:page-update", handlePageUpdate);
    socket.on("board:document-operation", handleDocumentOperation);
    socket.on("board:error", handleBoardError);

    socket.disconnect();
    socket.connect();

    return () => {
      active = false;
      joinedBoardId.current = null;
      socket.off("connect", handleConnect);
      socket.off("connect_error", handleConnectError);
      socket.off("disconnect", handleDisconnect);
      socket.off("board:presence", handlePresence);
      socket.off("board:page-update", handlePageUpdate);
      socket.off("board:document-operation", handleDocumentOperation);
      socket.off("board:error", handleBoardError);
      socket.disconnect();
      for (const { timer } of scheduledPageUpdates.values()) clearTimeout(timer);
      scheduledPageUpdates.clear();
    };
  }, [boardId, shareToken, token]);

  const collaborationLabel = !boardId
    ? "Not saved"
    : connectionStatus === "connected"
      ? `${collaboratorCount} online · live`
      : connectionStatus === "joining" || connectionStatus === "connecting"
        ? "Connecting…"
        : connectionStatus === "idle" ? "Connecting…"
        : connectionStatus === "error" ? "Collaboration unavailable" : "Offline";

  const workspace = token ? (
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
                    {collaborationError && (
                      <p className="collaboration-error" role="alert">{collaborationError}</p>
                    )}
                  </div>
                  <div className="board-heading-actions">
                    <span className={`board-status is-${connectionStatus}`}>
                      {collaborationLabel}
                    </span>
                    {boardId && isBoardOwner && (
                      <button className="board-share-button" onClick={handleCreateShareLink}>
                        Share
                      </button>
                    )}
                    <button
                      className="board-save-button"
                      onClick={handleSave}
                      disabled={Boolean(boardId && !isBoardOwner)}
                      title={isBoardOwner ? "Save board" : "Changes are saved automatically while connected"}
                    >
                      {isBoardOwner ? "Save board" : "Live saved"}
                    </button>
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
                            remoteUpdate={remoteUpdate}
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
          ) : <Navigate to="/login" />;

  return (
    <Routes>
      <Route path="/login" element={!token ? <Login onLogin={handleLogin} /> : <Navigate to="/" />} />
      <Route path="/signup" element={!token ? <Signup onLogin={handleLogin} /> : <Navigate to="/" />} />
      <Route path="/" element={workspace} />
      <Route path="/share/:boardId/:shareToken" element={workspace} />
    </Routes>
  );
}

export default App;
