import { ConnectionManager } from '../../../src/network/ConnectionManager';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { ProgressionService } from '../../../src/services/ProgressionService';
import { logger } from '../../../src/utils/logger';

// Mock dependencies
jest.mock('../../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('jsonwebtoken');
jest.mock('../../../src/services/ProgressionService');

describe('ConnectionManager', () => {
  let mockServer: jest.Mocked<Server>;
  let mockSocket: jest.Mocked<Socket>;
  let connectionManager: ConnectionManager;
  let mockProgressionService: jest.Mocked<ProgressionService>;
  let eventHandlers: Map<string, Function>;

  beforeEach(() => {
    eventHandlers = new Map();
    mockServer = {
      on: jest.fn((event: string, handler: Function) => {
        eventHandlers.set(event, handler);
        return mockServer;
      }),
      to: jest.fn().mockReturnValue({
        emit: jest.fn(),
      }),
      sockets: {
        sockets: new Map(),
      },
    } as any;

    mockSocket = {
      id: 'socket-123',
      handshake: {
        auth: {},
        query: {},
      },
      emit: jest.fn(),
      on: jest.fn((event: string, handler: Function) => {
        eventHandlers.set(`${mockSocket.id}:${event}`, handler);
        return mockSocket;
      }),
      join: jest.fn(),
      leave: jest.fn(),
    } as any;

    mockProgressionService = {
      initializePlayer: jest.fn().mockResolvedValue(undefined),
    } as any;

    jest.clearAllMocks();
    delete process.env.JWT_SECRET;
  });

  afterEach(() => {
    jest.clearAllMocks();
    delete process.env.JWT_SECRET;
  });

  describe('setupEventHandlers', () => {
    it('should set up connection handler on initialization', () => {
      connectionManager = new ConnectionManager(mockServer);
      expect(mockServer.on).toHaveBeenCalledWith(
        'connection',
        expect.any(Function),
      );
    });

    it('should set up connection handler with ProgressionService', () => {
      connectionManager = new ConnectionManager(
        mockServer,
        mockProgressionService,
      );
      expect(mockServer.on).toHaveBeenCalledWith(
        'connection',
        expect.any(Function),
      );
    });
  });

  describe('handleConnection', () => {
    beforeEach(() => {
      connectionManager = new ConnectionManager(mockServer);
    });

    it('should handle connection with valid JWT token', () => {
      const mockPlayerId = 'player-456';
      const mockToken = 'valid-token';
      process.env.JWT_SECRET = 'test-secret';

      mockSocket.handshake.auth = { token: mockToken };
      (jwt.verify as jest.Mock).mockReturnValue({ playerId: mockPlayerId });

      const connectionHandler = eventHandlers.get('connection')!;
      connectionHandler(mockSocket);

      expect(jwt.verify).toHaveBeenCalledWith(mockToken, 'test-secret');
      expect(mockSocket.emit).toHaveBeenCalledWith('connection_ack', {
        sessionId: 'socket-123',
        playerId: mockPlayerId,
        serverTime: expect.any(Number),
      });
    });

    it('should assign guest session when no token provided', () => {
      mockSocket.handshake.auth = {};
      mockSocket.handshake.query = {};

      const connectionHandler = eventHandlers.get('connection')!;
      connectionHandler(mockSocket);

      const session = connectionManager.getSession('socket-123');
      expect(session?.playerId).toBe('guest_socket-123');
      expect(mockSocket.emit).toHaveBeenCalledWith('connection_ack', {
        sessionId: 'socket-123',
        playerId: 'guest_socket-123',
        serverTime: expect.any(Number),
      });
    });

    it('should register disconnect event handler', () => {
      mockSocket.handshake.auth = {};
      mockSocket.handshake.query = {};

      const connectionHandler = eventHandlers.get('connection')!;
      connectionHandler(mockSocket);

      expect(mockSocket.on).toHaveBeenCalledWith(
        'disconnect',
        expect.any(Function),
      );
    });
  });

  describe('handleDisconnection', () => {
    beforeEach(() => {
      connectionManager = new ConnectionManager(mockServer);
    });

    it('should handle disconnection without room assignment', () => {
      mockSocket.handshake.auth = {};
      mockSocket.handshake.query = {};
      const connectionHandler = eventHandlers.get('connection')!;
      connectionHandler(mockSocket);

      const disconnectHandler = eventHandlers.get('socket-123:disconnect')!;
      disconnectHandler();

      expect(logger.info).toHaveBeenCalledWith(
        'Client disconnected: socket-123',
      );
      expect(connectionManager.getConnectedCount()).toBe(0);
    });

    it('should notify room on disconnection', () => {
      const mockEmit = jest.fn();
      mockServer.to = jest.fn().mockReturnValue({ emit: mockEmit });

      mockSocket.handshake.auth = {};
      mockSocket.handshake.query = {};
      const connectionHandler = eventHandlers.get('connection')!;
      connectionHandler(mockSocket);

      connectionManager.assignRoom('socket-123', 'room-1');

      const disconnectHandler = eventHandlers.get('socket-123:disconnect')!;
      disconnectHandler();

      expect(mockServer.to).toHaveBeenCalledWith('room-1');
      expect(mockEmit).toHaveBeenCalledWith('player_left', {
        playerId: 'guest_socket-123',
        socketId: 'socket-123',
      });
    });
  });

  describe('getSession', () => {
    beforeEach(() => {
      connectionManager = new ConnectionManager(mockServer);
      const connectionHandler = eventHandlers.get('connection')!;
      mockSocket.handshake.auth = {};
      mockSocket.handshake.query = {};
      connectionHandler(mockSocket);
    });

    it('should return session by socket ID', () => {
      const session = connectionManager.getSession('socket-123');
      expect(session).toBeDefined();
      expect(session?.socketId).toBe('socket-123');
    });

    it('should return undefined for unknown socket', () => {
      const session = connectionManager.getSession('unknown-socket');
      expect(session).toBeUndefined();
    });
  });

  describe('getSessionsInRoom', () => {
    beforeEach(() => {
      connectionManager = new ConnectionManager(mockServer);
      const connectionHandler = eventHandlers.get('connection')!;
      mockSocket.handshake.auth = {};
      mockSocket.handshake.query = {};
      connectionHandler(mockSocket);
    });

    it('should return all sessions in a room', () => {
      connectionManager.assignRoom('socket-123', 'room-1');

      const sessions = connectionManager.getSessionsInRoom('room-1');
      expect(sessions.length).toBe(1);
      expect(sessions[0].socketId).toBe('socket-123');
    });

    it('should return empty array for empty room', () => {
      const sessions = connectionManager.getSessionsInRoom('empty-room');
      expect(sessions).toEqual([]);
    });
  });

  describe('getConnectedCount', () => {
    beforeEach(() => {
      connectionManager = new ConnectionManager(mockServer);
    });

    it('should return connected client count', () => {
      const connectionHandler = eventHandlers.get('connection')!;
      mockSocket.handshake.auth = {};
      mockSocket.handshake.query = {};
      connectionHandler(mockSocket);

      expect(connectionManager.getConnectedCount()).toBe(1);
    });

    it('should return 0 when no clients connected', () => {
      expect(connectionManager.getConnectedCount()).toBe(0);
    });
  });

  describe('authenticateToken', () => {
    beforeEach(() => {
      connectionManager = new ConnectionManager(mockServer);
    });

    it('should return null when JWT_SECRET is not set', () => {
      mockSocket.handshake.auth = { token: 'some-token' };
      const connectionHandler = eventHandlers.get('connection')!;
      connectionHandler(mockSocket);

      // Should have assigned guest session since auth failed
      const session = connectionManager.getSession('socket-123');
      expect(session?.playerId).toBe('guest_socket-123');
      expect(logger.error).toHaveBeenCalledWith(
        'JWT_SECRET environment variable not set',
      );
    });

    it('should return null for invalid token', () => {
      process.env.JWT_SECRET = 'test-secret';
      mockSocket.handshake.auth = { token: 'invalid-token' };
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const connectionHandler = eventHandlers.get('connection')!;
      connectionHandler(mockSocket);

      // Should have assigned guest session since auth failed
      const session = connectionManager.getSession('socket-123');
      expect(session?.playerId).toBe('guest_socket-123');
      expect(logger.warn).toHaveBeenCalledWith('Invalid token: Invalid token');
    });

    it('should read token from query when not in auth', () => {
      const mockPlayerId = 'player-from-query';
      process.env.JWT_SECRET = 'test-secret';
      mockSocket.handshake.auth = {};
      mockSocket.handshake.query = { token: 'query-token' };
      (jwt.verify as jest.Mock).mockReturnValue({ playerId: mockPlayerId });

      const connectionHandler = eventHandlers.get('connection')!;
      connectionHandler(mockSocket);

      expect(jwt.verify).toHaveBeenCalledWith('query-token', 'test-secret');
      expect(mockSocket.emit).toHaveBeenCalledWith('connection_ack', {
        sessionId: 'socket-123',
        playerId: mockPlayerId,
        serverTime: expect.any(Number),
      });
    });
  });

  describe('handleReconnectAttempt', () => {
    beforeEach(() => {
      connectionManager = new ConnectionManager(mockServer);
    });

    it('should handle reconnect_attempt event', () => {
      mockSocket.handshake.auth = {};
      mockSocket.handshake.query = {};
      const connectionHandler = eventHandlers.get('connection')!;
      connectionHandler(mockSocket);

      const reconnectHandler = eventHandlers.get(
        'socket-123:reconnect_attempt',
      )!;
      reconnectHandler();

      expect(logger.debug).toHaveBeenCalledWith(
        'Reconnect attempt by socket-123',
      );
    });
  });

  describe('handlePing', () => {
    beforeEach(() => {
      connectionManager = new ConnectionManager(mockServer);
    });

    it('should respond with pong and update lastActivity', () => {
      mockSocket.handshake.auth = {};
      mockSocket.handshake.query = {};
      const connectionHandler = eventHandlers.get('connection')!;
      connectionHandler(mockSocket);

      const pingHandler = eventHandlers.get('socket-123:ping')!;
      pingHandler();

      expect(mockSocket.emit).toHaveBeenCalledWith('pong', {
        serverTime: expect.any(Number),
      });
    });

    it('should not emit pong for unknown session', () => {
      mockSocket.handshake.auth = {};
      mockSocket.handshake.query = {};
      const connectionHandler = eventHandlers.get('connection')!;
      connectionHandler(mockSocket);

      // Delete the session manually
      const disconnectHandler = eventHandlers.get('socket-123:disconnect')!;
      disconnectHandler();

      // Clear mock calls
      (mockSocket.emit as jest.Mock).mockClear();

      const pingHandler = eventHandlers.get('socket-123:ping')!;
      pingHandler();

      // Should not have emitted pong since session doesn't exist
      expect(mockSocket.emit).not.toHaveBeenCalledWith(
        'pong',
        expect.any(Object),
      );
    });
  });

  describe('getSessionByPlayerId', () => {
    beforeEach(() => {
      connectionManager = new ConnectionManager(mockServer);
    });

    it('should return session by player ID', () => {
      mockSocket.handshake.auth = {};
      mockSocket.handshake.query = {};
      const connectionHandler = eventHandlers.get('connection')!;
      connectionHandler(mockSocket);

      const session =
        connectionManager.getSessionByPlayerId('guest_socket-123');
      expect(session).toBeDefined();
      expect(session?.playerId).toBe('guest_socket-123');
    });

    it('should return undefined for unknown player ID', () => {
      const session = connectionManager.getSessionByPlayerId('unknown-player');
      expect(session).toBeUndefined();
    });
  });

  describe('assignRoom and removeRoomAssignment', () => {
    beforeEach(() => {
      connectionManager = new ConnectionManager(mockServer);
    });

    it('should assign room to session', () => {
      mockSocket.handshake.auth = {};
      mockSocket.handshake.query = {};
      const connectionHandler = eventHandlers.get('connection')!;
      connectionHandler(mockSocket);

      connectionManager.assignRoom('socket-123', 'room-1');
      const session = connectionManager.getSession('socket-123');
      expect(session?.roomId).toBe('room-1');
    });

    it('should not throw when assigning room to unknown socket', () => {
      expect(() => {
        connectionManager.assignRoom('unknown-socket', 'room-1');
      }).not.toThrow();
    });

    it('should remove room assignment', () => {
      mockSocket.handshake.auth = {};
      mockSocket.handshake.query = {};
      const connectionHandler = eventHandlers.get('connection')!;
      connectionHandler(mockSocket);

      connectionManager.assignRoom('socket-123', 'room-1');
      connectionManager.removeRoomAssignment('socket-123');

      const session = connectionManager.getSession('socket-123');
      expect(session?.roomId).toBeNull();
    });

    it('should not throw when removing room for unknown socket', () => {
      expect(() => {
        connectionManager.removeRoomAssignment('unknown-socket');
      }).not.toThrow();
    });
  });

  describe('with ProgressionService', () => {
    it('should initialize player progression for authenticated player', async () => {
      const mockPlayerId = 'player-456';
      process.env.JWT_SECRET = 'test-secret';
      mockSocket.handshake.auth = { token: 'valid-token' };
      (jwt.verify as jest.Mock).mockReturnValue({ playerId: mockPlayerId });

      connectionManager = new ConnectionManager(
        mockServer,
        mockProgressionService,
      );
      const connectionHandler = eventHandlers.get('connection')!;
      connectionHandler(mockSocket);

      // Wait for async progression service call
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockProgressionService.initializePlayer).toHaveBeenCalledWith(
        mockPlayerId,
      );
    });

    it('should not initialize progression for guest players', async () => {
      mockSocket.handshake.auth = {};
      mockSocket.handshake.query = {};

      connectionManager = new ConnectionManager(
        mockServer,
        mockProgressionService,
      );
      const connectionHandler = eventHandlers.get('connection')!;
      connectionHandler(mockSocket);

      // Wait for async progression service call
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockProgressionService.initializePlayer).not.toHaveBeenCalled();
    });
  });
});
