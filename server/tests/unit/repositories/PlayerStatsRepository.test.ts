import { DataSource } from 'typeorm';
import { PlayerStatsRepository } from '../../../src/persistence/repositories/PlayerStatsRepository';
import { PlayerStats } from '../../../src/persistence/models/PlayerStats';

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
      
      protected safeOperation = jest.fn().mockImplementation(async (operation, errorMsg) => {
        try {
          return await operation;
        } catch (error) {
          throw new Error(errorMsg);
        }
      });
      
      findOne = jest.fn();
      find = jest.fn();
      update = jest.fn();
      createQueryBuilder = jest.fn().mockReturnValue({
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 1 }),
      });
    },
  };
});

describe('PlayerStatsRepository', () => {
  let repository: PlayerStatsRepository;
  let mockDataSource: any;
  let mockBaseRepository: any;

  beforeEach(() => {
    mockDataSource = {
      getRepository: jest.fn(),
    } as unknown as DataSource;
    
    repository = new PlayerStatsRepository(mockDataSource);
    mockBaseRepository = repository as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findByPlayerId', () => {
    it('should find player stats by playerId', async () => {
      const mockStats = { id: '1', playerId: 'player-1', score: 1000 };
      mockBaseRepository.findOne.mockResolvedValue(mockStats);

      const result = await repository.findByPlayerId('player-1');

      expect(result).toEqual(mockStats);
      expect(mockBaseRepository.findOne).toHaveBeenCalledWith({
        where: { playerId: 'player-1' },
      });
    });

    it('should return null when player stats not found', async () => {
      mockBaseRepository.findOne.mockResolvedValue(null);

      const result = await repository.findByPlayerId('nonexistent');

      expect(result).toBeNull();
    });

    it('should throw error when query fails', async () => {
      mockBaseRepository.safeOperation.mockRejectedValueOnce(
        new Error('Failed to find player stats by playerId: player-1')
      );

      await expect(repository.findByPlayerId('player-1')).rejects.toThrow(
        'Failed to find player stats by playerId: player-1'
      );
    });
  });

  describe('incrementKills', () => {
    it('should increment kills for player by default count of 1', async () => {
      const mockQueryBuilder = {
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 1 }),
      };
      mockBaseRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      await repository.incrementKills('player-1');

      expect(mockBaseRepository.createQueryBuilder).toHaveBeenCalled();
      expect(mockQueryBuilder.update).toHaveBeenCalled();
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('player_id = :playerId', { playerId: 'player-1' });
    });

    it('should increment kills for player by specified count', async () => {
      const mockQueryBuilder = {
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 1 }),
      };
      mockBaseRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      await repository.incrementKills('player-1', 5);

      expect(mockQueryBuilder.set).toHaveBeenCalledWith({ kills: expect.any(Function) });
    });

    it('should call set with correct kills increment', async () => {
      const mockQueryBuilder = {
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 1 }),
      };
      mockBaseRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      await repository.incrementKills('player-1', 3);
      
      const setCall = mockQueryBuilder.set.mock.calls[0][0];
      expect(setCall.kills()).toBe('kills + 3');
    });

    it('should throw error when increment fails', async () => {
      mockBaseRepository.safeOperation.mockRejectedValueOnce(
        new Error('Failed to increment kills for player player-1')
      );

      await expect(repository.incrementKills('player-1')).rejects.toThrow(
        'Failed to increment kills for player player-1'
      );
    });
  });

  describe('incrementDeaths', () => {
    it('should increment deaths for player by default count of 1', async () => {
      const mockQueryBuilder = {
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 1 }),
      };
      mockBaseRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      await repository.incrementDeaths('player-1');

      expect(mockBaseRepository.createQueryBuilder).toHaveBeenCalled();
      expect(mockQueryBuilder.set).toHaveBeenCalled();
    });

    it('should increment deaths for player by specified count', async () => {
      const mockQueryBuilder = {
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 1 }),
      };
      mockBaseRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      await repository.incrementDeaths('player-1', 3);

      expect(mockQueryBuilder.set).toHaveBeenCalledWith({ deaths: expect.any(Function) });
    });

    it('should call set with correct deaths increment', async () => {
      const mockQueryBuilder = {
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 1 }),
      };
      mockBaseRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      await repository.incrementDeaths('player-1', 2);
      
      const setCall = mockQueryBuilder.set.mock.calls[0][0];
      expect(setCall.deaths()).toBe('deaths + 2');
    });

    it('should throw error when increment fails', async () => {
      mockBaseRepository.safeOperation.mockRejectedValueOnce(
        new Error('Failed to increment deaths for player player-1')
      );

      await expect(repository.incrementDeaths('player-1')).rejects.toThrow(
        'Failed to increment deaths for player player-1'
      );
    });
  });

  describe('updateScore', () => {
    it('should update score for player with positive delta', async () => {
      const mockQueryBuilder = {
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 1 }),
      };
      mockBaseRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      await repository.updateScore('player-1', 100);

      expect(mockQueryBuilder.set).toHaveBeenCalled();
    });

    it('should update score for player with negative delta', async () => {
      const mockQueryBuilder = {
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 1 }),
      };
      mockBaseRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      await repository.updateScore('player-1', -50);

      expect(mockQueryBuilder.set).toHaveBeenCalledWith({ score: expect.any(Function) });
    });

    it('should call set with correct score delta', async () => {
      const mockQueryBuilder = {
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 1 }),
      };
      mockBaseRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      await repository.updateScore('player-1', 250);
      
      const setCall = mockQueryBuilder.set.mock.calls[0][0];
      expect(setCall.score()).toBe('score + 250');
    });

    it('should throw error when update fails', async () => {
      mockBaseRepository.safeOperation.mockRejectedValueOnce(
        new Error('Failed to update score for player player-1')
      );

      await expect(repository.updateScore('player-1', 100)).rejects.toThrow(
        'Failed to update score for player player-1'
      );
    });
  });

  describe('updatePlayTime', () => {
    it('should update play time for player', async () => {
      const mockQueryBuilder = {
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 1 }),
      };
      mockBaseRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      await repository.updatePlayTime('player-1', 3600);

      expect(mockQueryBuilder.set).toHaveBeenCalledWith({ playTimeSeconds: expect.any(Function) });
    });

    it('should call set with correct play time increment', async () => {
      const mockQueryBuilder = {
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 1 }),
      };
      mockBaseRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      await repository.updatePlayTime('player-1', 1800);
      
      const setCall = mockQueryBuilder.set.mock.calls[0][0];
      expect(setCall.playTimeSeconds()).toBe('play_time_seconds + 1800');
    });

    it('should throw error when update fails', async () => {
      mockBaseRepository.safeOperation.mockRejectedValueOnce(
        new Error('Failed to update play time for player player-1')
      );

      await expect(repository.updatePlayTime('player-1', 3600)).rejects.toThrow(
        'Failed to update play time for player player-1'
      );
    });
  });

  describe('findTopPlayersByScore', () => {
    it('should return top players ordered by score', async () => {
      const mockStats = [
        { id: '1', playerId: 'player-1', score: 1000 },
        { id: '2', playerId: 'player-2', score: 900 },
      ];
      mockBaseRepository.find.mockResolvedValue(mockStats);

      const result = await repository.findTopPlayersByScore(10);

      expect(result).toEqual(mockStats);
      expect(mockBaseRepository.find).toHaveBeenCalledWith({
        order: { score: 'DESC' },
        take: 10,
      });
    });

    it('should use default limit of 10', async () => {
      mockBaseRepository.find.mockResolvedValue([]);

      await repository.findTopPlayersByScore();

      expect(mockBaseRepository.find).toHaveBeenCalledWith({
        order: { score: 'DESC' },
        take: 10,
      });
    });

    it('should throw error when query fails', async () => {
      mockBaseRepository.safeOperation.mockRejectedValueOnce(
        new Error('Failed to find top players by score')
      );

      await expect(repository.findTopPlayersByScore()).rejects.toThrow(
        'Failed to find top players by score'
      );
    });
  });
});
