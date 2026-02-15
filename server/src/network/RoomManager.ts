import { Server } from 'socket.io';
import { ConnectionManager } from './ConnectionManager';
import { logger } from '../utils/logger';

/**
 * Game state structure for a room.
 */
export interface GameState {
  roomId: string;
  startedAt: Date;
  players: Array<{
    playerId: string;
    position: { x: number; y: number };
    velocity: { x: number; y: number };
    health: number;
    score: number;
    isAlive: boolean;
  }>;
  entities: Array<{
    entityId: string;
    type: string;
    position: { x: number; y: number };
    active: boolean;
  }>;
  gameMode: string;
  isActive: boolean;
  startTime: number;
  elapsedTime: number;
}

/**
 * Represents a game room.
 */
export interface Room {
  roomId: string;
  gameMode: string;
  maxPlayers: number;
  players: Array<{
    playerId: string;
    socketId: string;
  }>;
  createdAt: Date;
  isActive: boolean;
  gameState?: GameState;
}

/**
 * Manages room lifecycle (create, pause, end).
 */
export class RoomManager {
  private io: Server;
  private connectionManager: ConnectionManager;
  private rooms: Map<string, Room> = new Map();

  constructor(io: Server, connectionManager: ConnectionManager) {
    this.io = io;
    this.connectionManager = connectionManager;
  }

  /**
   * Create a new room.
   */
  public createRoom(
    roomId: string,
    options: {
      gameMode: string;
      maxPlayers?: number;
      players: Array<{ playerId: string; socketId: string }>;
    },
  ): Room {
    const room: Room = {
      roomId,
      gameMode: options.gameMode,
      maxPlayers: options.maxPlayers || 4,
      players: options.players,
      createdAt: new Date(),
      isActive: true,
    };

    this.rooms.set(roomId, room);
    logger.info(`Room created: ${roomId} (${options.players.length} players)`);

    // Notify all players in room
    this.io.to(roomId).emit('room_created', {
      roomId,
      gameMode: room.gameMode,
      players: room.players,
    });

    return room;
  }

  /**
   * Get room by ID.
   */
  public getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }

  /**
   * Add a player to an existing room.
   */
  public addPlayer(
    roomId: string,
    playerId: string,
    socketId: string,
  ): boolean {
    const room = this.rooms.get(roomId);
    if (!room || !room.isActive) {
      logger.warn(`Cannot add player to inactive or missing room ${roomId}`);
      return false;
    }
    if (room.players.length >= room.maxPlayers) {
      logger.warn(`Room ${roomId} is full`);
      return false;
    }
    if (room.players.some((p) => p.playerId === playerId)) {
      logger.warn(`Player ${playerId} already in room ${roomId}`);
      return false;
    }

    room.players.push({ playerId, socketId });
    this.connectionManager.assignRoom(socketId, roomId);

    // Notify room
    this.io.to(roomId).emit('player_joined_room', {
      playerId,
      socketId,
      roomId,
    });

    logger.debug(`Player ${playerId} added to room ${roomId}`);
    return true;
  }

  /**
   * Remove a player from a room.
   */
  public removePlayer(roomId: string, playerId: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room) return false;

    const index = room.players.findIndex((p) => p.playerId === playerId);
    if (index >= 0) {
      const [removed] = room.players.splice(index, 1);
      const socket = this.io.sockets.sockets.get(removed.socketId);
      if (socket) {
        socket.leave(roomId);
        this.connectionManager.removeRoomAssignment(removed.socketId);
      }

      // Notify room
      this.io.to(roomId).emit('player_left_room', {
        playerId,
        roomId,
      });

      logger.debug(`Player ${playerId} removed from room ${roomId}`);

      // If room becomes empty, clean it up
      if (room.players.length === 0) {
        this.destroyRoom(roomId);
      }
      return true;
    }
    return false;
  }

  /**
   * Pause a room (e.g., for maintenance).
   */
  public pauseRoom(roomId: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room || !room.isActive) return false;

    room.isActive = false;
    this.io.to(roomId).emit('room_paused', { roomId });
    logger.info(`Room paused: ${roomId}`);
    return true;
  }

  /**
   * Resume a paused room.
   */
  public resumeRoom(roomId: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room || room.isActive) return false;

    room.isActive = true;
    this.io.to(roomId).emit('room_resumed', { roomId });
    logger.info(`Room resumed: ${roomId}`);
    return true;
  }

  /**
   * End a room (game over) and clean up.
   */
  public endRoom(roomId: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room) return false;

    // Notify all players
    this.io.to(roomId).emit('room_ended', {
      roomId,
      reason: 'game_over',
    });

    // Kick all players out
    room.players.forEach((player) => {
      const socket = this.io.sockets.sockets.get(player.socketId);
      if (socket) {
        socket.leave(roomId);
        this.connectionManager.removeRoomAssignment(player.socketId);
      }
    });

    this.rooms.delete(roomId);
    logger.info(`Room ended and destroyed: ${roomId}`);
    return true;
  }

  /**
   * Destroy room immediately (forceful).
   */
  private destroyRoom(roomId: string): void {
    this.rooms.delete(roomId);
    logger.debug(`Room destroyed: ${roomId}`);
  }

  /**
   * Get all active rooms.
   */
  public getActiveRooms(): Room[] {
    return Array.from(this.rooms.values()).filter((room) => room.isActive);
  }

  /**
   * Get rooms a player is in.
   */
  public getRoomsForPlayer(playerId: string): Room[] {
    return Array.from(this.rooms.values()).filter((room) =>
      room.players.some((p) => p.playerId === playerId),
    );
  }

  /**
   * Update game state for a room.
   */
  public updateGameState(roomId: string, gameState: any): void {
    const room = this.rooms.get(roomId);
    if (room) {
      room.gameState = gameState;
      // Could broadcast delta to clients
    }
  }
}
