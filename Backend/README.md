# Whiteboard AI - Backend

The robust backend server powering the Whiteboard AI application. It provides a REST API for resource management and a WebSocket server for real-time bidirectional communication.

## 🚀 Features

-   **RESTful API**: Endpoints for user management and whiteboard CRUD operations.
-   **Real-time Engine**: Powered by Socket.io to sync drawing events instantly across clients.
-   **Secure Authentication**: JWT (JSON Web Tokens) based auth system with Bcrypt for password hashing.
-   **Database**: MongoDB integration via Mongoose for structured data storage.
-   **AI Proxy**: Secure handling of requests to the Gemini API.

## 🛠️ Tech Stack

-   **Runtime**: [Node.js](https://nodejs.org/)
-   **Framework**: [Express.js](https://expressjs.com/)
-   **Database**: [MongoDB](https://www.mongodb.com/) & [Mongoose](https://mongoosejs.com/)
-   **Real-time**: [Socket.io](https://socket.io/)
-   **Authentication**: [JsonWebToken](https://github.com/auth0/node-jsonwebtoken) & [BcryptJS](https://github.com/dcodeIO/bcrypt.js)

## ⚙️ Environment Variables

Create a `.env` file in the root of the `Backend` directory and define the following variables:

```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_secure_jwt_secret
GEMINI_API_KEY=your_gemini_api_key
```

## 📦 Installation & Setup

1.  **Navigate to the `Backend` directory**:
    ```bash
    cd Backend
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Start the server**:
    -   **Development (with auto-reload)**:
        ```bash
        npm run dev
        ```
    -   **Production**:
        ```bash
        npm start
        ```
    The server will typically mimic the port specified in your `.env` (default: 5000).
