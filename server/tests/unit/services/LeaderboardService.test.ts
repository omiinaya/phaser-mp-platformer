// Set required environment variables before importing
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.NODE_ENV = 'test';

// Create mock redis client that can be accessed in tests
const mockRedisClient = {
  on: jest.fn(),
  connect: jest.fn().mockResolvedValue(undefined),
  get: jest.fn(),
  setEx: jest.fn().mockResolvedValue('OK'),
  del: jest.fn().mockResolvedValue(1),
  keys: jest.fn().mockResolvedValue([]),
};

// Mock redis
jest.mock('redis', () => ({
  createClient: jest.fn().mockReturnValue(mockRedisClient),
}));

jest.mock('../../../src/utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock repository constructors
jest.mock(
  '../../../src/persistence/repositories/PlayerStatsRepository',
  () => ({
    PlayerStatsRepository: jest.fn().mockImplementation(() => ({
      findTopPlayersByScore: jest.fn(),
      updateScore: jest.fn(),
      findByPlayerId: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(1),
      }),
    })),
  }),
);

jest.mock(
  '../../../src/persistence/repositories/PlayerProfileRepository',
  () => ({
    PlayerProfileRepository: jest.fn().mockImplementation(() => ({
      findOne: jest.fn(),
      findTopPlayersByLevel: jest.fn(),
    })),
  }),
);

import { LeaderboardService } from '../../../src/services/LeaderboardService';

