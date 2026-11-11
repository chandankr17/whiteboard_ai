import { useState, useEffect, useCallback } from "react";
import api from "../api/api";

export default function BoardList({ onLoad, currentBoardId, isOpen, onClose }) {
    const [boards, setBoards] = useState([]);
    const [error, setError] = useState("");

    const loadBoards = useCallback(async () => {
        try {
            const res = await api.get("/boards/load");
            setBoards(res.data);
            setError("");
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.error || "Unable to load your boards.");
        }
    }, []);

    useEffect(() => {
        if (isOpen) {
            // The async request populates the list after the panel opens.
            // eslint-disable-next-line react-hooks/set-state-in-effect
            loadBoards();
        }
    }, [isOpen, loadBoards]);

    const handleSelect = async (boardId) => {
        try {
            const res = await api.get(`/boards/${boardId}`);
            onLoad(res.data);
            onClose();
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.error || "Unable to open this board.");
        }
    };

    if (!isOpen) return null;

    return (
        <div className="board-list-panel">
            <div className="board-list-header">
                <h3>My Boards</h3>
                <button onClick={onClose} aria-label="Close boards list">×</button>
            </div>

            {error && <p className="board-list-error" role="alert">{error}</p>}
            {!error && boards.length === 0 ? <p className="board-list-empty">No saved boards.</p> : (
                <ul className="board-list-items">
                    {!error && boards.map((b) => (
                        <li
                            key={b._id}
                            onClick={() => handleSelect(b._id)}
                            className={`board-list-item ${b._id === currentBoardId ? "is-current" : ""}`}
                        >
                            <strong>{b.title}</strong>
                            <div className="board-list-date">
                                {new Date(b.updatedAt).toLocaleDateString()}
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
