import jwt from "jsonwebtoken";
import { Server } from "socket.io";
import mongoose from "mongoose";
import Board from "./models/board.js";
import { hasBoardAccess } from "./services/boardAccess.js";

const roomForBoard = (boardId) => `board:${boardId}`;
const pendingWrites = new Map();
const MAX_BOARD_DATA_BYTES = 8 * 1024 * 1024;
const itemTypes = ["lines", "shapes", "texts", "images"];
const normalizePage = (page, index) => {
  const pageId = page.id || `page-${index + 1}`;
  let changed = pageId !== page.id;
  const normalized = {
    ...page,
    id: pageId,
    title: page.title || `Page ${index + 1}`,
    format: page.format || "freeform",
  };

  for (const type of itemTypes) {
    const items = Array.isArray(page[type]) ? page[type] : [];
    normalized[type] = items.map((item, itemIndex) => {
      if (item.id) return item;
      changed = true;
      return { ...item, id: `${pageId}-${type}-${itemIndex}` };
    });
    if (!Array.isArray(page[type])) changed = true;
  }
  return { page: normalized, changed };
};

const normalizeBoardData = (data) => {
  if (Array.isArray(data?.pages) && data.pages.length > 0) {
    let changed = false;
    const pages = data.pages.map((page, index) => {
      const normalized = normalizePage(page, index);
      changed ||= normalized.changed;
      return normalized.page;
    });
    return changed ? { ...data, pages } : data;
  }

  const firstPage = {
    ...(data || {}),
    id: "page-1",
    title: "Page 1",
    format: data?.format || "freeform",
    lines: Array.isArray(data?.lines) ? data.lines : [],
    shapes: Array.isArray(data?.shapes) ? data.shapes : [],
    texts: Array.isArray(data?.texts) ? data.texts : [],
    images: Array.isArray(data?.images) ? data.images : [],
  };
  for (const type of itemTypes) {
    firstPage[type] = firstPage[type].map((item, index) => ({
      ...item,
      id: item.id || `${firstPage.id}-${type}-${index}`,
    }));
  }
  return { pages: [firstPage], activePageId: firstPage.id };
};

const mergePageUpdate = (currentPage, incomingPage, removedIds = {}) => {
  const mergedPage = { ...currentPage, ...incomingPage, id: currentPage.id };
  for (const type of itemTypes) {
    const removed = new Set(Array.isArray(removedIds[type]) ? removedIds[type] : []);
    const itemsById = new Map(
      (currentPage[type] || []).map((item, index) => [
        item.id || `${currentPage.id}-${type}-${index}`,
        item,
      ])
    );
    for (const id of removed) itemsById.delete(id);
    (incomingPage[type] || []).forEach((item, index) => {
      const id = item.id || `${currentPage.id}-${type}-${index}`;
      itemsById.set(id, { ...item, id });
    });
    mergedPage[type] = [...itemsById.values()];
  }
  return mergedPage;
};

const authorizeBoard = async (boardId, userId, shareToken) => {
  if (!mongoose.Types.ObjectId.isValid(boardId)) return null;
  const board = await Board.findById(boardId).select("+shareTokenHash");
  if (!board || !hasBoardAccess(board, userId, shareToken)) return null;
  return board;
};

const queueBoardWrite = (boardId, update) => {
  const previousWrite = pendingWrites.get(boardId) || Promise.resolve();
  const nextWrite = previousWrite
    .catch((error) => console.error("Previous board sync failed:", error))
    .then(update);
  pendingWrites.set(boardId, nextWrite);
  nextWrite.finally(() => {
    if (pendingWrites.get(boardId) === nextWrite) pendingWrites.delete(boardId);
  }).catch((error) => console.error("Board sync failed:", error));
  return nextWrite;
};

const broadcastPresence = async (io, boardId) => {
  const sockets = await io.in(roomForBoard(boardId)).fetchSockets();
  io.to(roomForBoard(boardId)).emit("board:presence", { count: sockets.length });
};

export const revokeInviteSessions = async (io, boardId) => {
  const room = roomForBoard(boardId);
  const sockets = await io.in(room).fetchSockets();
  for (const socket of sockets) {
    if (socket.data.isBoardOwner) continue;
    socket.emit("board:error", { message: "The board owner replaced this invite link." });
    await socket.leave(room);
    socket.data.boardId = null;
  }
  await broadcastPresence(io, boardId);
};

export const closeBoardRoom = async (io, boardId) => {
  const room = roomForBoard(boardId);
  const sockets = await io.in(room).fetchSockets();
  for (const socket of sockets) {
    socket.emit("board:error", { message: "This board has been deleted." });
    await socket.leave(room);
    socket.data.boardId = null;
  }
};

