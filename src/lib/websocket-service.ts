import { io, Socket } from "socket.io-client";
import { useAdminStore } from "@/store/admin-store";
import { getApiBaseUrl } from "@/lib/api";

function getSocketUrl(): string {
  const envSocket = import.meta.env.VITE_SOCKET_URL;
  if (envSocket && typeof envSocket === "string" && envSocket.trim() !== "") {
    return envSocket.trim().replace(/\/+$/, "");
  }
  const apiBase = getApiBaseUrl();
  return apiBase.replace(/\/api$/, "");
}

class WebSocketService {
  private socket: Socket | null = null;
  private static instance: WebSocketService;

  static getInstance(): WebSocketService {
    if (!WebSocketService.instance) {
      WebSocketService.instance = new WebSocketService();
    }
    return WebSocketService.instance;
  }

  connect() {
    if (this.socket?.connected) return;

    const socketUrl = getSocketUrl();
    this.socket = io(`${socketUrl}/realtime`, {
      transports: ["websocket", "polling"],
      autoConnect: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 3000,
    });

    this.socket.on("connect", () => {
      console.log("Admin WebSocket connected");
    });

    this.socket.on("disconnect", () => {
      console.log("Admin WebSocket disconnected");
    });

    // Escuchar nuevas disputas
    this.socket.on("dispute.new", () => {
      useAdminStore.getState().incrementPendingDisputes();
    });

    // Escuchar disputas resueltas
    this.socket.on("dispute.resolved", () => {
      useAdminStore.getState().decrementPendingDisputes();
    });

    // Escuchar nueva solicitud de verificación
    this.socket.on("verification.new", () => {
      useAdminStore.getState().incrementPendingVerifications();
    });

    // Escuchar verificación revisada
    this.socket.on("verification.reviewed", () => {
      useAdminStore.getState().decrementPendingVerifications();
    });
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }
}

export const websocketService = WebSocketService.getInstance();
