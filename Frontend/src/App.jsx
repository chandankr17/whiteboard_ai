import { useState, useEffect } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import Whiteboard from "./components/Whiteboard";
import Toolbar from "./components/Toolbar";
import AISuggestions from "./components/AISuggestions";
import Login from "./components/login";
import Signup from "./components/Signup";
import BoardList from "./components/BoardList";
import api from "./api/api";

function App() {
  const [token, setToken] = useState(localStorage.getItem("token"));
  const navigate = useNavigate();

  const [tool, setTool] = useState("pen");
  const [shapeType, setShapeType] = useState("rectangle");
  const [color, setColor] = useState("#ff0000");
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [boardData, setBoardData] = useState(null);

  const [boardId, setBoardId] = useState(null);
  const [boardTitle, setBoardTitle] = useState("Untitled Board");
  const [isBoardListOpen, setIsBoardListOpen] = useState(false);

  const [undoTrigger, setUndoTrigger] = useState(0);
  const [redoTrigger, setRedoTrigger] = useState(0);
  const [clearTrigger, setClearTrigger] = useState(0);

  const handleLogin = (newToken) => {
    setToken(newToken);
    navigate("/");
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setBoardId(null);
    setBoardTitle("Untitled Board");
    setBoardData(null);
    navigate("/login");
  };

  const handleSave = async () => {
    if (!boardData || (boardData.lines.length === 0 && boardData.shapes.length === 0 && boardData.texts.length === 0)) {
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

  const handleNewPage = () => {
    if (confirm("Are you sure? Unsaved changes will be lost.")) {
      setBoardId(null);
      setBoardTitle("Untitled Board");
      setClearTrigger(prev => prev + 1);
      setBoardData(null);
    }
  };

  const handleLoadBoard = (board) => {
    setBoardId(board._id);
    setBoardTitle(board.title);
    setBoardData(board.data);
  };

  return (
    <Routes>
      <Route path="/login" element={!token ? <Login onLogin={handleLogin} /> : <Navigate to="/" />} />
      <Route path="/signup" element={!token ? <Signup onLogin={handleLogin} /> : <Navigate to="/" />} />
      <Route
        path="/"
        element={
          token ? (
            <div style={{ display: "flex", height: "100vh", background: "#f0f4f8" }}>
              <BoardList
                isOpen={isBoardListOpen}
                onClose={() => setIsBoardListOpen(false)}
                onLoad={handleLoadBoard}
                currentBoardId={boardId}
              />

              <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                <Toolbar
                  tool={tool} setTool={setTool}
                  color={color} setColor={setColor}
                  strokeWidth={strokeWidth} setStrokeWidth={setStrokeWidth}
                  shapeType={shapeType} setShapeType={setShapeType}
                  onUndo={() => setUndoTrigger((prev) => prev + 1)}
                  onRedo={() => setRedoTrigger((prev) => prev + 1)}
                  onClear={() => setClearTrigger((prev) => prev + 1)}
                  onSave={handleSave}
                  onNewPage={handleNewPage}
                  onListBoards={() => setIsBoardListOpen(true)}
                  onLogout={handleLogout}
                />

                <div style={{ flex: 1, margin: "10px", border: "2px solid #1e40af", borderRadius: "10px", overflow: "hidden", background: "#ffffff", position: "relative" }}>

                  <Whiteboard
                    key={boardId || "new"}
                    initialData={boardData}
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

              <div style={{ width: "20%", borderLeft: "2px solid #1e40af", background: "#e0e7ff", padding: "10px", overflowY: "auto" }}>
                <h3 style={{ textAlign: "center", color: "#1e3a8a" }}>AI Suggestions</h3>
                <AISuggestions boardData={boardData} />
              </div>
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
