import dotenv from "dotenv";
import connectDB from "./db/index.js";
import { Server } from "socket.io";
import { app } from "./app.js";
import http from "http";

dotenv.config({
  path: "./env",
});

//   Web socket server

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN,
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  console.log("New client connection");
  socket.on("joinRoom", (room) => {
    socket.join(room);
    console.log(`Socket joined room: ${room}`);
  });
});

connectDB()
  .then(() => {
    app.on("error", (error) => {
      console.log("ERROR :", error);
      throw error;
    });
    server.listen(process.env.PORT || 8000, () => {
      console.log(
        `Server is running on PORT : http://localhost:${process.env.PORT}`
      );
    });
  })
  .catch((err) => {
    console.log("MONGO db connection failed !!! ", err);
  });
