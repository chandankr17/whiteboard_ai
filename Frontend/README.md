# Whiteboard AI Frontend

The frontend is a React single-page application for creating and editing multi-page whiteboards. It communicates with the Whiteboard AI backend for authentication, saved boards, and image search.

## Features

- Sign up, sign in, and sign out. The session token is kept in browser local storage.
- Create, save, reopen, and start new boards.
- Add and remove pages; choose Free canvas, A4 Portrait, or A4 Landscape; scroll through pages and select 50%, 75%, or 100% zoom.
- Use Text mode to type on a page, choosing text color and size. Text mode is the default.
- Switch to Draw mode to use the pen, rectangle, square, circle, triangle, arrow, and fill tools. Choose drawing color and stroke width.
- Undo, redo, or clear content on the active page.
- Search Wikimedia Commons by text, view image source and license information, and add images to a page. Added images can be moved, resized, and individually removed.
- Switch the workspace between light and dark themes. The drawing pages remain white.

The image panel currently performs typed image search through the backend. Gemini-based suggestions from a board screenshot are available as a backend endpoint but are not wired into the frontend panel.

## Requirements

- Node.js and npm
- The Whiteboard AI backend running at `http://localhost:5000`

## Setup

From this directory:

```bash
npm install
npm run dev
```

Vite prints the local development URL, usually `http://localhost:5173`. Start the backend separately; see [the backend README](../Backend/README.md) for MongoDB and environment setup.

The API client currently uses the fixed base URL `http://localhost:5000/api`, so the backend should listen on port 5000 for local development.

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start the Vite development server |
| `npm run build` | Create the production build in `dist/` |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run ESLint |

## How to use

1. Open the frontend and create an account or sign in.
2. The board opens in Text mode. Type at the caret or click a location on a page to enter text.
3. Use the toolbar to set text color and size. Switch to Draw mode to choose a drawing tool, color, and stroke width.
4. Add pages or change the active page's size and orientation from the page controls. Use the zoom selector to change the document view.
5. Search for images in the side panel, then add a result to the active page. Drag an image to move it; use its handles to resize it; select it and choose Remove to delete that image.
6. Select Save board to persist the document. For a new board, enter a title when prompted. Use My boards to reopen a saved board.
7. Use New board to start another document; unsaved changes are discarded after confirmation.

## Source layout

```text
src/
  api/          Backend API clients
  components/   Board canvas, toolbar, auth forms, board list, image search
  App.jsx       Routes, document state, pages, persistence, and workspace
  socket.js     Socket.IO client module (not currently used for live collaboration)
  styles.css    Workspace and component styles
```

Saved content is sent to the backend as board data, including its pages, strokes, shapes, text, and added images. Older saved boards containing a single page's drawing data are opened as a one-page document.
