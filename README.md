# Whiteboard AI

Whiteboard AI is a web-based workspace for writing, drawing, and organizing visual ideas. It combines a multi-page whiteboard with text editing, drawing tools, reference-image search, and account-based board storage. Users can create a board, work across pages in one document, and reopen saved work later.

## What the project does

### Whiteboard documents

- Organizes work as a scrollable document with multiple pages.
- Supports Free canvas, A4 Portrait, and A4 Landscape page formats, plus 50%, 75%, and 100% viewing zoom.
- Keeps compatibility with older saved boards by opening legacy single-page board data as the first page of a document.
- Saves board content to the signed-in user's account.

### Text and drawing

- Opens in Text mode, with a caret for typing on the active page.
- Lets users choose text color and font size.
- Provides a separate Draw mode with a freehand pen, rectangle, square, circle, triangle, arrow, and fill tool for closed shapes.
- Lets users choose drawing color and stroke width.
- Includes undo, redo, and clear actions for the active page.

### Reference images

- Searches Wikimedia Commons by a user's text query.
- Displays image thumbnails, source links, and available license information.
- Adds selected images to the active page; images can be moved, resized, and individually removed.
- Includes an optional backend endpoint that uses Gemini to analyze a board screenshot and search for related images. The current frontend image panel uses text search and does not call this endpoint.

### Live collaboration

- Lets the board owner generate a share link for a saved board. Invitees sign in, open the link, and join the same Socket.IO room.
- Broadcasts page edits, document changes, and collaborator presence to everyone in that board room.
- Persists collaborators' changes to MongoDB as they work. Only the board owner can create a share link or use the manual Save board action.
- Stores only a hash of the invite token. Creating a new invite replaces the previous token and invalidates older links.

### Accounts and saved boards

- Provides account registration and login using email and password.
- Hashes passwords before storing them and issues JWTs on successful registration or login.
- Lists, loads, creates, updates, and deletes boards scoped to the authenticated user; board owners can invite other signed-in users to collaborate on a specific board.
- Stores the page and canvas content in a flexible MongoDB board-data field.

## Technology stack

### Frontend

| Technology | Use |
|---|---|
| React 19 | Component-based user interface and application state |
| Vite | Frontend development server and production bundler |
| React Router | Login, signup, and workspace routes |
| React-Konva and Konva | Interactive canvas rendering and drawing objects |
| Axios | HTTP requests to the backend API |
| Socket.IO Client and Socket.IO | Authenticated realtime board rooms, page/document updates, and presence |
| ESLint | Frontend linting |

### Backend and services

| Technology / service | Use |
|---|---|
| Node.js with ES modules | Backend runtime and module system |
| Express 5 | REST API and middleware |
| MongoDB and Mongoose | Persisting users and saved boards |
| JSON Web Token (`jsonwebtoken`) | Bearer-token authentication; tokens expire after 20 days |
| `bcryptjs` | Password hashing and verification |
| `cors` | Cross-origin API access |
| `dotenv` | Loading backend environment configuration |
| Google Generative AI SDK | Optional board-image analysis for related-image suggestions |
| Wikimedia Commons API | Image search results, thumbnails, source pages, and license metadata |

## API overview

The backend API is mounted under `/api`. Protected routes require the JWT returned by registration or login in the `Authorization: Bearer <token>` request header.

| Method | Endpoint | Authentication | Purpose |
|---|---|---|---|
| `GET` | `/` | No | Backend status response |
| `POST` | `/api/auth/register` | No | Create an account and return a token and user details |
| `POST` | `/api/auth/login` | No | Verify credentials and return a token and user details |
| `POST` | `/api/boards/save` | Yes | Create a board, or update an existing board when its `id` is supplied |
| `GET` | `/api/boards/load` | Yes | List the signed-in user's boards |
| `POST` | `/api/boards/:id/share` | Owner | Create or rotate a board invite token |
| `GET` | `/api/boards/:id?shareToken=<token>` | Owner or invitee | Retrieve a board owned by the signed-in user or opened with a valid invite |
| `DELETE` | `/api/boards/:id` | Yes | Delete one board owned by the signed-in user |
| `GET` | `/api/gemini/images?q=<query>` | Yes | Search Wikimedia Commons using text |
| `POST` | `/api/gemini/suggest` | Yes | Analyze a PNG board image with Gemini and search Wikimedia Commons for related images |

The board-save request accepts `boardData` and an optional `title`; include `id` to update an existing board. The screenshot-suggestion request accepts an `image` PNG data URL and is limited to images smaller than 5 MB. Image results include a thumbnail URL, source-page URL, title, and available license label.

## Architecture

```text
Browser
  React workspace
    Text/drawing canvas, pages, toolbar, image search, account screens
    Axios API client
       |
       | HTTP requests with JWT bearer token for protected routes
       v
  Express API
    Auth routes       -> MongoDB user records
    Board routes      -> MongoDB board records
    Socket.IO rooms   -> authenticated collaborators and persisted updates
    Image routes      -> Wikimedia Commons
                     -> Gemini (optional screenshot suggestions)
```

The frontend owns the interactive document experience and sends board data to the API and Socket.IO server. The backend verifies tokens, limits normal board access to the owner, and allows invitees with a valid share token to join realtime rooms. Invitees can edit shared content, while only the owner can issue new invite links or delete the board. Page-based documents are stored within the board's data field; no separate page collection is required.

## Repository structure

```text
whiteboard_ai/
  README.md
  Backend/
    config/           Database connection helper
    middleware/       JWT verification
    models/           User and board schemas
    routes/           Authentication, board, and image-search API
    services/         Gemini image analysis
    index.js          Express application and server
    README.md         Backend-specific documentation
  Frontend/
    src/
      api/            Backend API clients
      components/     Canvas, toolbar, image search, auth, and board list
      App.jsx         Routes, workspace, document state, and persistence
      socket.js       Socket.IO client module
      styles.css      Workspace and component styles
    README.md         Frontend-specific documentation
```

## Current implementation notes

- Socket.IO collaboration requires a saved board and an owner-generated invite link. Invitees must sign in before opening the link. Creating a new link invalidates the previous one.
- The frontend image panel uses typed Wikimedia Commons search. Gemini-based screenshot suggestions are available only through the backend endpoint and are not currently wired into the panel.
- Image search and board operations require authentication; registration and login do not.
- Wikimedia Commons provides source and license metadata, but users should check the original source page for the exact license and attribution requirements.
