import { io, Socket } from "socket.io-client";
import { EventEmitter } from "events";
import { logger } from "../utils/logger";

/**
 * Network service for handling Socket.IO communication with the game server.
 */
export class NetworkService extends EventEmitter {
  private socket: Socket | null = null;
  private connected = false;
  private roomId: string | null = null;
  private playerId: string | null = null;
  private serverUrl: string;

  constructor(serverUrl?: string) {
    super();
    if (!serverUrl && !process.env.SERVER_URL) {
      throw new Error('Server URL is required. Pass serverUrl or set SERVER_URL environment variable.');
    }
    this.serverUrl = serverUrl || process.env.SERVER_URL!;
  }

  /**
   * Connect to the game server.
   * @param token Optional JWT token for authenticated user.
   */
  public connect(token?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.socket) {
        this.disconnect();
      }

      const options: any = {
        transports: ["websocket", "polling"],
        auth: token ? { token } : {},
        pingInterval: 5000,
        pingTimeout: 2000,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        timeout: 10000,
      };

      this.socket = io(this.serverUrl, options);

      this.socket.on("connect", () => {
        logger.info("Connected to server");
        this.connected = true;
        this.setupEventListeners();
        resolve();
      });

      this.socket.on("connect_error", (error) => {
        logger.error("Connection error:", error);
        reject(error);
      });

      this.socket.on("connection_ack", (data) => {
        this.playerId = data.playerId;
        this.emit("connected", data);
      });

      this.socket.on("disconnect", (reason) => {
        logger.warn("Disconnected from server:", reason);
        this.connected = false;
        this.emit("disconnected", { reason });
      });

      this.socket.on("reconnect", (attemptNumber) => {
        logger.info("Reconnected to server after", attemptNumber, "attempts");
        this.connected = true;
        this.emit("reconnected", { attemptNumber });
      });

      this.socket.on("reconnect_attempt", (attemptNumber) => {
        logger.info("Reconnection attempt", attemptNumber);
        this.emit("reconnect_attempt", { attemptNumber });
      });

      this.socket.on("reconnect_error", (error) => {
        logger.error("Reconnection error:", error);
        this.emit("reconnect_error", { error });
      });

      this.socket.on("reconnect_failed", () => {
        logger.error("Failed to reconnect to server");
        this.emit("reconnect_failed");
      });
    });
  }

  /**
   * Disconnect from the server.
   */
  public disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.connected = false;
    this.roomId = null;
    this.playerId = null;
    logger.info("Disconnected from server");
  }

  /**
   * Set up event listeners for server events.
   */
  private setupEventListeners(): void {
    if (!this.socket) return;

    // Matchmaking events
    this.socket.on("matchmaking_queued", (data) =>
      this.emit("matchmaking_queued", data),
    );
    this.socket.on("matchmaking_success", (data) => {
      this.roomId = data.roomId;
      this.emit("matchmaking_success", data);
    });
    this.socket.on("matchmaking_canceled", () =>
      this.emit("matchmaking_canceled"),
    );

    // Room events
    this.socket.on("room_joined", (data) => {
      this.roomId = data.roomId;
      this.emit("room_joined", data);
    });
    this.socket.on("room_created", (data) => this.emit("room_created", data));
    this.socket.on("room_paused", (data) => this.emit("room_paused", data));
    this.socket.on("room_resumed", (data) => this.emit("room_resumed", data));
    this.socket.on("room_ended", (data) => {
      this.roomId = null;
      this.emit("room_ended", data);
    });
    this.socket.on("player_joined_room", (data) =>
      this.emit("player_joined", data),
    );
    this.socket.on("player_left_room", (data) =>
      this.emit("player_left", data),
    );

    // Gameplay events
    this.socket.on("game_state_update", (data) =>
      this.emit("game_state_update", data),
    );
    this.socket.on("player_input", (data) => this.emit("player_input", data));
    this.socket.on("player_jump", (data) => this.emit("player_jump", data));
    this.socket.on("player_skill", (data) => this.emit("player_skill", data));
    this.socket.on("player_collect_item", (data) =>
      this.emit("player_collect_item", data),
    );
    this.socket.on("player_damaged", (data) =>
      this.emit("player_damaged", data),
    );
    this.socket.on("player_died", (data) => this.emit("player_died", data));
    this.socket.on("player_respawn", (data) =>
      this.emit("player_respawn", data),
    );

    // Chat events
    this.socket.on("chat_message", (data) => this.emit("chat_message", data));
    this.socket.on("chat_whisper", (data) => this.emit("chat_whisper", data));

    // Error events
    this.socket.on("error", (data) => this.emit("error", data));
    this.socket.on("warning", (data) => this.emit("warning", data));

    // Ping/pong
    this.socket.on("pong", (data) => this.emit("pong", data));
  }

  // ========== Matchmaking ==========

  /**
   * Request matchmaking with given preferences.
   */
  public requestMatchmaking(preferences: {
    gameMode: string;
    region?: string;
    maxPlayers?: number;
    skillLevel?: number;
  }): void {
    this.socket?.emit("matchmaking_request", preferences);
  }

  /**
   * Cancel matchmaking request.
   */
  public cancelMatchmaking(): void {
    this.socket?.emit("matchmaking_cancel");
  }

  // ========== Room ==========

  /**
   * Join a specific room by ID.
   */
  public joinRoom(roomId: string): void {
    this.socket?.emit("join_room", roomId);
  }

  /**
   * Leave the current room.
   */
  public leaveRoom(): void {
    if (this.roomId) {
      this.socket?.emit("leave_room", this.roomId);
      this.roomId = null;
    }
  }

  // ========== Gameplay ==========

  /**
   * Send player input to server.
   */
  public sendPlayerInput(input: {
    sequence: number;
    input: {
      left: boolean;
      right: boolean;
      up: boolean;
      down: boolean;
      jump: boolean;
      skill?: string;
    };
    timestamp: number;
  }): void {
    this.socket?.emit("player_input", input);
  }

  /**
   * Send jump action.
   */
  public sendJump(): void {
    this.socket?.emit("player_jump");
  }

  /**
   * Send skill usage.
   */
  public sendSkill(skillId: string): void {
    this.socket?.emit("player_skill", skillId);
  }

  /**
   * Send item collection.
   */
  public sendCollectItem(itemId: string): void {
    this.socket?.emit("player_collect_item", itemId);
  }

  // ========== Chat ==========

  /**
   * Send a chat message.
   */
  public sendChatMessage(
    message: string,
    channel: "global" | "room" | "whisper",
    targetPlayerId?: string,
  ): void {
    this.socket?.emit("chat_message", { message, channel, targetPlayerId });
  }

  // ========== Utility ==========

  /**
   * Get current room ID.
   */
  public getCurrentRoom(): string | null {
    return this.roomId;
  }

  /**
   * Get player ID assigned by server.
   */
  public getPlayerId(): string | null {
    return this.playerId;
  }

  /**
   * Check if connected.
   */
  public isConnected(): boolean {
    return this.connected;
  }

  /**
   * Send a ping to measure latency.
   */
  public ping(): void {
    this.socket?.emit("ping");
  }
}
