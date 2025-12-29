
import { useState, useEffect } from "react";
import api from "../api/api";

export default function BoardList({ onLoad, currentBoardId, isOpen, onClose }) {
    const [boards, setBoards] = useState([]);

    useEffect(() => {
        if (isOpen) {
            loadBoards();
        }
    }, [isOpen]);

    const loadBoards = async () => {
        try {
            const res = await api.get("/boards/load");
            setBoards(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    const handleSelect = async (boardId) => {
        try {
            const res = await api.get(`/boards/${boardId}`);
            onLoad(res.data);
            onClose();
        } catch (err) {
            console.error(err);
        }
    };

    if (!isOpen) return null;

    return (
        <div style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "300px",
            height: "100%",
            background: "#fff",
            boxShadow: "2px 0 5px rgba(0,0,0,0.2)",
            zIndex: 1000,
            overflowY: "auto",
            padding: "20px",
            display: "flex",
            flexDirection: "column"
        }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                <h3>My Boards</h3>
                <button onClick={onClose} style={{ cursor: "pointer", border: "none", background: "none", fontSize: "16px" }}>❌</button>
            </div>

            {boards.length === 0 ? <p>No saved boards.</p> : (
                <ul style={{ listStyle: "none", padding: 0 }}>
                    {boards.map((b) => (
                        <li
                            key={b._id}
                            onClick={() => handleSelect(b._id)}
                            style={{
                                padding: "10px",
                                marginBottom: "10px",
                                background: b._id === currentBoardId ? "#dbeafe" : "#f3f4f6",
                                cursor: "pointer",
                                borderRadius: "5px",
                                border: b._id === currentBoardId ? "1px solid #2563eb" : "1px solid transparent"
                            }}
                        >
                            <strong>{b.title}</strong>
                            <div style={{ fontSize: "12px", color: "gray" }}>
                                {new Date(b.updatedAt).toLocaleDateString()}
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
