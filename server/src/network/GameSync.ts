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
   * This integrates player inputs, applies game logic, physics, etc.
   */
  private updateRoomState(roomId: string): void {
    const currentState =
      this.roomStates.get(roomId) || this.createEmptyState(roomId);
    const now = Date.now();
    const deltaTime = (now - currentState.timestamp) / 1000; // seconds
    currentState.timestamp = now;

    // Apply game logic to each entity
    for (const [entityId, entity] of Object.entries(currentState.entities)) {
      if (!entity) continue;

      // Apply physics simulation
      if (entity.velocity) {
        // Update position based on velocity
        if (entity.position) {
          entity.position.x += (entity.velocity.x || 0) * deltaTime;
          entity.position.y += (entity.velocity.y || 0) * deltaTime;
        }

        // Apply gravity for falling entities
        if (entity.affectedByGravity && entity.velocity.y !== undefined) {
          entity.velocity.y += 9.8 * deltaTime; // gravity acceleration
        }
      }

      // Check for out of bounds
      if (entity.position) {
        if (entity.position.y > 1000) {
          // Entity fell off the world
          delete currentState.entities[entityId];
          currentState.events.push({
            type: 'entity_destroyed',
            entityId,
            reason: 'out_of_bounds',
            timestamp: now,
          });
          continue;
        }
      }

      // Update last processed time
      entity.lastUpdated = now;
    }

    // Process events (inputs, collisions, etc.)
    const eventsToProcess = [...currentState.events];
    currentState.events = [];

    for (const event of eventsToProcess) {
      this.processGameEvent(currentState, event);
    }

    this.roomStates.set(roomId, currentState);
  }

  /**
   * Process a game event and update state accordingly.
   */
  private processGameEvent(state: GameStateSnapshot, event: any): void {
    switch (event.type) {
    case 'player_input': {
      const entity = state.entities[event.playerId];
      if (entity) {
        // Apply player movement
        if (event.input.moveX !== undefined) {
          entity.velocity = entity.velocity || { x: 0, y: 0 };
          entity.velocity.x = event.input.moveX * 200; // movement speed
        }
        if (event.input.jump && entity.isOnGround) {
          entity.velocity = entity.velocity || { x: 0, y: 0 };
          entity.velocity.y = -400; // jump force
          entity.isOnGround = false;
        }
      }
      break;
    }

    case 'collision': {
      // Handle collision between entities
      const entity1 = state.entities[event.entityId1];
      const entity2 = state.entities[event.entityId2];
      if (entity1 && entity2) {
        // Apply collision response
        if (event.damage) {
          entity2.health = (entity2.health || 100) - event.damage;
          if (entity2.health <= 0) {
            state.events.push({
              type: 'entity_destroyed',
              entityId: event.entityId2,
              reason: 'destroyed',
              timestamp: Date.now(),
            });
          }
        }
      }
      break;
    }

    case 'entity_destroyed': {
      // Entity was destroyed, remove from state
      delete state.entities[event.entityId];
      break;
    }

    default:
      // Unknown event type, log for debugging
      logger.debug(`Unknown game event type: ${event.type}`);
    }
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
      if (
        !prevEntity ||
        JSON.stringify(prevEntity) !== JSON.stringify(entity)
      ) {
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
    const deltaSize =
      Object.keys(changedEntities).length + deletedEntities.length;
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
  public applyPlayerInput(roomId: string, playerId: string, input: any): void {
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
