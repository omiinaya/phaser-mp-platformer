import { DataSource, Not, IsNull } from 'typeorm';
import { AchievementRepository } from '../../../src/persistence/repositories/AchievementRepository';
import {
  Achievement,
  AchievementTier,
} from '../../../src/persistence/models/Achievement';

// Mock the BaseRepository
jest.mock('../../../src/persistence/repositories/BaseRepository', () => {
  return {
    BaseRepository: class {
      protected dataSource: DataSource;
      protected target: any;

      constructor(dataSource: DataSource, target: any) {
        this.dataSource = dataSource;
        this.target = target;
      }

      protected safeOperation = jest
        .fn()
        .mockImplementation(async (operation, errorMsg) => {
          try {
            return await operation;
          } catch (error) {
            throw new Error(errorMsg);
          }
        });

      findOne = jest.fn();
      find = jest.fn();
    },
  };
});

describe('AchievementRepository', () => {
  let repository: AchievementRepository;
  let mockDataSource: any;
  let mockBaseRepository: any;

  beforeEach(() => {
    mockDataSource = {
      getRepository: jest.fn(),
    } as unknown as DataSource;

    repository = new AchievementRepository(mockDataSource);
    mockBaseRepository = repository as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findByCode', () => {
    it('should find achievement by code', async () => {
      const mockAchievement = {
        id: '1',
        code: 'FIRST_KILL',
        name: 'First Kill',
      };
      mockBaseRepository.findOne.mockResolvedValue(mockAchievement);

      const result = await repository.findByCode('FIRST_KILL');

      expect(result).toEqual(mockAchievement);
      expect(mockBaseRepository.findOne).toHaveBeenCalledWith({
        where: { code: 'FIRST_KILL' },
      });
    });

    it('should return null when achievement not found', async () => {
      mockBaseRepository.findOne.mockResolvedValue(null);

      const result = await repository.findByCode('NONEXISTENT');

      expect(result).toBeNull();
    });

    it('should throw error when query fails', async () => {
      mockBaseRepository.safeOperation.mockRejectedValueOnce(
        new Error('Failed to find achievement by code: FIRST_KILL'),
      );

      await expect(repository.findByCode('FIRST_KILL')).rejects.toThrow(
        'Failed to find achievement by code: FIRST_KILL',
      );
    });
  });

  describe('findByTier', () => {
    it('should find achievements by tier', async () => {
      const mockAchievements = [
        { id: '1', code: 'ACHIEVEMENT_1', tier: AchievementTier.BRONZE },
        { id: '2', code: 'ACHIEVEMENT_2', tier: AchievementTier.BRONZE },
      ];
      mockBaseRepository.find.mockResolvedValue(mockAchievements);

      const result = await repository.findByTier(AchievementTier.BRONZE);

      expect(result).toEqual(mockAchievements);
      expect(mockBaseRepository.find).toHaveBeenCalledWith({
        where: { tier: AchievementTier.BRONZE },
      });
    });

    it('should return empty array when no achievements found for tier', async () => {
      mockBaseRepository.find.mockResolvedValue([]);

      const result = await repository.findByTier(AchievementTier.GOLD);

      expect(result).toEqual([]);
    });

    it('should throw error when query fails', async () => {
      mockBaseRepository.safeOperation.mockRejectedValueOnce(
        new Error('Failed to find achievements by tier: GOLD'),
      );

      await expect(repository.findByTier(AchievementTier.GOLD)).rejects.toThrow(
        'Failed to find achievements by tier: GOLD',
      );
    });
  });

  describe('findUnlockableRewards', () => {
    it('should find achievements with unlockable rewards', async () => {
      const mockAchievements = [
        { id: '1', code: 'ACHIEVEMENT_1', rewardUnlockableId: 'unlock-1' },
        { id: '2', code: 'ACHIEVEMENT_2', rewardUnlockableId: 'unlock-2' },
      ];
      mockBaseRepository.find.mockResolvedValue(mockAchievements);

      const result = await repository.findUnlockableRewards();

      expect(result).toEqual(mockAchievements);
      expect(mockBaseRepository.find).toHaveBeenCalledWith({
        where: { rewardUnlockableId: expect.anything() },
      });
    });

    it('should return empty array when no achievements with rewards found', async () => {
      mockBaseRepository.find.mockResolvedValue([]);

      const result = await repository.findUnlockableRewards();

      expect(result).toEqual([]);
    });

    it('should throw error when query fails', async () => {
      mockBaseRepository.safeOperation.mockRejectedValueOnce(
        new Error('Failed to find achievements with unlockable rewards'),
      );

      await expect(repository.findUnlockableRewards()).rejects.toThrow(
        'Failed to find achievements with unlockable rewards',
      );
    });
  });
});
