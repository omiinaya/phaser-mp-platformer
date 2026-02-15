import { LeaderboardService } from '../../../src/services/LeaderboardService';

// Mock dependencies
jest.mock('redis', () => ({
  createClient: jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    connect: jest.fn().mockResolvedValue(undefined),
    get: jest.fn(),
    setEx: jest.fn(),
    del: jest.fn(),
    keys: jest.fn(),
  })),
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
jest.mock('../../../src/persistence/repositories/PlayerStatsRepository', () => ({
  PlayerStatsRepository: jest.fn().mockImplementation(() => ({
    findTopPlayersByScore: jest.fn(),
    updateScore: jest.fn(),
    findByPlayerId: jest.fn(),
    createQueryBuilder: jest.fn().mockReturnValue({
      where: jest.fn().mockReturnThis(),
      getCount: jest.fn().mockResolvedValue(1),
    }),
  })),
}));

jest.mock('../../../src/persistence/repositories/PlayerProfileRepository', () => ({
  PlayerProfileRepository: jest.fn().mockImplementation(() => ({
    findOne: jest.fn(),
    findTopPlayersByLevel: jest.fn(),
  })),
}));

jest.mock('../../../src/persistence/database', () => ({
  AppDataSource: {},
}));

describe('LeaderboardService', () => {
  let leaderboardService: LeaderboardService;
  let mockRedisClient: any;
  let mockDataSource: any;
  let mockStatsRepo: any;
  let mockProfileRepo: any;

  beforeEach(() => {
    mockRedisClient = {
      on: jest.fn(),
      connect: jest.fn().mockResolvedValue(undefined),
      get: jest.fn(),
      setEx: jest.fn().mockResolvedValue('OK'),
      del: jest.fn().mockResolvedValue(1),
      keys: jest.fn().mockResolvedValue([]),
    };

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

    // Clear all mocks
    jest.clearAllMocks();

    leaderboardService = new LeaderboardService(
      mockDataSource as any,
      mockStatsRepo as any,
      mockProfileRepo as any,
      'redis://localhost:6379'
    );
  });

  describe('constructor', () => {
    it('should create leaderboard service', () => {
      expect(leaderboardService).toBeInstanceOf(LeaderboardService);
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

      expect(mockRedisClient.get).toHaveBeenCalledWith('leaderboard:top_score:10');
      expect(result).toEqual(cachedData);
      expect(mockStatsRepo.findTopPlayersByScore).not.toHaveBeenCalled();
    });

    it('should fetch from database when cache is empty', async () => {
      mockRedisClient.get.mockResolvedValue(null);
      
      mockStatsRepo.findTopPlayersByScore.mockResolvedValue([
        { playerId: 'player1', score: 1000, kills: 10, deaths: 2, playTimeSeconds: 3600 },
        { playerId: 'player2', score: 900, kills: 8, deaths: 3, playTimeSeconds: 3000 },
      ]);

      mockProfileRepo.findOne
        .mockResolvedValueOnce({ id: 'player1', username: 'Player1' })
        .mockResolvedValueOnce({ id: 'player2', username: 'Player2' });

      const result = await leaderboardService.getTopPlayersByScore(10, true);

      expect(result).toHaveLength(2);
      expect(result[0].username).toBe('Player1');
      expect(result[0].score).toBe(1000);
    });

    it('should use default username when profile not found', async () => {
      mockRedisClient.get.mockResolvedValue(null);
      
      mockStatsRepo.findTopPlayersByScore.mockResolvedValue([
        { playerId: 'player1', score: 1000, kills: 10, deaths: 2, playTimeSeconds: 3600 },
      ]);

      mockProfileRepo.findOne.mockResolvedValue(null);

      const result = await leaderboardService.getTopPlayersByScore(10, true);

      expect(result[0].username).toBe('Unknown');
    });

    it('should skip cache when useCache is false', async () => {
      mockStatsRepo.findTopPlayersByScore.mockResolvedValue([
        { playerId: 'player1', score: 1000, kills: 10, deaths: 2, playTimeSeconds: 3600 },
      ]);

      mockProfileRepo.findOne.mockResolvedValue({ id: 'player1', username: 'Player1' });

      await leaderboardService.getTopPlayersByScore(10, false);

      expect(mockRedisClient.get).not.toHaveBeenCalled();
    });
  });

  describe('getTopPlayersByLevel', () => {
    it('should return cached results when available', async () => {
      const cachedData = [
        { playerId: 'player1', username: 'Player1', level: 10 },
      ];
      mockRedisClient.get.mockResolvedValue(JSON.stringify(cachedData));

      const result = await leaderboardService.getTopPlayersByLevel(10);

      expect(result).toEqual(cachedData);
    });

    it('should fetch from database and cache results', async () => {
      mockRedisClient.get.mockResolvedValue(null);
      
      mockProfileRepo.findTopPlayersByLevel.mockResolvedValue([
        { id: 'player1', username: 'Player1', level: 10, experience: 5000, coins: 100 },
      ]);

      const result = await leaderboardService.getTopPlayersByLevel(10);

      expect(result).toHaveLength(1);
      expect(result[0].username).toBe('Player1');
      expect(mockRedisClient.setEx).toHaveBeenCalled();
    });
  });

  describe('updatePlayerScore', () => {
    it('should update player score and invalidate cache', async () => {
      mockStatsRepo.updateScore.mockResolvedValue(undefined);

      await leaderboardService.updatePlayerScore('player1', 100);

      expect(mockStatsRepo.updateScore).toHaveBeenCalledWith('player1', 100);
      expect(mockRedisClient.del).toHaveBeenCalledWith('leaderboard:top_score:*');
    });
  });

  describe('getPlayerRankByScore', () => {
    it('should return player rank', async () => {
      mockStatsRepo.findByPlayerId.mockResolvedValue({ playerId: 'player1', score: 500 });

      const rank = await leaderboardService.getPlayerRankByScore('player1');

      expect(rank).toBe(2); // 1 + 1 (from getCount mock)
    });

    it('should return -1 when player not found', async () => {
      mockStatsRepo.findByPlayerId.mockResolvedValue(null);

      const rank = await leaderboardService.getPlayerRankByScore('player1');

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
      expect(mockRedisClient.del).toHaveBeenCalledWith([
        'leaderboard:top_score:10',
        'leaderboard:top_level:10',
      ]);
    });

    it('should handle empty cache', async () => {
      mockRedisClient.keys.mockResolvedValue([]);

      await leaderboardService.refreshAllLeaderboards();

      expect(mockRedisClient.del).not.toHaveBeenCalled();
    });
  });
});
