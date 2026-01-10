import { DataSource } from 'typeorm';
import { ProgressionService } from '../../../src/services/ProgressionService';
import { PlayerProfileRepository } from '../../../src/persistence/repositories/PlayerProfileRepository';
import { PlayerStatsRepository } from '../../../src/persistence/repositories/PlayerStatsRepository';
import { PlayerUnlockRepository } from '../../../src/persistence/repositories/PlayerUnlockRepository';
import { AchievementProgressRepository } from '../../../src/persistence/repositories/AchievementProgressRepository';
import { UnlockableRepository } from '../../../src/persistence/repositories/UnlockableRepository';

// Mock the logger to avoid side effects
jest.mock('../../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

describe('ProgressionService', () => {
  let service: ProgressionService;
  let mockDataSource: any;
  let mockProfileRepo: any;
  let mockStatsRepo: any;
  let mockUnlockRepo: any;
  let mockAchievementProgressRepo: any;
  let mockUnlockableRepo: any;

  beforeEach(() => {
    mockDataSource = {
      transaction: jest.fn(),
    };
    mockProfileRepo = {
      findOne: jest.fn(),
      save: jest.fn(),
    };
    mockStatsRepo = {
      findByPlayerId: jest.fn(),
      create: jest.fn(),
    };
    mockUnlockRepo = {
      unlock: jest.fn(),
      findByPlayerId: jest.fn(),
    };
    mockAchievementProgressRepo = {
      incrementProgress: jest.fn(),
      findByPlayerId: jest.fn(),
    };
    mockUnlockableRepo = {
      findUnlockablesByRequiredLevel: jest.fn(),
      manager: {
        findOne: jest.fn(),
      },
    };

    service = new ProgressionService(
      mockDataSource as any,
      mockProfileRepo as any,
      mockStatsRepo as any,
      mockUnlockRepo as any,
      mockAchievementProgressRepo as any,
      mockUnlockableRepo as any
    );
  });

  describe('initializePlayer', () => {
    it('should throw error if player profile not found', async () => {
      mockProfileRepo.findOne.mockResolvedValue(null);
      mockDataSource.transaction.mockImplementation(async (cb: any) => {
        return cb({
          save: jest.fn(),
        });
      });

      await expect(service.initializePlayer('player1')).rejects.toThrow(
        'Player profile player1 not found'
      );
    });

    it('should create stats if not exist', async () => {
      const mockProfile = { id: 'player1' };
      const mockStats = { playerId: 'player1' };
      mockProfileRepo.findOne.mockResolvedValue(mockProfile);
      mockStatsRepo.findByPlayerId.mockResolvedValue(null);
      const mockSave = jest.fn();
      mockDataSource.transaction.mockImplementation(async (cb: any) => {
        return cb({
          save: mockSave,
        });
      });
      mockStatsRepo.create.mockReturnValue(mockStats);

      await service.initializePlayer('player1');

      expect(mockStatsRepo.findByPlayerId).toHaveBeenCalledWith('player1');
      expect(mockStatsRepo.create).toHaveBeenCalledWith({ playerId: 'player1' });
      expect(mockSave).toHaveBeenCalledWith(mockStats);
    });

    it('should not create stats if already exist', async () => {
      const mockProfile = { id: 'player1' };
      const mockStats = { playerId: 'player1' };
      mockProfileRepo.findOne.mockResolvedValue(mockProfile);
      mockStatsRepo.findByPlayerId.mockResolvedValue(mockStats);
      const mockSave = jest.fn();
      mockDataSource.transaction.mockImplementation(async (cb: any) => {
        return cb({
          save: mockSave,
        });
      });

      await service.initializePlayer('player1');

      expect(mockStatsRepo.findByPlayerId).toHaveBeenCalledWith('player1');
      expect(mockStatsRepo.create).not.toHaveBeenCalled();
      expect(mockSave).not.toHaveBeenCalled();
    });
  });

  describe('updateStats', () => {
    it('should throw error if stats not found', async () => {
      mockStatsRepo.findByPlayerId.mockResolvedValue(null);
      mockDataSource.transaction.mockImplementation(async (cb: any) => {
        return cb({
          save: jest.fn(),
        });
      });

      await expect(
        service.updateStats('player1', { kills: 5 })
      ).rejects.toThrow('Player stats player1 not found');
    });

    it('should apply updates and save', async () => {
      const mockStats = {
        kills: 10,
        deaths: 2,
        score: 100,
        highestScore: 100,
        playTimeSeconds: 3600,
        gamesPlayed: 5,
        gamesWon: 3,
      };
      mockStatsRepo.findByPlayerId.mockResolvedValue(mockStats);
      const mockSave = jest.fn();
      mockDataSource.transaction.mockImplementation(async (cb: any) => {
        return cb({
          save: mockSave,
        });
      });

      await service.updateStats('player1', { kills: 5, score: 50 });

      expect(mockStats.kills).toBe(15);
      expect(mockStats.score).toBe(150);
      expect(mockStats.highestScore).toBe(150);
      expect(mockSave).toHaveBeenCalledWith(mockStats);
    });
  });

  describe('grantUnlock', () => {
    it('should return true on success', async () => {
      mockUnlockRepo.unlock.mockResolvedValue({});

      const result = await service.grantUnlock('player1', 'unlock1');
      expect(result).toBe(true);
      expect(mockUnlockRepo.unlock).toHaveBeenCalledWith('player1', 'unlock1');
    });

    it('should return false on error', async () => {
      mockUnlockRepo.unlock.mockRejectedValue(new Error('DB error'));

      const result = await service.grantUnlock('player1', 'unlock1');
      expect(result).toBe(false);
    });
  });

  describe('checkAndGrantLevelUp', () => {
    it('should return false if profile not found', async () => {
      mockProfileRepo.findOne.mockResolvedValue(null);

      const result = await service.checkAndGrantLevelUp('player1');
      expect(result).toBe(false);
    });

    it('should level up when experience threshold crossed', async () => {
      const mockProfile = { id: 'player1', level: 1, experience: 500 };
      mockProfileRepo.findOne.mockResolvedValue(mockProfile);
      mockUnlockableRepo.findUnlockablesByRequiredLevel.mockResolvedValue([
        { id: 'unlock1' },
        { id: 'unlock2' },
      ]);
      mockUnlockRepo.unlock.mockResolvedValue({});

      const result = await service.checkAndGrantLevelUp('player1');
      expect(result).toBe(true);
      expect(mockProfile.level).toBe(3); // sqrt(500/100) = sqrt(5) ≈ 2.236, floor = 2, +1 = 3
      expect(mockProfileRepo.save).toHaveBeenCalledWith(mockProfile);
      expect(mockUnlockRepo.unlock).toHaveBeenCalledTimes(2);
    });

    it('should not level up if level unchanged', async () => {
      const mockProfile = { id: 'player1', level: 3, experience: 100 };
      mockProfileRepo.findOne.mockResolvedValue(mockProfile);

      const result = await service.checkAndGrantLevelUp('player1');
      expect(result).toBe(false);
      expect(mockProfileRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('incrementAchievementProgress', () => {
    it('should do nothing if achievement not found', async () => {
      mockUnlockableRepo.manager.findOne.mockResolvedValue(null);

      await service.incrementAchievementProgress('player1', 'achieve1', 1);
      expect(mockAchievementProgressRepo.incrementProgress).not.toHaveBeenCalled();
    });

    it('should increment progress', async () => {
      const mockAchievement = { id: 'ach1' };
      mockUnlockableRepo.manager.findOne.mockResolvedValue(mockAchievement);

      await service.incrementAchievementProgress('player1', 'achieve1', 5);
      expect(mockAchievementProgressRepo.incrementProgress).toHaveBeenCalledWith(
        'player1',
        'ach1',
        5
      );
    });
  });

  describe('getPlayerSummary', () => {
    it('should return summary data', async () => {
      const mockProfile = { id: 'player1', level: 5 };
      const mockStats = { kills: 10 };
      const mockUnlocks = [{ unlockableId: 'unlock1', unlockedAt: new Date() }];
      const mockAchievements = [{ achievementId: 'ach1', progress: 50, completed: false }];
      mockProfileRepo.findOne.mockResolvedValue(mockProfile);
      mockStatsRepo.findByPlayerId.mockResolvedValue(mockStats);
      mockUnlockRepo.findByPlayerId.mockResolvedValue(mockUnlocks);
      mockAchievementProgressRepo.findByPlayerId.mockResolvedValue(mockAchievements);

      const summary = await service.getPlayerSummary('player1');
      expect(summary).toEqual({
        profile: mockProfile,
        stats: mockStats,
        unlocks: [{ id: 'unlock1', unlockedAt: mockUnlocks[0].unlockedAt }],
        achievements: [{ achievementId: 'ach1', progress: 50, completed: false }],
      });
    });
  });
});