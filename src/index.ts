import http from "http";
import { Server } from "socket.io";
import app from "./app"; // 你剛剛寫的 express 主程式
import socketService from "./socket/SocketService";

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: ["http://localhost:5173", "http://localhost:3000"],
        credentials: true,
    },
});
socketService.initialize(io);

io.on("connection", (socket) => {
    console.log("Socket connected:", socket.id);

    socket.on("msg", (data) => {
        console.log("Message received:", data);
        io.emit("msg", data);
    });
});

const PORT = Number(process.env.PORT) || 3001;

server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is running on port ${PORT}`);
});
