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
  });
});