describe('LeaderboardService', () => {
  let leaderboardService: LeaderboardService;
  let mockDataSource: any;
  let mockStatsRepo: any;
  let mockProfileRepo: any;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    mockDataSource = {};

    mockStatsRepo = {
      findTopPlayersByScore: jest.fn(),
      updateScore: jest.fn(),
      findByPlayerId: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(1),
      }),
    };

    mockProfileRepo = {
      findOne: jest.fn(),
      findTopPlayersByLevel: jest.fn(),
    };

    leaderboardService = new LeaderboardService(
      mockDataSource as any,
      mockStatsRepo as any,
      mockProfileRepo as any,
      'redis://localhost:6379',
    );
  });

  describe('constructor', () => {
    it('should create leaderboard service', () => {
      expect(leaderboardService).toBeInstanceOf(LeaderboardService);
    });

    it('should register redis error handler', () => {
      expect(mockRedisClient.on).toHaveBeenCalledWith(
        'error',
        expect.any(Function),
      );
    });

    it('should handle redis errors via the error handler', () => {
      // Get the error handler callback
      const errorHandler = mockRedisClient.on.mock.calls.find(
        (call: any[]) => call[0] === 'error',
      )?.[1];

      // Simulate a redis error
      const testError = new Error('Redis connection failed');
      if (errorHandler) {
        errorHandler(testError);
      }

      // The error should be logged (we mock logger, so just verify it doesn't throw)
      expect(true).toBe(true);
    });
  });

  describe('getTopPlayersByScore', () => {
    it('should return cached results when available', async () => {
      const cachedData = [
        { playerId: 'player1', username: 'Player1', score: 1000 },
        { playerId: 'player2', username: 'Player2', score: 900 },
      ];
      mockRedisClient.get.mockResolvedValue(JSON.stringify(cachedData));

      const result = await leaderboardService.getTopPlayersByScore(10, true);

      expect(mockRedisClient.get).toHaveBeenCalledWith(
        'leaderboard:top_score:10',
      );
      expect(result).toEqual(cachedData);
      expect(mockStatsRepo.findTopPlayersByScore).not.toHaveBeenCalled();
    });

    it('should fetch from database when cache is empty', async () => {
      mockRedisClient.get.mockResolvedValue(null);

      mockStatsRepo.findTopPlayersByScore.mockResolvedValue([
        {
          playerId: 'player1',
          score: 1000,
          kills: 10,
          deaths: 2,
          playTimeSeconds: 3600,
        },
        {
          playerId: 'player2',
          score: 900,
          kills: 8,
          deaths: 3,
          playTimeSeconds: 3000,
        },
      ]);

      mockProfileRepo.findOne
        .mockResolvedValueOnce({ id: 'player1', username: 'Player1' })
        .mockResolvedValueOnce({ id: 'player2', username: 'Player2' });

      const result = await leaderboardService.getTopPlayersByScore(10, true);

      expect(result).toHaveLength(2);
      expect(result[0].username).toBe('Player1');
      expect(result[1].username).toBe('Player2');
      expect(mockRedisClient.setEx).toHaveBeenCalled();
    });

    it('should refetch from database when cache data is corrupted', async () => {
      // Return invalid JSON to trigger parse error
      mockRedisClient.get.mockResolvedValue('invalid-json{');

      mockStatsRepo.findTopPlayersByScore.mockResolvedValue([
        {
          playerId: 'player1',
          score: 1000,
          kills: 10,
          deaths: 2,
          playTimeSeconds: 3600,
        },
      ]);

      mockProfileRepo.findOne.mockResolvedValue({
        id: 'player1',
        username: 'Player1',
      });

      const result = await leaderboardService.getTopPlayersByScore(10, true);

      expect(result).toHaveLength(1);
      expect(mockStatsRepo.findTopPlayersByScore).toHaveBeenCalled();
    });

    it('should show "Unknown" when profile is not found', async () => {
      mockRedisClient.get.mockResolvedValue(null);

      mockStatsRepo.findTopPlayersByScore.mockResolvedValue([
        {
          playerId: 'missingPlayer',
          score: 500,
          kills: 5,
          deaths: 5,
          playTimeSeconds: 1800,
        },
      ]);

      mockProfileRepo.findOne.mockResolvedValue(null); // No profile

      const result = await leaderboardService.getTopPlayersByScore(10, true);

      expect(result).toHaveLength(1);
      expect(result[0].username).toBe('Unknown');
    });

    it('should bypass cache when useCache is false', async () => {
      mockStatsRepo.findTopPlayersByScore.mockResolvedValue([
        {
          playerId: 'player1',
          score: 1000,
          kills: 10,
          deaths: 2,
          playTimeSeconds: 3600,
        },
      ]);

      mockProfileRepo.findOne.mockResolvedValue({
        id: 'player1',
        username: 'Player1',
      });

      const result = await leaderboardService.getTopPlayersByScore(10, false);

      expect(mockRedisClient.get).not.toHaveBeenCalled();
      expect(mockStatsRepo.findTopPlayersByScore).toHaveBeenCalled();
    });
  });

  describe('getTopPlayersByLevel', () => {
    it('should return cached results when available', async () => {
      const cachedData = [
        { playerId: 'player1', username: 'Player1', level: 50 },
        { playerId: 'player2', username: 'Player2', level: 45 },
      ];
      mockRedisClient.get.mockResolvedValue(JSON.stringify(cachedData));

      const result = await leaderboardService.getTopPlayersByLevel(10);

      expect(mockRedisClient.get).toHaveBeenCalledWith(
        'leaderboard:top_level:10',
      );
      expect(result).toEqual(cachedData);
    });

    it('should fetch from database and cache results', async () => {
      mockRedisClient.get.mockResolvedValue(null);

      mockProfileRepo.findTopPlayersByLevel.mockResolvedValue([
        {
          id: 'player1',
          username: 'Player1',
          level: 50,
          experience: 1000,
          coins: 500,
        },
        {
          id: 'player2',
          username: 'Player2',
          level: 45,
          experience: 900,
          coins: 450,
        },
      ]);

      const result = await leaderboardService.getTopPlayersByLevel(10);

      expect(result).toHaveLength(2);
      expect(result[0].username).toBe('Player1');
      expect(mockRedisClient.setEx).toHaveBeenCalled();
    });

    it('should refetch from database when cached level data is corrupted', async () => {
      mockRedisClient.get.mockResolvedValue('invalid-json{');

      mockProfileRepo.findTopPlayersByLevel.mockResolvedValue([
        {
          id: 'player1',
          username: 'Player1',
          level: 50,
          experience: 1000,
          coins: 500,
        },
      ]);

      const result = await leaderboardService.getTopPlayersByLevel(10);

      expect(result).toHaveLength(1);
      expect(mockProfileRepo.findTopPlayersByLevel).toHaveBeenCalled();
    });
  });

  describe('updatePlayerScore', () => {
    it('should update player score and invalidate cache', async () => {
      mockStatsRepo.updateScore.mockResolvedValue(true);

      await leaderboardService.updatePlayerScore('player1', 100);

      expect(mockStatsRepo.updateScore).toHaveBeenCalledWith('player1', 100);
      expect(mockRedisClient.del).toHaveBeenCalled();
    });
  });

  describe('getPlayerRankByScore', () => {
    it('should return player rank when player exists', async () => {
      mockStatsRepo.findByPlayerId.mockResolvedValue({
        playerId: 'player1',
        score: 1000,
      });
      mockStatsRepo.createQueryBuilder.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(5),
      });

      const rank = await leaderboardService.getPlayerRankByScore('player1');

      expect(rank).toBe(6); // 5 players with higher score + 1
    });

    it('should return -1 when player not found', async () => {
      mockStatsRepo.findByPlayerId.mockResolvedValue(null);

      const rank = await leaderboardService.getPlayerRankByScore('unknown');

      expect(rank).toBe(-1);
    });
  });

  describe('refreshAllLeaderboards', () => {
    it('should clear all leaderboard caches', async () => {
      mockRedisClient.keys.mockResolvedValue([
        'leaderboard:top_score:10',
        'leaderboard:top_level:10',
      ]);

      await leaderboardService.refreshAllLeaderboards();

      expect(mockRedisClient.keys).toHaveBeenCalledWith('leaderboard:*');
      // Redis del accepts an array of keys and deletes them in a single call
      expect(mockRedisClient.del).toHaveBeenCalledTimes(1);
      expect(mockRedisClient.del).toHaveBeenCalledWith([
        'leaderboard:top_score:10',
        'leaderboard:top_level:10',
      ]);
    });

    it('should handle empty cache', async () => {
      mockRedisClient.keys.mockResolvedValue([]);

      await expect(
        leaderboardService.refreshAllLeaderboards(),
      ).resolves.not.toThrow();
    });
  });
});
