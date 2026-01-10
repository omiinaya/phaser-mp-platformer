import { Server } from 'socket.io';
import { RoomManager } from './RoomManager';
import { logger } from '../utils/logger';

/**
 * Represents a game state snapshot.
 */
export interface GameStateSnapshot {
  timestamp: number;
  roomId: string;
  entities: Record<string, any>; // entityId -> state
  events: any[];
}

/**
 * Delta-compressed state update.
 */
export interface DeltaSnapshot {
  timestamp: number;
  roomId: string;
  entities: Record<string, any>; // only changed entities
  deletedEntities: string[];
  events: any[];
  full: boolean; // whether this is a full snapshot
}

/**
 * Manages game state synchronization across clients.
 * Broadcasts game state updates at a fixed tick rate.
 */
export class GameSync {
  private io: Server;
  private roomManager: RoomManager;
  private tickRate: number; // Hz
  private tickInterval: NodeJS.Timeout | null = null;
  private roomStates: Map<string, GameStateSnapshot> = new Map();
  private previousStates: Map<string, GameStateSnapshot> = new Map();
  private useDeltaCompression: boolean = true;

  constructor(io: Server, roomManager: RoomManager, tickRate: number = 20) {
    this.io = io;
    this.roomManager = roomManager;
    this.tickRate = tickRate;
  }

  /**
   * Start the synchronization loop for all active rooms.
   */
  public start(): void {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
    }
    const tickMs = 1000 / this.tickRate;
    this.tickInterval = setInterval(() => this.tick(), tickMs);
    logger.info(`GameSync started with tick rate ${this.tickRate} Hz`);
  }

  /**
   * Stop the synchronization loop.
   */
  public stop(): void {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
      logger.info('GameSync stopped');
    }
  }

  /**
   * Main tick function: update and broadcast state for each active room.
   */
  private tick(): void {
    const activeRooms = this.roomManager.getActiveRooms();
    for (const room of activeRooms) {
      this.updateRoomState(room.roomId);
      this.broadcastState(room.roomId);
    }
  }

  /**
   * Update the authoritative game state for a room.
   * This would integrate player inputs, apply game logic, etc.
   */
  private updateRoomState(roomId: string): void {
    // Placeholder: in a real implementation, you would process pending inputs,
    // run physics, resolve collisions, etc.
    const currentState = this.roomStates.get(roomId) || this.createEmptyState(roomId);
    // Simulate some change
    currentState.timestamp = Date.now();
    // TODO: apply game logic
    this.roomStates.set(roomId, currentState);
  }

  /**
   * Compute delta between previous and current state.
   */
  private computeDelta(roomId: string): DeltaSnapshot {
    const current = this.roomStates.get(roomId);
    const previous = this.previousStates.get(roomId);
    if (!current) {
      return {
        timestamp: Date.now(),
        roomId,
        entities: {},
        deletedEntities: [],
        events: [],
        full: true,
      };
    }

    // If no previous state or delta compression disabled, send full snapshot
    if (!previous || !this.useDeltaCompression) {
      this.previousStates.set(roomId, { ...current });
      return {
        timestamp: current.timestamp,
        roomId: current.roomId,
        entities: current.entities,
        deletedEntities: [],
        events: current.events,
        full: true,
      };
    }

    // Compute changed entities
    const changedEntities: Record<string, any> = {};
    const deletedEntities: string[] = [];

    // Check for modifications or additions
    for (const [id, entity] of Object.entries(current.entities)) {
      const prevEntity = previous.entities[id];
      if (!prevEntity || JSON.stringify(prevEntity) !== JSON.stringify(entity)) {
        changedEntities[id] = entity;
      }
    }

    // Check for deletions
    for (const id of Object.keys(previous.entities)) {
      if (!current.entities[id]) {
        deletedEntities.push(id);
      }
    }

    // If delta is larger than a threshold, send full snapshot
    const deltaSize = Object.keys(changedEntities).length + deletedEntities.length;
    const totalEntities = Object.keys(current.entities).length;
    if (deltaSize > totalEntities * 0.5) {
      // Delta is large, send full snapshot
      this.previousStates.set(roomId, { ...current });
      return {
        timestamp: current.timestamp,
        roomId: current.roomId,
        entities: current.entities,
        deletedEntities: [],
        events: current.events,
        full: true,
      };
    }

    // Store current as previous for next delta
    this.previousStates.set(roomId, { ...current });

    return {
      timestamp: current.timestamp,
      roomId: current.roomId,
      entities: changedEntities,
      deletedEntities,
      events: current.events,
      full: false,
    };
  }

  /**
   * Broadcast the current state to all clients in the room.
   * Uses delta compression to send only changed entities.
   */
  private broadcastState(roomId: string): void {
    const delta = this.computeDelta(roomId);
    this.io.to(roomId).emit('game_state_update', delta);

    // Optional: log bandwidth usage
    logger.debug(`Broadcast state for room ${roomId} (full: ${delta.full})`);
  }

  /**
   * Create an empty game state for a room.
   */
  private createEmptyState(roomId: string): GameStateSnapshot {
    return {
      timestamp: Date.now(),
      roomId,
      entities: {},
      events: [],
    };
  }

  /**
   * Apply player input to the game state.
   * Called when a 'player_input' event is received.
   */
  public applyPlayerInput(
    roomId: string,
    playerId: string,
    input: any
  ): void {
    const state = this.roomStates.get(roomId);
    if (!state) return;

    // Validate input (e.g., prevent cheating)
    const validated = this.validateInput(input);
    if (!validated) {
      logger.warn(`Invalid input from player ${playerId} in room ${roomId}`);
      return;
    }

    // Update entity state (placeholder)
    state.entities[playerId] = {
      ...state.entities[playerId],
      ...input,
      lastUpdated: Date.now(),
    };

    // You could also add to an event queue for processing in the next tick
    state.events.push({
      type: 'player_input',
      playerId,
      input,
      timestamp: Date.now(),
    });

    logger.debug(`Applied input from player ${playerId} in room ${roomId}`);
  }

  /**
   * Validate player input (anti-cheat).
   */
  private validateInput(input: any): boolean {
    // Basic validation: ensure required fields, within bounds, etc.
    if (!input || typeof input !== 'object') return false;
    // Add more checks as needed
    return true;
  }

  /**
   * Get current game state for a room (for debugging).
   */
  public getRoomState(roomId: string): GameStateSnapshot | undefined {
    return this.roomStates.get(roomId);
  }

  /**
   * Reset game state for a room (e.g., new round).
   */
  public resetRoomState(roomId: string): void {
    this.roomStates.set(roomId, this.createEmptyState(roomId));
    this.previousStates.delete(roomId);
  }
}