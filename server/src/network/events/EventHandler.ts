import { Socket } from 'socket.io';
import { ConnectionManager } from '../ConnectionManager';
import { Matchmaker } from '../Matchmaker';
import { RoomManager } from '../RoomManager';
import { GameSync } from '../GameSync';
import { EventNames, PlayerInputEvent, MatchmakingRequestEvent, ChatMessageEvent } from './eventTypes';
import { logger } from '../../utils/logger';

/**
 * Centralized event handler for socket events.
 */
export class EventHandler {
  constructor(
    private connectionManager: ConnectionManager,
    private matchmaker: Matchmaker,
    private roomManager: RoomManager,
    private gameSync: GameSync
  ) {}

  /**
   * Register all event listeners for a socket.
   */
  public registerSocket(socket: Socket): void {
    // Matchmaking events
    socket.on(EventNames.MATCHMAKING_REQUEST, (data: MatchmakingRequestEvent) =>
      this.handleMatchmakingRequest(socket, data)
    );
    socket.on(EventNames.MATCHMAKING_CANCEL, () =>
      this.handleMatchmakingCancel(socket)
    );

    // Room events
    socket.on('join_room', (roomId: string) =>
      this.handleJoinRoom(socket, roomId)
    );
    socket.on('leave_room', (roomId: string) =>
      this.handleLeaveRoom(socket, roomId)
    );

    // Gameplay events
    socket.on(EventNames.PLAYER_INPUT, (data: PlayerInputEvent) =>
      this.handlePlayerInput(socket, data)
    );
    socket.on(EventNames.PLAYER_JUMP, () =>
      this.handlePlayerJump(socket)
    );
    socket.on(EventNames.PLAYER_SKILL, (skillId: string) =>
      this.handlePlayerSkill(socket, skillId)
    );
    socket.on(EventNames.PLAYER_COLLECT_ITEM, (itemId: string) =>
      this.handleCollectItem(socket, itemId)
    );

    // Chat events
    socket.on(EventNames.CHAT_MESSAGE, (data: ChatMessageEvent) =>
      this.handleChatMessage(socket, data)
    );

    // Ping
    socket.on(EventNames.PING, () => this.handlePing(socket));
  }

  // ========== Matchmaking ==========

  private handleMatchmakingRequest(socket: Socket, data: MatchmakingRequestEvent): void {
    try {
      const requestId = this.matchmaker.enqueuePlayer(socket, data);
      logger.info(`Matchmaking request from ${socket.id}: ${requestId}`);
    } catch (error) {
      socket.emit(EventNames.ERROR, { message: 'Matchmaking failed' });
      logger.error('Matchmaking error', error);
    }
  }

  private handleMatchmakingCancel(socket: Socket): void {
    const success = this.matchmaker.dequeuePlayer(socket.id);
    if (success) {
      socket.emit('matchmaking_canceled');
    }
  }

  // ========== Room ==========

  private handleJoinRoom(socket: Socket, roomId: string): void {
    const session = this.connectionManager.getSession(socket.id);
    if (!session) {
      socket.emit(EventNames.ERROR, { message: 'Session not found' });
      return;
    }

    const room = this.roomManager.getRoom(roomId);
    if (!room) {
      socket.emit(EventNames.ERROR, { message: 'Room does not exist' });
      return;
    }

    const success = this.roomManager.addPlayer(
      roomId,
      session.playerId,
      socket.id
    );
    if (success) {
      socket.join(roomId);
      socket.emit('room_join_success', { roomId });
    } else {
      socket.emit(EventNames.ERROR, { message: 'Cannot join room' });
    }
  }

  private handleLeaveRoom(socket: Socket, roomId: string): void {
    const session = this.connectionManager.getSession(socket.id);
    if (!session) return;

    const success = this.roomManager.removePlayer(roomId, session.playerId);
    if (success) {
      socket.leave(roomId);
      socket.emit('room_left', { roomId });
    }
  }

  // ========== Gameplay ==========

  private handlePlayerInput(socket: Socket, data: PlayerInputEvent): void {
    const session = this.connectionManager.getSession(socket.id);
    if (!session || !session.roomId) return;

    // Apply input to game state
    this.gameSync.applyPlayerInput(session.roomId, session.playerId, data);

    // Broadcast to other players in room (optional)
    socket.to(session.roomId).emit(EventNames.PLAYER_INPUT, {
      ...data,
      playerId: session.playerId,
    });
  }

  private handlePlayerJump(socket: Socket): void {
    const session = this.connectionManager.getSession(socket.id);
    if (!session || !session.roomId) return;

    // Logic for jump (e.g., apply physics)
    socket.to(session.roomId).emit(EventNames.PLAYER_JUMP, {
      playerId: session.playerId,
    });
  }

  private handlePlayerSkill(socket: Socket, skillId: string): void {
    const session = this.connectionManager.getSession(socket.id);
    if (!session || !session.roomId) return;

    // Validate skill cooldown, etc.
    socket.to(session.roomId).emit(EventNames.PLAYER_SKILL, {
      playerId: session.playerId,
      skillId,
    });
  }

  private handleCollectItem(socket: Socket, itemId: string): void {
    const session = this.connectionManager.getSession(socket.id);
    if (!session || !session.roomId) return;

    // Update inventory, score, etc.
    socket.to(session.roomId).emit(EventNames.PLAYER_COLLECT_ITEM, {
      playerId: session.playerId,
      itemId,
    });
  }

  // ========== Chat ==========

  private handleChatMessage(socket: Socket, data: ChatMessageEvent): void {
    const session = this.connectionManager.getSession(socket.id);
    if (!session) return;

    if (data.channel === 'room' && session.roomId) {
      socket.to(session.roomId).emit(EventNames.CHAT_MESSAGE, {
        playerId: session.playerId,
        ...data,
      });
    } else if (data.channel === 'global') {
      socket.broadcast.emit(EventNames.CHAT_MESSAGE, {
        playerId: session.playerId,
        ...data,
      });
    } else if (data.channel === 'whisper' && data.targetPlayerId) {
      const targetSession = this.connectionManager.getSessionByPlayerId(data.targetPlayerId);
      if (targetSession) {
        const targetSocket = socket.nsp.sockets.get(targetSession.socketId);
        if (targetSocket) {
          targetSocket.emit(EventNames.CHAT_WHISPER, {
            fromPlayerId: session.playerId,
            ...data,
          });
        }
      }
    }
  }

  // ========== Ping ==========

  private handlePing(socket: Socket): void {
    socket.emit(EventNames.PONG, { serverTime: Date.now() });
  }
}