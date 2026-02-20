import { Server, Socket } from 'socket.io';
import { ConnectionManager } from './ConnectionManager';
import { RoomManager } from './RoomManager';
import {
  MatchmakingRequest,
  MatchmakingPreferences,
} from '../types/matchmaking';
import { logger } from '../utils/logger';
import { MatchmakingWorker } from '../workers/MatchmakingWorker';

/**
 * Simple matchmaking service that groups players into rooms.
 */
export class Matchmaker {
  private io: Server;
  private connectionManager: ConnectionManager;
  private roomManager: RoomManager;
  private queue: MatchmakingRequest[] = [];
  private matchmakingInterval: NodeJS.Timeout | null = null;
  private readonly MATCHMAKING_TICK_MS = 5000; // Check every 5 seconds
  private worker: MatchmakingWorker;

  constructor(
    io: Server,
    connectionManager: ConnectionManager,
    roomManager: RoomManager,
  ) {
    this.io = io;
    this.connectionManager = connectionManager;
    this.roomManager = roomManager;
    this.worker = new MatchmakingWorker();
    this.startMatchmakingLoop();
  }

  /**
   * Start periodic matchmaking processing.
   */
  private startMatchmakingLoop(): void {
    if (this.matchmakingInterval) {
      clearInterval(this.matchmakingInterval);
    }
    this.matchmakingInterval = setInterval(
      () => this.processQueue(),
      this.MATCHMAKING_TICK_MS,
    );
    logger.info('Matchmaking loop started');
  }

  /**
   * Stop matchmaking loop (e.g., on server shutdown).
   */
  public stop(): void {
    if (this.matchmakingInterval) {
      clearInterval(this.matchmakingInterval);
      this.matchmakingInterval = null;
      logger.info('Matchmaking loop stopped');
    }
    this.worker.terminate();
  }

  /**
   * Add a player to the matchmaking queue.
   */
  public enqueuePlayer(
    socket: Socket,
    preferences: MatchmakingPreferences,
  ): string {
    const session = this.connectionManager.getSession(socket.id);
    if (!session) {
      throw new Error('Player session not found');
    }

    const requestId = `req_${Date.now()}_${socket.id}`;
    const request: MatchmakingRequest = {
      requestId,
      playerId: session.playerId,
      socketId: socket.id,
      preferences,
      queuedAt: new Date(),
    };

    this.queue.push(request);
    logger.debug(`Player ${session.playerId} enqueued for matchmaking`, {
      requestId,
      preferences,
    });

    socket.emit('matchmaking_queued', {
      requestId,
      estimatedWait: this.estimateWaitTime(),
    });

    return requestId;
  }

  /**
   * Remove a player from the queue (e.g., if they cancel).
   */
  public dequeuePlayer(socketId: string): boolean {
    const index = this.queue.findIndex((req) => req.socketId === socketId);
    if (index >= 0) {
      const removed = this.queue.splice(index, 1)[0];
      logger.debug(`Player ${removed.playerId} dequeued from matchmaking`);
      return true;
    }
    return false;
  }

  /**
   * Process the queue and create matches.
   */
  private async processQueue(): Promise<void> {
    if (this.queue.length === 0) return;

    logger.debug(`Processing matchmaking queue (${this.queue.length} players)`);

    try {
      const matches = await this.worker.process(this.queue);
      for (const match of matches) {
        this.createMatch(match.matchedRequests);
        // Remove matched requests from queue
        match.matchedRequests.forEach((req) =>
          this.dequeuePlayer(req.socketId),
        );
      }
    } catch (error) {
      logger.error('Matchmaking worker failed:', error);
      // Fallback to synchronous processing
      this.fallbackProcessQueue();
    }
  }

  /**
   * Fallback synchronous processing if worker fails.
   */
  private fallbackProcessQueue(): void {
    // Group by gameMode and region (simple implementation)
    const groups = this.groupByGameMode(this.queue);

    for (const [, requests] of groups) {
      const maxPlayers = 4; // default
      if (requests.length >= maxPlayers) {
        // Create a room with the first maxPlayers
        const matchedRequests = requests.slice(0, maxPlayers);
        this.createMatch(matchedRequests);
        // Remove matched requests from queue
        matchedRequests.forEach((req) => this.dequeuePlayer(req.socketId));
      }
    }
  }

  /**
   * Group requests by gameMode and region.
   */
  private groupByGameMode(
    requests: MatchmakingRequest[],
  ): Map<string, MatchmakingRequest[]> {
    const map = new Map<string, MatchmakingRequest[]>();
    for (const req of requests) {
      const key = `${req.preferences.gameMode}_${req.preferences.region || 'any'}`;
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(req);
    }
    return map;
  }

  /**
   * Create a match (room) for the given requests.
   */
  private createMatch(requests: MatchmakingRequest[]): void {
    const roomId = `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const playerInfos = requests.map((req) => ({
      playerId: req.playerId,
      socketId: req.socketId,
    }));

    // Create room via RoomManager
    this.roomManager.createRoom(roomId, {
      gameMode: requests[0].preferences.gameMode,
      maxPlayers: requests[0].preferences.maxPlayers || 4,
      players: playerInfos,
    });

    // Assign each socket to the room
    requests.forEach((req) => {
      this.connectionManager.assignRoom(req.socketId, roomId);
      const socket = this.io.sockets.sockets.get(req.socketId);
      if (socket) {
        socket.join(roomId);
        socket.emit('matchmaking_success', {
          roomId,
          players: playerInfos,
        });
      }
    });

    // Broadcast room_joined to all in room
    this.io.to(roomId).emit('room_joined', {
      roomId,
      players: playerInfos,
      gameMode: requests[0].preferences.gameMode,
    });

    logger.info(
      `Match created: room ${roomId} with ${playerInfos.length} players`,
    );
  }

  /**
   * Estimate wait time in seconds (naive).
   */
  private estimateWaitTime(): number {
    const avgPlayersPerMinute = 10; // placeholder
    const neededPlayers = 4;
    return Math.max(30, (neededPlayers / avgPlayersPerMinute) * 60);
  }

  /**
   * Get queue length.
   */
  public getQueueLength(): number {
    return this.queue.length;
  }

  /**
   * Get queue status for a socket.
   */
  public getQueueStatus(socketId: string): MatchmakingRequest | undefined {
    return this.queue.find((req) => req.socketId === socketId);
  }
}
