import { io } from "socket.io-client";
const Board = require("./models/Board");


const socket = io("http://localhost:5000");

export default socket;
