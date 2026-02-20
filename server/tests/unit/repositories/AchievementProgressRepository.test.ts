import { DataSource } from 'typeorm';
import { AchievementProgressRepository } from '../../../src/persistence/repositories/AchievementProgressRepository';
import { AchievementProgress } from '../../../src/persistence/models/AchievementProgress';

// Mock the BaseRepository
jest.mock('../../../src/persistence/repositories/BaseRepository', () => {
  return {
    BaseRepository: class {
      protected dataSource: DataSource;
      protected target: any;
      public manager: any;

      constructor(dataSource: DataSource, target: any) {
        this.dataSource = dataSource;
        this.target = target;
        this.manager = {
          findOne: jest.fn(),
        };
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
      create = jest.fn();
      save = jest.fn();
      update = jest.fn();
      count = jest.fn();
    },
  };
});

describe('AchievementProgressRepository', () => {
  let repository: AchievementProgressRepository;
  let mockDataSource: any;
  let mockBaseRepository: any;

  beforeEach(() => {
    mockDataSource = {
      getRepository: jest.fn(),
    } as unknown as DataSource;

    repository = new AchievementProgressRepository(mockDataSource);
    mockBaseRepository = repository as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findByPlayerId', () => {
    it('should find achievement progress by playerId', async () => {
      const mockProgress = [
        { id: '1', playerId: 'player-1', achievementId: 'ach-1' },
        { id: '2', playerId: 'player-1', achievementId: 'ach-2' },
      ];
      mockBaseRepository.find.mockResolvedValue(mockProgress);

      const result = await repository.findByPlayerId('player-1');

      expect(result).toEqual(mockProgress);
      expect(mockBaseRepository.find).toHaveBeenCalledWith({
        where: { playerId: 'player-1' },
        relations: ['achievement'],
      });
    });

    it('should return empty array when no progress found', async () => {
      mockBaseRepository.find.mockResolvedValue([]);

      const result = await repository.findByPlayerId('player-1');

      expect(result).toEqual([]);
    });

    it('should throw error when query fails', async () => {
      mockBaseRepository.safeOperation.mockRejectedValueOnce(
        new Error('Failed to find achievement progress by playerId: player-1'),
      );

      await expect(repository.findByPlayerId('player-1')).rejects.toThrow(
        'Failed to find achievement progress by playerId: player-1',
      );
    });
  });

  describe('findByAchievementId', () => {
    it('should find achievement progress by player and achievement', async () => {
      const mockProgress = {
        id: '1',
        playerId: 'player-1',
        achievementId: 'ach-1',
      };
      mockBaseRepository.findOne.mockResolvedValue(mockProgress);

      const result = await repository.findByAchievementId('player-1', 'ach-1');

      expect(result).toEqual(mockProgress);
      expect(mockBaseRepository.findOne).toHaveBeenCalledWith({
        where: { playerId: 'player-1', achievementId: 'ach-1' },
      });
    });

    it('should return null when progress not found', async () => {
      mockBaseRepository.findOne.mockResolvedValue(null);

      const result = await repository.findByAchievementId('player-1', 'ach-1');

      expect(result).toBeNull();
    });

    it('should throw error when query fails', async () => {
      mockBaseRepository.safeOperation.mockRejectedValueOnce(
        new Error('Failed to find achievement progress'),
      );

      await expect(
        repository.findByAchievementId('player-1', 'ach-1'),
      ).rejects.toThrow('Failed to find achievement progress');
    });
  });

  describe('incrementProgress', () => {
    it('should create new progress when none exists', async () => {
      // Override findByAchievementId on the repository
      (repository as any).findByAchievementId = jest
        .fn()
        .mockResolvedValue(null);
      const mockNewProgress = {
        id: '1',
        playerId: 'player-1',
        achievementId: 'ach-1',
        progress: 1,
      };
      mockBaseRepository.create.mockReturnValue(mockNewProgress);
      mockBaseRepository.save.mockResolvedValue(mockNewProgress);

      const result = await repository.incrementProgress('player-1', 'ach-1', 1);

      expect(mockBaseRepository.create).toHaveBeenCalledWith({
        playerId: 'player-1',
        achievementId: 'ach-1',
        progress: 1,
        completed: false,
        completedAt: null,
      });
      expect(mockBaseRepository.save).toHaveBeenCalledWith(mockNewProgress);
    });

    it('should update existing progress', async () => {
      // Override findByAchievementId on the repository
      const existingProgress = {
        id: '1',
        playerId: 'player-1',
        achievementId: 'ach-1',
        progress: 5,
        completed: false,
      };
      (repository as any).findByAchievementId = jest
        .fn()
        .mockResolvedValue(existingProgress);
      mockBaseRepository.save.mockResolvedValue(existingProgress);

      await repository.incrementProgress('player-1', 'ach-1', 2);

      expect(existingProgress.progress).toBe(7);
      expect(mockBaseRepository.save).toHaveBeenCalledWith(existingProgress);
    });

    it('should mark as completed when threshold reached', async () => {
      // Override findByAchievementId on the repository
      const existingProgress = {
        id: '1',
        playerId: 'player-1',
        achievementId: 'ach-1',
        progress: 9,
        completed: false,
        completedAt: null,
      };
      (repository as any).findByAchievementId = jest
        .fn()
        .mockResolvedValue(existingProgress);
      mockBaseRepository.manager.findOne.mockResolvedValue({
        id: 'ach-1',
        requiredValue: 10,
      });
      mockBaseRepository.save.mockImplementation((p: any) =>
        Promise.resolve(p),
      );

      const result = await repository.incrementProgress('player-1', 'ach-1', 2);

      expect(result.completed).toBe(true);
      expect(result.completedAt).toBeInstanceOf(Date);
    });

    it('should throw error when operation fails', async () => {
      mockBaseRepository.safeOperation.mockRejectedValueOnce(
        new Error('Failed to update achievement progress'),
      );

      await expect(
        repository.incrementProgress('player-1', 'ach-1', 1),
      ).rejects.toThrow('Failed to update achievement progress');
    });
  });

  describe('markCompleted', () => {
    it('should mark achievement as completed', async () => {
      mockBaseRepository.update.mockResolvedValue({ affected: 1 });

      await repository.markCompleted('player-1', 'ach-1');

      expect(mockBaseRepository.update).toHaveBeenCalledWith(
        { playerId: 'player-1', achievementId: 'ach-1' },
        { completed: true, completedAt: expect.any(Date) },
      );
    });

    it('should throw error when operation fails', async () => {
      mockBaseRepository.safeOperation.mockRejectedValueOnce(
        new Error('Failed to mark achievement as completed'),
      );

      await expect(
        repository.markCompleted('player-1', 'ach-1'),
      ).rejects.toThrow('Failed to mark achievement as completed');
    });
  });

  describe('countCompletedAchievements', () => {
    it('should count completed achievements for player', async () => {
      mockBaseRepository.count.mockResolvedValue(5);

      const result = await repository.countCompletedAchievements('player-1');

      expect(result).toBe(5);
      expect(mockBaseRepository.count).toHaveBeenCalledWith({
        where: { playerId: 'player-1', completed: true },
      });
    });

    it('should throw error when operation fails', async () => {
      mockBaseRepository.safeOperation.mockRejectedValueOnce(
        new Error('Failed to count completed achievements'),
      );

      await expect(
        repository.countCompletedAchievements('player-1'),
      ).rejects.toThrow('Failed to count completed achievements');
    });
  });
});
