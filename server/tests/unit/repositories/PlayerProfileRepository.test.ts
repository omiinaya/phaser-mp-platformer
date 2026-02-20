import { DataSource, FindOneOptions, FindOptionsWhere } from 'typeorm';
import { PlayerProfileRepository } from '../../../src/persistence/repositories/PlayerProfileRepository';
import { PlayerProfile } from '../../../src/persistence/models/PlayerProfile';

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

describe('PlayerProfileRepository', () => {
  let repository: PlayerProfileRepository;
  let mockDataSource: any;
  let mockBaseRepository: any;

  beforeEach(() => {
    mockDataSource = {
      getRepository: jest.fn(),
    } as unknown as DataSource;

    repository = new PlayerProfileRepository(mockDataSource);
    mockBaseRepository = repository as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findByUsername', () => {
    it('should find player profile by username', async () => {
      const mockProfile = { id: '1', username: 'testuser' };
      mockBaseRepository.findOne.mockResolvedValue(mockProfile);

      const result = await repository.findByUsername('testuser');

      expect(result).toEqual(mockProfile);
      expect(mockBaseRepository.findOne).toHaveBeenCalledWith({
        where: { username: 'testuser' },
      });
    });

    it('should return null when player not found', async () => {
      mockBaseRepository.findOne.mockResolvedValue(null);

      const result = await repository.findByUsername('nonexistent');

      expect(result).toBeNull();
    });

    it('should throw error when query fails', async () => {
      mockBaseRepository.safeOperation.mockRejectedValueOnce(
        new Error('Failed to find player profile by username: testuser'),
      );

      await expect(repository.findByUsername('testuser')).rejects.toThrow(
        'Failed to find player profile by username: testuser',
      );
    });
  });

  describe('findByEmail', () => {
    it('should find player profile by email', async () => {
      const mockProfile = { id: '1', email: 'test@example.com' };
      mockBaseRepository.findOne.mockResolvedValue(mockProfile);

      const result = await repository.findByEmail('test@example.com');

      expect(result).toEqual(mockProfile);
      expect(mockBaseRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
    });

    it('should return null when email not found', async () => {
      mockBaseRepository.findOne.mockResolvedValue(null);

      const result = await repository.findByEmail('nonexistent@example.com');

      expect(result).toBeNull();
    });
  });

  describe('findTopPlayersByLevel', () => {
    it('should return top players ordered by level and experience', async () => {
      const mockProfiles = [
        { id: '1', level: 10, experience: 1000 },
        { id: '2', level: 9, experience: 900 },
      ];
      mockBaseRepository.find.mockResolvedValue(mockProfiles);

      const result = await repository.findTopPlayersByLevel(10);

      expect(result).toEqual(mockProfiles);
      expect(mockBaseRepository.find).toHaveBeenCalledWith({
        order: { level: 'DESC', experience: 'DESC' },
        take: 10,
      });
    });

    it('should use default limit of 10', async () => {
      mockBaseRepository.find.mockResolvedValue([]);

      await repository.findTopPlayersByLevel();

      expect(mockBaseRepository.find).toHaveBeenCalledWith({
        order: { level: 'DESC', experience: 'DESC' },
        take: 10,
      });
    });

    it('should throw error when query fails', async () => {
      mockBaseRepository.safeOperation.mockRejectedValueOnce(
        new Error('Failed to find top players by level'),
      );

      await expect(repository.findTopPlayersByLevel()).rejects.toThrow(
        'Failed to find top players by level',
      );
    });
  });

  describe('updateLastLogin', () => {
    it('should update last login timestamp for player', async () => {
      mockBaseRepository.update.mockResolvedValue({ affected: 1 });

      await repository.updateLastLogin('player-1');

      expect(mockBaseRepository.update).toHaveBeenCalledWith('player-1', {
        lastLogin: expect.any(Date),
      });
    });

    it('should throw error when update fails', async () => {
      mockBaseRepository.safeOperation.mockRejectedValueOnce(
        new Error('Failed to update last login for player player-1'),
      );

      await expect(repository.updateLastLogin('player-1')).rejects.toThrow(
        'Failed to update last login for player player-1',
      );
    });
  });

  describe('incrementCoins', () => {
    it('should increment coins for player', async () => {
      const mockQueryBuilder = {
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 1 }),
      };
      mockBaseRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      await repository.incrementCoins('player-1', 100);

      expect(mockBaseRepository.createQueryBuilder).toHaveBeenCalled();
      expect(mockQueryBuilder.update).toHaveBeenCalled();
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('id = :id', {
        id: 'player-1',
      });
      expect(mockQueryBuilder.execute).toHaveBeenCalled();
    });

    it('should throw error when increment fails', async () => {
      mockBaseRepository.safeOperation.mockRejectedValueOnce(
        new Error('Failed to increment coins for player player-1'),
      );

      await expect(repository.incrementCoins('player-1', 100)).rejects.toThrow(
        'Failed to increment coins for player player-1',
      );
    });
  });
});
