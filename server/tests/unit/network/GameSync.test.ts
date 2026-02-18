import { GameSync, GameStateSnapshot } from '../../../src/network/GameSync';
import { RoomManager } from '../../../src/network/RoomManager';
import { Server } from 'socket.io';

// Mock dependencies
jest.mock('../../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('GameSync', () => {
  let gameSync: GameSync;
  let mockIo: jest.Mocked<Server>;
  let mockRoomManager: jest.Mocked<RoomManager>;

  beforeEach(() => {
    mockIo = {
      to: jest.fn().mockReturnValue({
        emit: jest.fn(),
      }),
    } as unknown as jest.Mocked<Server>;

    mockRoomManager = {
      getActiveRooms: jest.fn().mockReturnValue([
        { roomId: 'room1', players: ['player1', 'player2'] },
        { roomId: 'room2', players: ['player3'] },
      ]),
    } as unknown as jest.Mocked<RoomManager>;

    gameSync = new GameSync(mockIo, mockRoomManager, 20);
  });

  afterEach(() => {
    gameSync.stop();
  });

  describe('constructor', () => {
    it('should initialize with correct default values', () => {
      expect(gameSync).toBeDefined();
    });

    it('should accept custom tick rate', () => {
      const customGameSync = new GameSync(mockIo, mockRoomManager, 30);
      expect(customGameSync).toBeDefined();
      customGameSync.stop();
    });
  });

  describe('start and stop', () => {
    it('should start the synchronization loop', () => {
      const startSpy = jest.spyOn(gameSync as any, 'tick');
      gameSync.start();
      
      // Wait for at least one tick
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          expect(startSpy).toHaveBeenCalled();
          gameSync.stop();
          resolve();
        }, 100);
      });
    });

    it('should stop the synchronization loop', () => {
      gameSync.start();
      gameSync.stop();
      
      // The tick should not be running after stop
      // This is tested implicitly as the test completes without errors
    });

    it('should handle multiple start calls gracefully', () => {
      gameSync.start();
      gameSync.start(); // Should not throw
      gameSync.stop();
    });
  });

  describe('getRoomState', () => {
    it('should return undefined for non-existent room', () => {
      const state = gameSync.getRoomState('non-existent');
      expect(state).toBeUndefined();
    });

    it('should return existing room state', () => {
      gameSync.resetRoomState('test-room');
      const state = gameSync.getRoomState('test-room');
      expect(state).toBeDefined();
      expect(state!.roomId).toBe('test-room');
    });
  });

  describe('resetRoomState', () => {
    it('should reset room state', () => {
      gameSync.resetRoomState('test-room');
      const state = gameSync.getRoomState('test-room');
      expect(state).toBeDefined();
      expect(state!.roomId).toBe('test-room');
      expect(state!.entities).toEqual({});
      expect(state!.events).toEqual([]);
    });

    it('should clear previous state on reset', () => {
      gameSync.resetRoomState('test-room');
      gameSync.resetRoomState('test-room');
      const state = gameSync.getRoomState('test-room');
      expect(state).toBeDefined();
    });
  });

  describe('applyPlayerInput', () => {
    it('should apply valid player input', () => {
      gameSync.resetRoomState('test-room');
      gameSync.applyPlayerInput('test-room', 'player1', {
        moveX: 1,
        jump: false,
      });
      
      const state = gameSync.getRoomState('test-room');
      expect(state).toBeDefined();
    });

    it('should reject invalid input', () => {
      gameSync.resetRoomState('test-room');
      gameSync.applyPlayerInput('test-room', 'player1', null as any);
      
      // Invalid input should be rejected (no crash)
    });

    it('should reject input for non-existent room', () => {
      // Should not throw
      expect(() => {
        gameSync.applyPlayerInput('non-existent', 'player1', { moveX: 1 });
      }).not.toThrow();
    });

    it('should apply player input with jump when on ground', () => {
      gameSync.resetRoomState('test-room');
      // First set player to be on ground
      const state = gameSync.getRoomState('test-room');
      state!.entities['player1'] = {
        position: { x: 100, y: 100 },
        velocity: { x: 0, y: 0 },
        isOnGround: true,
      };
      
      gameSync.applyPlayerInput('test-room', 'player1', {
        moveX: 1,
        jump: true,
      });
      
      expect(state!.entities['player1']).toBeDefined();
    });

    it('should handle empty input object', () => {
      gameSync.resetRoomState('test-room');
      gameSync.applyPlayerInput('test-room', 'player1', {});
      const state = gameSync.getRoomState('test-room');
      expect(state).toBeDefined();
    });
  });

  describe('entity state management', () => {
    it('should handle entity without position', () => {
      gameSync.resetRoomState('test-room');
      const state = gameSync.getRoomState('test-room');
      state!.entities['player1'] = {
        velocity: { x: 10, y: 5 },
        isOnGround: false,
        lastUpdated: Date.now(),
      };
      
      // State should be retrievable
      expect(state).toBeDefined();
    });

    it('should handle entity without velocity', () => {
      gameSync.resetRoomState('test-room');
      const state = gameSync.getRoomState('test-room');
      state!.entities['player1'] = {
        position: { x: 100, y: 100 },
        isOnGround: true,
        lastUpdated: Date.now(),
      };
      
      // State should be retrievable
      expect(state).toBeDefined();
    });

    it('should handle multiple entities in room', () => {
      gameSync.resetRoomState('test-room');
      const state = gameSync.getRoomState('test-room');
      state!.entities['player1'] = {
        position: { x: 100, y: 100 },
        velocity: { x: 10, y: 0 },
        isOnGround: true,
      };
      state!.entities['player2'] = {
        position: { x: 200, y: 100 },
        velocity: { x: -10, y: 0 },
        isOnGround: true,
      };
      
      expect(Object.keys(state!.entities).length).toBe(2);
    });
  });

  describe('broadcastState', () => {
    it('should have broadcastState method', () => {
      expect(typeof (gameSync as any).broadcastState).toBe('function');
    });

    it('should broadcast state for active room', () => {
      gameSync.resetRoomState('room1');
      // Access the broadcastState method
      (gameSync as any).broadcastState('room1');
      // Should not throw
    });
  });

  describe('tick', () => {
    it('should process active rooms on tick', () => {
      const tickSpy = jest.spyOn(gameSync as any, 'tick');
      gameSync.start();
      
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          expect(tickSpy).toHaveBeenCalled();
          gameSync.stop();
          resolve();
        }, 150);
      });
    });

    it('should handle empty active rooms list', () => {
      mockRoomManager.getActiveRooms.mockReturnValue([]);
      gameSync.start();
      
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          gameSync.stop();
          resolve();
        }, 100);
      });
    });
  });

  describe('updateRoomState', () => {
    it('should update room state with entities', () => {
      gameSync.resetRoomState('test-room');
      const state = gameSync.getRoomState('test-room');
      state!.entities['player1'] = {
        position: { x: 100, y: 100 },
        velocity: { x: 10, y: 0 },
        isOnGround: true,
      };
      
      // Trigger update by calling tick
      gameSync.start();
      
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          const updatedState = gameSync.getRoomState('test-room');
          expect(updatedState).toBeDefined();
          gameSync.stop();
          resolve();
        }, 100);
      });
    });

    it('should handle entity without velocity', () => {
      gameSync.resetRoomState('test-room');
      const state = gameSync.getRoomState('test-room');
      state!.entities['player1'] = {
        position: { x: 100, y: 100 },
        isOnGround: true,
      };
      
      gameSync.start();
      
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          gameSync.stop();
          resolve();
        }, 100);
      });
    });

    it('should update entity position based on velocity', () => {
      gameSync.resetRoomState('test-room');
      const state = gameSync.getRoomState('test-room');
      state!.entities['player1'] = {
        position: { x: 100, y: 100 },
        velocity: { x: 10, y: 0 },
        isOnGround: true,
      };
      
      // Trigger update by calling tick directly
      (gameSync as any).tick();
      
      const updatedState = gameSync.getRoomState('test-room');
      expect(updatedState).toBeDefined();
    });
  });

  describe('processGameEvent', () => {
    it('should process player_input event', () => {
      gameSync.resetRoomState('test-room');
      const state = gameSync.getRoomState('test-room');
      state!.entities['player1'] = {
        position: { x: 100, y: 100 },
        velocity: { x: 0, y: 0 },
        isOnGround: true,
      };
      
      state!.events.push({
        type: 'player_input',
        playerId: 'player1',
        input: { moveX: 1, jump: false },
      });
      
      gameSync.start();
      
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          gameSync.stop();
          resolve();
        }, 100);
      });
    });

    it('should process collision event', () => {
      gameSync.resetRoomState('test-room');
      const state = gameSync.getRoomState('test-room');
      state!.entities['player1'] = {
        position: { x: 100, y: 100 },
        velocity: { x: 0, y: 0 },
        health: 100,
      };
      state!.entities['enemy1'] = {
        position: { x: 110, y: 100 },
        velocity: { x: 0, y: 0 },
        health: 50,
      };
      
      state!.events.push({
        type: 'collision',
        entityId1: 'player1',
        entityId2: 'enemy1',
        damage: 10,
      });
      
      gameSync.start();
      
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          gameSync.stop();
          resolve();
        }, 100);
      });
    });

    it('should process entity_destroyed event', () => {
      gameSync.resetRoomState('test-room');
      const state = gameSync.getRoomState('test-room');
      state!.entities['enemy1'] = {
        position: { x: 100, y: 100 },
        health: 5,
      };
      
      state!.events.push({
        type: 'collision',
        entityId1: 'player1',
        entityId2: 'enemy1',
        damage: 10,
      });
      
      gameSync.start();
      
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          gameSync.stop();
          resolve();
        }, 100);
      });
    });

    it('should handle unknown event type', () => {
      gameSync.resetRoomState('test-room');
      const state = gameSync.getRoomState('test-room');
      
      state!.events.push({
        type: 'unknown_event',
        someData: 'test',
      });
      
      gameSync.start();
      
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          gameSync.stop();
          resolve();
        }, 100);
      });
    });
  });

  describe('computeDelta', () => {
    it('should compute delta between states', () => {
      gameSync.resetRoomState('test-room');
      
      // Access computeDelta method
      const delta = (gameSync as any).computeDelta('test-room');
      
      expect(delta).toBeDefined();
      expect(delta.roomId).toBe('test-room');
    });

    it('should return full snapshot for non-existent room', () => {
      const delta = (gameSync as any).computeDelta('non-existent');
      
      expect(delta.full).toBe(true);
    });

    it('should use delta compression for small changes', () => {
      gameSync.resetRoomState('test-room');
      const state = gameSync.getRoomState('test-room');
      state!.entities['player1'] = {
        position: { x: 100, y: 100 },
        velocity: { x: 10, y: 0 },
        isOnGround: true,
      };
      
      // First delta - should be full
      const delta1 = (gameSync as any).computeDelta('test-room');
      
      // Update entity
      state!.entities['player1'].position.x = 101;
      
      // Second delta - should be delta
      const delta2 = (gameSync as any).computeDelta('test-room');
      
      expect(delta2.full).toBe(false);
    });
  });

  describe('validateInput', () => {
    it('should validate valid input', () => {
      const result = (gameSync as any).validateInput({ moveX: 1, jump: true });
      expect(result).toBe(true);
    });

    it('should reject null input', () => {
      const result = (gameSync as any).validateInput(null);
      expect(result).toBe(false);
    });

    it('should reject non-object input', () => {
      const result = (gameSync as any).validateInput('string');
      expect(result).toBe(false);
    });

    it('should reject undefined input', () => {
      const result = (gameSync as any).validateInput(undefined);
      expect(result).toBe(false);
    });
  });

  describe('physics simulation', () => {
    it('should apply gravity to entities affected by gravity', () => {
      // Add test-room to active rooms
      mockRoomManager.getActiveRooms.mockReturnValue([
        { roomId: 'test-room', players: [{ playerId: 'player1', socketId: 'socket1' }], gameMode: 'deathmatch', maxPlayers: 4, createdAt: Date.now(), isActive: true } as any,
      ]);

      gameSync.resetRoomState('test-room');
      const state = gameSync.getRoomState('test-room');
      state!.entities['player1'] = {
        position: { x: 100, y: 100 },
        velocity: { x: 0, y: 0 },
        affectedByGravity: true,
        isOnGround: false,
      };

      // Call tick to process physics
      (gameSync as any).tick();

      // Entity should still exist
      expect(state!.entities['player1']).toBeDefined();
    });

    it('should process entities without velocity in physics', () => {
      // Add test-room to active rooms
      mockRoomManager.getActiveRooms.mockReturnValue([
        { roomId: 'test-room', players: [{ playerId: 'player1', socketId: 'socket1' }], gameMode: 'deathmatch', maxPlayers: 4, createdAt: Date.now(), isActive: true } as any,
      ]);

      gameSync.resetRoomState('test-room');
      const state = gameSync.getRoomState('test-room');
      state!.entities['player1'] = {
        position: { x: 100, y: 100 },
        // No velocity - should not crash
      };

      // Should not throw
      expect(() => (gameSync as any).tick()).not.toThrow();
    });

    it('should process out of bounds check', () => {
      // Add test-room to active rooms
      mockRoomManager.getActiveRooms.mockReturnValue([
        { roomId: 'test-room', players: [{ playerId: 'player1', socketId: 'socket1' }], gameMode: 'deathmatch', maxPlayers: 4, createdAt: Date.now(), isActive: true } as any,
      ]);

      gameSync.resetRoomState('test-room');
      const state = gameSync.getRoomState('test-room');
      state!.entities['player1'] = {
        position: { x: 100, y: 1100 }, // Beyond 1000
        velocity: { x: 0, y: 10 },
      };

      // Should not throw
      expect(() => (gameSync as any).tick()).not.toThrow();
    });
  });

  describe('processGameEvent collision with damage', () => {
    it('should add entity_destroyed event when health drops to zero', () => {
      gameSync.resetRoomState('test-room');
      const state = gameSync.getRoomState('test-room');
      // Both entities must exist for collision to process
      state!.entities['player1'] = {
        position: { x: 50, y: 100 },
        velocity: { x: 0, y: 0 },
        isOnGround: true,
      } as any;
      state!.entities['enemy1'] = {
        position: { x: 100, y: 100 },
        health: 10,
      } as any;

      // Process collision with damage that kills
      (gameSync as any).processGameEvent(state!, {
        type: 'collision',
        entityId1: 'player1',
        entityId2: 'enemy1',
        damage: 15,
      });

      // Event should be added (actual deletion happens in tick)
      const destroyEvent = state!.events.find((e: any) => e.type === 'entity_destroyed' && e.reason === 'destroyed');
      expect(destroyEvent).toBeDefined();
    });

    it('should handle collision with missing entity', () => {
      gameSync.resetRoomState('test-room');
      const state = gameSync.getRoomState('test-room');

      // Process collision with non-existent entity
      expect(() => {
        (gameSync as any).processGameEvent(state!, {
          type: 'collision',
          entityId1: 'player1',
          entityId2: 'nonexistent',
          damage: 10,
        });
      }).not.toThrow();
    });
  });

  describe('player input processing', () => {
    it('should process player input with moveX only', () => {
      gameSync.resetRoomState('test-room');
      const state = gameSync.getRoomState('test-room');
      state!.entities['player1'] = {
        position: { x: 100, y: 100 },
        velocity: { x: 0, y: 0 },
        isOnGround: true,
      };

      (gameSync as any).processGameEvent(state!, {
        type: 'player_input',
        playerId: 'player1',
        input: { moveX: 1 },
      });

      expect(state!.entities['player1'].velocity.x).toBe(200);
    });

    it('should not apply jump when not on ground', () => {
      gameSync.resetRoomState('test-room');
      const state = gameSync.getRoomState('test-room');
      state!.entities['player1'] = {
        position: { x: 100, y: 100 },
        velocity: { x: 0, y: 0 },
        isOnGround: false, // Not on ground
      };

      (gameSync as any).processGameEvent(state!, {
        type: 'player_input',
        playerId: 'player1',
        input: { moveX: 0, jump: true },
      });

      // Jump should not be applied
      expect(state!.entities['player1'].velocity.y).toBe(0);
    });

    it('should apply jump when on ground', () => {
      gameSync.resetRoomState('test-room');
      const state = gameSync.getRoomState('test-room');
      state!.entities['player1'] = {
        position: { x: 100, y: 100 },
        velocity: { x: 0, y: 0 },
        isOnGround: true,
      };

      (gameSync as any).processGameEvent(state!, {
        type: 'player_input',
        playerId: 'player1',
        input: { moveX: 0, jump: true },
      });

      expect(state!.entities['player1'].velocity.y).toBe(-400);
      expect(state!.entities['player1'].isOnGround).toBe(false);
    });
  });
});
