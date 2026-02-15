import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { PlayerSession } from '../persistence/models/PlayerSession';
import { ProgressionService } from '../services/ProgressionService';
import { logger } from '../utils/logger';

/**
 * Manages socket connections, disconnections, and reconnections.
 * Maintains a session store mapping socket IDs to player IDs.
 */
export class ConnectionManager {
  private io: Server;
  private sessions: Map<string, PlayerSession> = new Map(); // socketId -> PlayerSession
  private progressionService?: ProgressionService;

  constructor(io: Server, progressionService?: ProgressionService) {
    this.io = io;
    this.progressionService = progressionService;
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.io.on('connection', (socket: Socket) => this.handleConnection(socket));
  }

  /**
   * Handle new socket connection.
   * Authenticate the player, create a session, and store mapping.
   */
  private handleConnection(socket: Socket): void {
    logger.info(`Client connected: ${socket.id}`);

    // Extract token from handshake auth (or query)
    const token = socket.handshake.auth.token || socket.handshake.query.token;
    let playerId: string | null = null;

    if (token) {
      // Validate token and get playerId (placeholder)
      playerId = this.authenticateToken(token);
    }

    // If no valid token, assign a guest session
    if (!playerId) {
      playerId = `guest_${socket.id}`;
      logger.debug(`Assigning guest playerId: ${playerId}`);
    }

    const session: PlayerSession = {
      socketId: socket.id,
      playerId,
      connectedAt: new Date(),
      lastActivity: new Date(),
      roomId: null,
    };

    this.sessions.set(socket.id, session);

    // Update player progression (if authenticated)
    if (this.progressionService && !playerId.startsWith('guest_')) {
      this.progressionService.initializePlayer(playerId).catch((err) => {
        logger.error(`Failed to initialize player progression: ${err}`);
      });
    }

    // Send connection acknowledgment
    socket.emit('connection_ack', {
      sessionId: socket.id,
      playerId,
      serverTime: Date.now(),
    });

    // Handle disconnection
    socket.on('disconnect', () => this.handleDisconnection(socket));
    // Handle reconnection attempts
    socket.on('reconnect_attempt', () => this.handleReconnectAttempt(socket));
    // Handle custom events for activity
    socket.on('ping', () => this.handlePing(socket));
  }

  /**
   * Authenticate JWT token and return playerId.
   * Verifies token using JWT_SECRET environment variable.
   */
  private authenticateToken(token: string): string | null {
    try {
      const secret = process.env.JWT_SECRET;
      if (!secret) {
        logger.error('JWT_SECRET environment variable not set');
        return null;
      }

      const decoded = jwt.verify(token, secret) as { playerId: string };
      logger.debug(`Authenticated player: ${decoded.playerId}`);
      return decoded.playerId;
    } catch (error) {
      logger.warn(`Invalid token: ${(error as Error).message}`);
      return null;
    }
  }

  /**
   * Handle socket disconnection.
   */
  private handleDisconnection(socket: Socket): void {
    logger.info(`Client disconnected: ${socket.id}`);
    const session = this.sessions.get(socket.id);
    if (session) {
      // Notify room that player left
      if (session.roomId) {
        this.io.to(session.roomId).emit('player_left', {
          playerId: session.playerId,
          socketId: socket.id,
        });
      }
      this.sessions.delete(socket.id);
    }
  }

  /**
   * Handle reconnection attempt (Socket.IO automatically tries to reconnect).
   */
  private handleReconnectAttempt(socket: Socket): void {
    logger.debug(`Reconnect attempt by ${socket.id}`);
    // You could update session with new socket id if needed
  }

  /**
   * Keep-alive ping.
   */
  private handlePing(socket: Socket): void {
    const session = this.sessions.get(socket.id);
    if (session) {
      session.lastActivity = new Date();
      socket.emit('pong', { serverTime: Date.now() });
    }
  }

  /**
   * Get session by socket ID.
   */
  public getSession(socketId: string): PlayerSession | undefined {
    return this.sessions.get(socketId);
  }

  /**
   * Get session by player ID.
   */
  public getSessionByPlayerId(playerId: string): PlayerSession | undefined {
    return Array.from(this.sessions.values()).find(
      (session) => session.playerId === playerId,
    );
  }

  /**
   * Update room assignment for a socket.
   */
  public assignRoom(socketId: string, roomId: string): void {
    const session = this.sessions.get(socketId);
    if (session) {
      session.roomId = roomId;
      logger.debug(`Assigned socket ${socketId} to room ${roomId}`);
    }
  }

  /**
   * Remove room assignment.
   */
  public removeRoomAssignment(socketId: string): void {
    const session = this.sessions.get(socketId);
    if (session) {
      session.roomId = null;
    }
  }

  /**
   * Get all sessions in a room.
   */
  public getSessionsInRoom(roomId: string): PlayerSession[] {
    return Array.from(this.sessions.values()).filter(
      (session) => session.roomId === roomId,
    );
  }

  /**
   * Get total connected clients count.
   */
  public getConnectedCount(): number {
    return this.sessions.size;
  }
}
