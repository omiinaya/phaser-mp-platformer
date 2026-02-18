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

  beforeEach(() => {
    mockServer = {
      on: jest.fn(),
      to: jest.fn().mockReturnValue({
        emit: jest.fn(),
      }),
    } as any;

    mockSocket = {
      id: 'socket-123',
      handshake: {
        auth: {},
        query: {},
      },
      emit: jest.fn(),
      on: jest.fn((event: string, handler: Function) => {
        // Store handlers for later
        return mockSocket;
      }),
    } as any;

    mockProgressionService = {
      initializePlayer: jest.fn().mockResolvedValue(undefined),
    } as any;

    connectionManager = new ConnectionManager(mockServer);
  });

  afterEach(() => {
    jest.clearAllMocks();
    delete process.env.JWT_SECRET;
  });

  describe('setupEventHandlers', () => {
    it('should set up connection handler on initialization', () => {
      expect(mockServer.on).toHaveBeenCalledWith('connection', expect.any(Function));
    });
  });

  describe('getSession', () => {
    it('should return session by socket ID', () => {
      // Trigger the connection handler manually
      const connectionHandler = (mockServer.on as jest.Mock).mock.calls.find(
        (call: any[]) => call[0] === 'connection'
      )[1];

      // Simulate connection
      mockSocket.handshake.auth = {};
      mockSocket.handshake.query = {};
      
      // Call the handler
      connectionHandler(mockSocket);

      const session = connectionManager.getSession('socket-123');
      expect(session).toBeDefined();
      expect(session?.socketId).toBe('socket-123');
    });

    it('should return undefined for unknown socket', () => {
      const session = connectionManager.getSession('unknown-socket');
      expect(session).toBeUndefined();
    });
  });

  describe('getSessionByPlayerId', () => {
    it('should return session by player ID', () => {
      const connectionHandler = (mockServer.on as jest.Mock).mock.calls.find(
        (call: any[]) => call[0] === 'connection'
      )[1];
      
      mockSocket.handshake.auth = {};
      connectionHandler(mockSocket);

      // Get the guest player ID
      const session = connectionManager.getSession('socket-123');
      if (session) {
        const byPlayerId = connectionManager.getSessionByPlayerId(session.playerId);
        expect(byPlayerId).toBeDefined();
      }
    });
  });

  describe('assignRoom', () => {
    it('should assign room to socket', () => {
      const connectionHandler = (mockServer.on as jest.Mock).mock.calls.find(
        (call: any[]) => call[0] === 'connection'
      )[1];
      
      mockSocket.handshake.auth = {};
      connectionHandler(mockSocket);

      connectionManager.assignRoom('socket-123', 'room-1');
      
      const session = connectionManager.getSession('socket-123');
      expect(session?.roomId).toBe('room-1');
    });
  });

  describe('removeRoomAssignment', () => {
    it('should remove room assignment', () => {
      const connectionHandler = (mockServer.on as jest.Mock).mock.calls.find(
        (call: any[]) => call[0] === 'connection'
      )[1];
      
      mockSocket.handshake.auth = {};
      connectionHandler(mockSocket);

      connectionManager.assignRoom('socket-123', 'room-1');
      connectionManager.removeRoomAssignment('socket-123');
      
      const session = connectionManager.getSession('socket-123');
      expect(session?.roomId).toBeNull();
    });
  });

  describe('getSessionsInRoom', () => {
    it('should return all sessions in a room', () => {
      const connectionHandler = (mockServer.on as jest.Mock).mock.calls.find(
        (call: any[]) => call[0] === 'connection'
      )[1];
      
      mockSocket.handshake.auth = {};
      connectionHandler(mockSocket);

      connectionManager.assignRoom('socket-123', 'room-1');
      
      const sessions = connectionManager.getSessionsInRoom('room-1');
      expect(sessions.length).toBe(1);
    });
  });

  describe('getConnectedCount', () => {
    it('should return connected client count', () => {
      const connectionHandler = (mockServer.on as jest.Mock).mock.calls.find(
        (call: any[]) => call[0] === 'connection'
      )[1];
      
      mockSocket.handshake.auth = {};
      connectionHandler(mockSocket);

      expect(connectionManager.getConnectedCount()).toBe(1);
    });
  });
});
