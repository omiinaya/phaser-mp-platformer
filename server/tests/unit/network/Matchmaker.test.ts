import { Matchmaker } from '../../../src/network/Matchmaker';
import { Server, Socket } from 'socket.io';
import { ConnectionManager } from '../../../src/network/ConnectionManager';
import { RoomManager } from '../../../src/network/RoomManager';
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

jest.mock('../../../src/workers/MatchmakingWorker', () => ({
  MatchmakingWorker: jest.fn().mockImplementation(() => ({
    process: jest.fn().mockResolvedValue([]),
    terminate: jest.fn(),
  })),
}));

const createMockSession = (socketId: string, playerId: string) => ({
  socketId,
  playerId,
  roomId: null as string | null,
  connectedAt: new Date(),
  lastActivity: new Date(),
});

describe('Matchmaker', () => {
  let mockServer: jest.Mocked<Server>;
  let mockConnectionManager: jest.Mocked<ConnectionManager>;
  let mockRoomManager: jest.Mocked<RoomManager>;
  let matchmaker: Matchmaker;
  let mockSocket: jest.Mocked<Socket>;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();

    mockServer = {
      to: jest.fn().mockReturnValue({
        emit: jest.fn(),
      }),
      sockets: {
        sockets: new Map(),
      },
    } as any;

    mockConnectionManager = {
      getSession: jest.fn(),
      assignRoom: jest.fn(),
    } as any;

    mockRoomManager = {
      createRoom: jest.fn(),
    } as any;

    mockSocket = {
      id: 'socket-123',
      emit: jest.fn(),
      join: jest.fn(),
      handshake: {
        auth: { token: 'test-token' },
      },
    } as any;

    matchmaker = new Matchmaker(
      mockServer,
      mockConnectionManager,
      mockRoomManager,
    );
  });

  afterEach(() => {
    jest.useRealTimers();
    matchmaker.stop();
  });

  describe('constructor', () => {
    it('should start matchmaking loop on initialization', () => {
      expect(logger.info).toHaveBeenCalledWith('Matchmaking loop started');
    });

    it('should set up server connection', () => {
      expect(mockServer).toBeDefined();
    });
  });

  describe('stop', () => {
    it('should stop matchmaking loop', () => {
      matchmaker.stop();
      expect(logger.info).toHaveBeenCalledWith('Matchmaking loop stopped');
    });

    it('should handle multiple stop calls gracefully', () => {
      matchmaker.stop();
      matchmaker.stop();
      expect(logger.info).toHaveBeenCalledWith('Matchmaking loop stopped');
    });
  });

  describe('enqueuePlayer', () => {
    it('should throw error when session not found', () => {
      mockConnectionManager.getSession.mockReturnValue(undefined);

      expect(() => {
        matchmaker.enqueuePlayer(mockSocket, {
          gameMode: 'FFA',
          maxPlayers: 4,
        });
      }).toThrow('Player session not found');
    });

    it('should add player to queue with valid session', () => {
      mockConnectionManager.getSession.mockReturnValue(
        createMockSession('socket-123', 'player-456'),
      );

      const requestId = matchmaker.enqueuePlayer(mockSocket, {
        gameMode: 'FFA',
        maxPlayers: 4,
      });

      expect(requestId).toContain('req_');
      expect(mockSocket.emit).toHaveBeenCalledWith('matchmaking_queued', {
        requestId: expect.any(String),
        estimatedWait: expect.any(Number),
      });
      expect(logger.debug).toHaveBeenCalledWith(
        'Player player-456 enqueued for matchmaking',
        expect.any(Object),
      );
    });

    it('should include region in preferences', () => {
      mockConnectionManager.getSession.mockReturnValue(
        createMockSession('socket-123', 'player-456'),
      );

      matchmaker.enqueuePlayer(mockSocket, {
        gameMode: 'TEAM',
        maxPlayers: 4,
        region: 'us-east',
      });

      expect(matchmaker.getQueueLength()).toBe(1);
      const status = matchmaker.getQueueStatus('socket-123');
      expect(status?.preferences.region).toBe('us-east');
    });
  });

  describe('dequeuePlayer', () => {
    beforeEach(() => {
      mockConnectionManager.getSession.mockReturnValue(
        createMockSession('socket-123', 'player-456'),
      );
      matchmaker.enqueuePlayer(mockSocket, {
        gameMode: 'FFA',
        maxPlayers: 4,
      });
    });

    it('should remove player from queue', () => {
      const result = matchmaker.dequeuePlayer('socket-123');
      expect(result).toBe(true);
      expect(matchmaker.getQueueLength()).toBe(0);
      expect(logger.debug).toHaveBeenCalledWith(
        'Player player-456 dequeued from matchmaking',
      );
    });

    it('should return false for unknown socket', () => {
      const result = matchmaker.dequeuePlayer('unknown-socket');
      expect(result).toBe(false);
    });

    it('should return false when queue is empty', () => {
      matchmaker.dequeuePlayer('socket-123');
      const result = matchmaker.dequeuePlayer('socket-123');
      expect(result).toBe(false);
    });
  });

  describe('getQueueLength', () => {
    it('should return 0 when queue is empty', () => {
      expect(matchmaker.getQueueLength()).toBe(0);
    });

    it('should return queue size', () => {
      mockConnectionManager.getSession.mockReturnValue(
        createMockSession('socket-123', 'player-456'),
      );
      matchmaker.enqueuePlayer(mockSocket, { gameMode: 'FFA', maxPlayers: 4 });
      expect(matchmaker.getQueueLength()).toBe(1);
    });
  });

  describe('getQueueStatus', () => {
    it('should return undefined for unknown socket', () => {
      expect(matchmaker.getQueueStatus('unknown-socket')).toBeUndefined();
    });

    it('should return request for queued player', () => {
      mockConnectionManager.getSession.mockReturnValue(
        createMockSession('socket-123', 'player-456'),
      );
      matchmaker.enqueuePlayer(mockSocket, { gameMode: 'FFA', maxPlayers: 4 });

      const status = matchmaker.getQueueStatus('socket-123');
      expect(status).toBeDefined();
      expect(status?.playerId).toBe('player-456');
      expect(status?.preferences.gameMode).toBe('FFA');
    });
  });

  describe('estimateWaitTime', () => {
    it('should return estimated wait time', () => {
      const waitTime = (matchmaker as any).estimateWaitTime();
      expect(typeof waitTime).toBe('number');
      expect(waitTime).toBeGreaterThanOrEqual(30);
    });
  });

  describe('groupByGameMode', () => {
    it('should group by gameMode and region', () => {
      const mockRequests = [
        { preferences: { gameMode: 'FFA', region: 'us' } },
        { preferences: { gameMode: 'FFA', region: 'us' } },
        { preferences: { gameMode: 'TEAM', region: 'eu' } },
      ];

      const result = (matchmaker as any).groupByGameMode(mockRequests);
      expect(result.get('FFA_us')).toHaveLength(2);
      expect(result.get('TEAM_eu')).toHaveLength(1);
    });

    it('should default region to any', () => {
      const mockRequests = [
        { preferences: { gameMode: 'FFA' /* no region */ } },
      ];

      const result = (matchmaker as any).groupByGameMode(mockRequests);
      expect(result.get('FFA_any')).toHaveLength(1);
    });
  });
});
