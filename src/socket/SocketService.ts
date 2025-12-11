import { Result } from "express-validator";
import { Server, Socket } from "socket.io";

export class SocketService {
    private io: Server;
    private static instance: SocketService;

    private constructor(io: Server) {
        this.io = io;
        this.setupConnectionHandler();
    }

    public static initialize(io: Server): SocketService {
        if (!SocketService.instance) {
            SocketService.instance = new SocketService(io);
        }
        return SocketService.instance;
    }

    public static getInstance(): SocketService {
        if (!SocketService.instance) {
            throw new Error("SocketService not initialized. Call initialize() first.");
        }
        return SocketService.instance;
    }

    private setupConnectionHandler(): void {
        this.io.on("connection", (socket: Socket) => {
            console.log(`New client connected: ${socket.id}`);

            socket.on("disconnect", () => {
                console.log(`Client disconnected: ${socket.id}`);
            });
        });
    }

    public emitEvent(event: string, data: any): void {
        this.io.emit(event, data);
    }

    public static triggerScoreUpdateEvent(scoreData: any): void {
        const instance = SocketService.getInstance();
        instance.emitEvent("scoreUpdate", {
            success: true,
            result: scoreData,
        });
    }

    public static triggerAlertEvent(alertData: any): void {
        const instance = SocketService.getInstance();
        instance.emitEvent("newAlert", {
            success: true,
            result: alertData,
        });
    }
}

const socketService = SocketService;;
export default socketService;