export const attachSocketServer = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_ORIGIN || "http://localhost:5173",
      methods: ["GET", "POST"],
    },
  });

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (typeof token !== "string" || !token) {
        return next(new Error("Authentication required"));
      }

      const user = jwt.verify(token, process.env.JWT_SECRET);
      socket.data.userId = user.id;
      next();
    } catch {
      next(new Error("Invalid authentication token"));
    }
  });

  io.on("connection", (socket) => {
    socket.on("board:join", async ({ boardId, shareToken } = {}, acknowledge = () => {}) => {
      try {
        const board = await authorizeBoard(boardId, socket.data.userId, shareToken);
        if (!board) {
          acknowledge({ error: "You do not have access to this board." });
          return;
        }
        const document = normalizeBoardData(board.data);
        if (document !== board.data) {
          board.data = document;
          await board.save();
        }

        if (socket.data.boardId) {
          const previousBoardId = socket.data.boardId;
          await socket.leave(roomForBoard(previousBoardId));
          await broadcastPresence(io, previousBoardId);
        }

        socket.data.boardId = boardId;
        socket.data.shareToken = shareToken;
        socket.data.isBoardOwner = board.user.toString() === socket.data.userId;
        await socket.join(roomForBoard(boardId));
        acknowledge({
          boardId,
          title: board.title,
          boardData: document,
          isOwner: socket.data.isBoardOwner,
        });
        await broadcastPresence(io, boardId);
      } catch (error) {
        console.error("Board room join failed:", error);
        acknowledge({ error: "Unable to join this board right now." });
      }
    });

    socket.on("board:page-update", async ({ pageId, pageData, removedIds } = {}) => {
      const boardId = socket.data.boardId;
      if (!boardId || typeof pageId !== "string" || !pageData || typeof pageData !== "object") return;
      if (Buffer.byteLength(JSON.stringify({ pageData, removedIds }), "utf8") > MAX_BOARD_DATA_BYTES) {
        socket.emit("board:error", { message: "This page is too large to synchronize." });
        return;
      }

      try {
        const authorized = await authorizeBoard(boardId, socket.data.userId, socket.data.shareToken);
        if (!authorized) {
          socket.emit("board:error", { message: "Your board access has expired." });
          await socket.leave(roomForBoard(boardId));
          socket.data.boardId = null;
          await broadcastPresence(io, boardId);
          return;
        }

        const mergedPage = await queueBoardWrite(boardId, async () => {
          const board = await Board.findById(boardId);
          if (!board || !Array.isArray(board.data?.pages)) {
            throw new Error("Page-based board data was not found");
          }
          const pageIndex = board.data.pages.findIndex((page) => page.id === pageId);
          if (pageIndex < 0) throw new Error("Page does not exist on this board");
          const currentPage = normalizePage(board.data.pages[pageIndex], pageIndex).page;
          const nextPage = mergePageUpdate(currentPage, pageData, removedIds);
          board.data.pages[pageIndex] = nextPage;
          board.markModified("data");
          await board.save();
          return nextPage;
        });

        socket.to(roomForBoard(boardId)).emit("board:page-update", {
          pageId,
          pageData: mergedPage,
          removedIds,
          updatedBy: socket.data.userId,
        });
      } catch (error) {
        console.error("Live page sync failed:", error);
        socket.emit("board:error", { message: "A page change could not be synchronized." });
      }
    });

    socket.on("board:document-operation", async ({ operation } = {}) => {
      const boardId = socket.data.boardId;
      if (!boardId || !operation || typeof operation !== "object") return;
      const validFormats = ["freeform", "a4-portrait", "a4-landscape"];
      const isAddPage = operation.type === "add-page"
        && operation.page
        && typeof operation.page.id === "string"
        && operation.page.id.length <= 100
        && typeof operation.page.title === "string"
        && validFormats.includes(operation.page.format)
        && ["lines", "shapes", "texts", "images"].every((key) => Array.isArray(operation.page[key]));
      const isRemovePage = operation.type === "remove-page" && typeof operation.pageId === "string";
      const isSetFormat = operation.type === "set-format"
        && typeof operation.pageId === "string"
        && validFormats.includes(operation.format);
      if (!isAddPage && !isRemovePage && !isSetFormat) return;
      if (Buffer.byteLength(JSON.stringify(operation), "utf8") > MAX_BOARD_DATA_BYTES) {
        socket.emit("board:error", { message: "This document change is too large to synchronize." });
        return;
      }

      try {
        const authorized = await authorizeBoard(boardId, socket.data.userId, socket.data.shareToken);
        if (!authorized) {
          socket.emit("board:error", { message: "Your board access has expired." });
          await socket.leave(roomForBoard(boardId));
          socket.data.boardId = null;
          await broadcastPresence(io, boardId);
          return;
        }

        await queueBoardWrite(boardId, async () => {
          const board = await Board.findById(boardId);
          if (!board || !Array.isArray(board.data?.pages)) {
            throw new Error("Page-based board data was not found");
          }

          if (isAddPage) {
            if (board.data.pages.some((page) => page.id === operation.page.id)) return;
            board.data.pages.push(operation.page);
          } else if (isRemovePage) {
            if (board.data.pages.length < 2) {
              socket.emit("board:error", { message: "A board must keep at least one page." });
              return;
            }
            const remainingPages = board.data.pages.filter((page) => page.id !== operation.pageId);
            if (remainingPages.length === board.data.pages.length) return;
            board.data.pages = remainingPages;
          } else {
            const page = board.data.pages.find((item) => item.id === operation.pageId);
            if (!page) return;
            page.format = operation.format;
          }

          board.markModified("data");
          await board.save();
        });
        socket.to(roomForBoard(boardId)).emit("board:document-operation", { operation });
      } catch (error) {
        console.error("Live document sync failed:", error);
        socket.emit("board:error", { message: "A document change could not be synchronized." });
      }
    });

    socket.on("disconnect", () => {
      if (socket.data.boardId) {
        broadcastPresence(io, socket.data.boardId)
          .catch((error) => console.error("Board presence update failed:", error));
      }
    });
  });

  return io;
};
