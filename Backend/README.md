# Whiteboard AI Backend

The backend is an Express REST API for user accounts, saved whiteboards, and image search. It uses MongoDB to store accounts and board data, and JWTs to protect user-specific endpoints.

## What it does

- Registers accounts and signs users in with email and password. Passwords are hashed with bcrypt; successful registration and login return a JWT.
- Creates, updates, lists, and loads a user's saved boards. Board documents are stored in MongoDB's flexible `data` field, including their pages and drawing objects.
- Searches Wikimedia Commons for images, returning thumbnail URLs, source pages, and license metadata.
- Provides an optional board-image suggestion endpoint. It uses Gemini to derive search terms from a PNG board image, then searches Wikimedia Commons.

The current frontend image panel uses typed Wikimedia Commons search. The Gemini-based board-image suggestion endpoint exists in the API but is not currently connected to that panel. Socket.IO is listed as a dependency, but live collaboration is not currently implemented by the running server.

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
| `GET` | `/api/boards/:id` | Yes | Load one board owned by the user |
| `DELETE` | `/api/boards/:id` | Yes | Delete one board owned by the user |
| `GET` | `/api/gemini/images?q=...` | Yes | Search Wikimedia Commons by text |
| `POST` | `/api/gemini/suggest` | Yes | Analyze a PNG board image with Gemini and find related images |

For protected routes, send the token returned by login or registration in the request header:

```http
Authorization: Bearer <token>
```

The suggestion route expects JSON containing an `image` data URL that begins with `data:image/png;base64,`. The uploaded image must be smaller than 5 MB.

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
- Board reads, updates, and deletes are scoped to the authenticated user.
- Image search contacts Wikimedia Commons; results include their source and available license information. Check the source page for the applicable reuse terms.
- The project does not currently define a backend test script.
