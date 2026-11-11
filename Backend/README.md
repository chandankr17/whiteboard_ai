# Whiteboard AI Backend

The backend is an Express REST API for user accounts, saved whiteboards, and image search. It uses MongoDB to store accounts and board data, and JWTs to protect user-specific endpoints.

## What it does

- Registers accounts and signs users in with email and password. Passwords are hashed with bcrypt; successful registration and login return a JWT.
- Creates, updates, lists, and loads a user's saved boards. Board documents are stored in MongoDB's flexible `data` field, including their pages and drawing objects.
- Runs an authenticated Socket.IO server for live collaboration. Owners can create invite links; invitees with valid links can join board rooms. Page and document updates are broadcast and persisted as collaborators work.
- Searches Wikimedia Commons for images, returning thumbnail URLs, source pages, and license metadata.
- Provides an optional board-image suggestion endpoint. It uses Gemini to derive search terms from a PNG board image, then searches Wikimedia Commons.

The current frontend image panel uses typed Wikimedia Commons search. The Gemini-based board-image suggestion endpoint exists in the API but is not currently connected to that panel.

## Requirements

- Node.js and npm
- A MongoDB instance, local or hosted
- A Gemini API key only if using the optional `/api/gemini/suggest` endpoint

## Setup

From this directory, install dependencies:

```bash
npm install
```

Create a `.env` file in the `Backend` directory:

```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/whiteboard_ai
JWT_SECRET=replace_with_a_long_random_secret
GEMINI_API_KEY=your_gemini_api_key
```

`MONGO_URI` and `JWT_SECRET` are required for normal use. `PORT` defaults to `5000`. `GEMINI_API_KEY` is only needed for Gemini-based board-image suggestions. Keep `.env` private and do not commit real credentials.

Start the API:

```bash
npm run dev
```

For a regular Node.js start:

```bash
npm start
```

The API listens at `http://localhost:5000` by default. `GET /` returns a simple server status message. MongoDB must be reachable for account and board operations.

## API routes

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `POST` | `/api/auth/register` | No | Create an account and return a JWT |
| `POST` | `/api/auth/login` | No | Authenticate and return a JWT |
| `POST` | `/api/boards/save` | Yes | Create a board or update one owned by the user |
| `GET` | `/api/boards/load` | Yes | List the signed-in user's boards |
| `GET` | `/api/boards/:id` | Owner or invitee | Load an owned board, or use `?shareToken=<token>` for a valid invite |
| `POST` | `/api/boards/:id/share` | Owner | Create or rotate the board's invite link token |
| `DELETE` | `/api/boards/:id` | Yes | Delete one board owned by the user |
| `GET` | `/api/gemini/images?q=...` | Yes | Search Wikimedia Commons by text |
| `POST` | `/api/gemini/suggest` | Yes | Analyze a PNG board image with Gemini and find related images |

For protected routes, send the token returned by login or registration in the request header:

```http
Authorization: Bearer <token>
```

The suggestion route expects JSON containing an `image` data URL that begins with `data:image/png;base64,`. The uploaded image must be smaller than 5 MB.

## Socket.IO collaboration

The Socket.IO server shares the Express HTTP server and authenticates each connection using the same JWT as the REST API. After creating a saved board, its owner can use **Share** in the frontend to generate an invite link. Invitees must have an account and be signed in before opening the link. Creating another invite rotates the secret and invalidates the previous link.

The client joins a board room using the board ID and invite token. Only the owner or a user with the current invite token can join or send updates. Page edits and document changes are broadcast to the room and written to MongoDB. Presence reports the number of connected sessions. The raw invite token is never stored in MongoDB; only its SHA-256 hash is stored.

Socket events used by the application:

| Event | Direction | Purpose |
|---|---|---|
| `board:join` | Client to server | Authenticate access to a board room and receive its current data |
| `board:page-update` | Both ways | Synchronize and persist page content changes |
| `board:document-operation` | Both ways | Synchronize and persist page additions, removals, and format changes without replacing other pages |
| `board:presence` | Server to clients | Report connected sessions in the board room |
| `board:error` | Server to client | Report authorization or synchronization errors |

Set `FRONTEND_ORIGIN` to the deployed frontend origin when hosting outside local development; it defaults to `http://localhost:5173`.

## Project structure

```text
Backend/
  config/       Database connection helper
  middleware/   JWT verification
  models/       User and board schemas
  routes/       Authentication, boards, and image search endpoints
  services/     Gemini image analysis
  index.js      Express app and API startup
```

## Notes

- JWTs expire after 20 days.
- Board listing, creation, and deletion are scoped to the authenticated owner. Loading a board or joining its live room is also allowed for users with the current invite token; only owners can create/rotate invites.
- Image search contacts Wikimedia Commons; results include their source and available license information. Check the source page for the applicable reuse terms.
- The project does not currently define a backend test script.
