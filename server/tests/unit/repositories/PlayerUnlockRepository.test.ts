import { DataSource } from 'typeorm';

// Mock the logger
jest.mock('../../../src/utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock BaseRepository
jest.mock('../../../src/persistence/repositories/BaseRepository', () => {
  return {
    BaseRepository: jest.fn().mockImplementation(() => ({
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      createQueryBuilder: jest.fn(),
      create: jest.fn((entity) => entity),
    })),
  };
});

import { PlayerUnlockRepository } from '../../../src/persistence/repositories/PlayerUnlockRepository';
import { BaseRepository } from '../../../src/persistence/repositories/BaseRepository';

describe('PlayerUnlockRepository', () => {
  let repository: PlayerUnlockRepository;
  let mockDataSource: Partial<DataSource>;
  let mockFind: jest.Mock;
  let mockFindOne: jest.Mock;
  let mockSave: jest.Mock;
  let mockCount: jest.Mock;
  let mockUpdate: jest.Mock;
  let mockDelete: jest.Mock;
  let mockCreate: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockFind = jest.fn();
    mockFindOne = jest.fn();
    mockSave = jest.fn();
    mockCount = jest.fn();
    mockUpdate = jest.fn();
    mockDelete = jest.fn();
    mockCreate = jest.fn((entity) => entity);

    (BaseRepository as any).mockImplementation(function (this: any) {
      this.find = mockFind;
      this.findOne = mockFindOne;
      this.save = mockSave;
      this.count = mockCount;
      this.update = mockUpdate;
      this.delete = mockDelete;
      this.createQueryBuilder = jest.fn();
      this.create = mockCreate;
      this.safeOperation = jest.fn().mockImplementation(async (op) => await op);
    });

    mockDataSource = {} as DataSource;

    repository = new PlayerUnlockRepository(mockDataSource as DataSource);
  });

  describe('findByPlayerId', () => {
    it('should return player unlocks with relations', async () => {
      const mockUnlocks = [
        {
          playerId: 'player1',
          unlockableId: 'unlock1',
          unlockable: { id: 'unlock1', name: 'Unlock 1' },
        },
        {
          playerId: 'player1',
          unlockableId: 'unlock2',
          unlockable: { id: 'unlock2', name: 'Unlock 2' },
        },
      ];
      mockFind.mockResolvedValue(mockUnlocks);

      const result = await repository.findByPlayerId('player1');

      expect(mockFind).toHaveBeenCalledWith({
        where: { playerId: 'player1' },
        relations: ['unlockable'],
      });
      expect(result).toEqual(mockUnlocks);
    });

    it('should return empty array when no unlocks found', async () => {
      mockFind.mockResolvedValue([]);

      const result = await repository.findByPlayerId('player1');

      expect(result).toEqual([]);
    });
  });

  describe('hasUnlocked', () => {
    it('should return true when unlock exists', async () => {
      mockCount.mockResolvedValue(2);

      const result = await repository.hasUnlocked('player1', 'unlock1');

      expect(mockCount).toHaveBeenCalledWith({
        where: { playerId: 'player1', unlockableId: 'unlock1' },
      });
      expect(result).toBe(true);
    });

    it('should return false when unlock does not exist', async () => {
      mockCount.mockResolvedValue(0);

      const result = await repository.hasUnlocked('player1', 'nonexistent');

      expect(result).toBe(false);
    });
  });

  describe('unlock', () => {
    it('should create new unlock when it does not exist', async () => {
      mockFindOne.mockResolvedValue(null);
      const mockUnlock = {
        playerId: 'player1',
        unlockableId: 'unlock1',
        unlockedAt: new Date(),
        notified: false,
      };
      mockSave.mockResolvedValue(mockUnlock);

      const result = await repository.unlock('player1', 'unlock1');

      expect(mockFindOne).toHaveBeenCalledWith({
        where: { playerId: 'player1', unlockableId: 'unlock1' },
      });
      expect(mockCreate).toHaveBeenCalledWith({
        playerId: 'player1',
        unlockableId: 'unlock1',
        unlockedAt: expect.any(Date),
        notified: false,
      });
      expect(mockSave).toHaveBeenCalledWith(
        expect.objectContaining({
          playerId: 'player1',
          unlockableId: 'unlock1',
        }),
      );
      expect(result).toEqual(mockUnlock);
    });

    it('should return existing unlock if already unlocked', async () => {
      const existingUnlock = {
        playerId: 'player1',
        unlockableId: 'unlock1',
        unlockedAt: new Date(),
        notified: true,
      };
      mockFindOne.mockResolvedValue(existingUnlock);

      const result = await repository.unlock('player1', 'unlock1');

      expect(result).toEqual(existingUnlock);
      expect(mockSave).not.toHaveBeenCalled();
    });

    it('should handle save errors', async () => {
      mockFindOne.mockResolvedValue(null);
      const error = new Error('Save failed');
      mockSave.mockRejectedValue(error);

      await expect(repository.unlock('player1', 'unlock1')).rejects.toThrow(
        'Save failed',
      );
    });
  });

  describe('markAsNotified', () => {
    it('should update unlock to mark as notified', async () => {
      mockUpdate.mockResolvedValue({ affected: 1 });

      await repository.markAsNotified('player1', 'unlock1');

      expect(mockUpdate).toHaveBeenCalledWith(
        { playerId: 'player1', unlockableId: 'unlock1' },
        { notified: true },
      );
    });

    it('should handle update errors', async () => {
      const error = new Error('Update failed');
      mockUpdate.mockRejectedValue(error);

      await expect(
        repository.markAsNotified('player1', 'unlock1'),
      ).rejects.toThrow('Update failed');
    });
  });

  describe('countUnlocksByPlayer', () => {
    it('should return count of unlocks for a player', async () => {
      mockCount.mockResolvedValue(5);

      const result = await repository.countUnlocksByPlayer('player1');

      expect(mockCount).toHaveBeenCalledWith({
        where: { playerId: 'player1' },
      });
      expect(result).toBe(5);
    });

    it('should return 0 when player has no unlocks', async () => {
      mockCount.mockResolvedValue(0);

      const result = await repository.countUnlocksByPlayer('player1');

      expect(result).toBe(0);
    });
  });
});
