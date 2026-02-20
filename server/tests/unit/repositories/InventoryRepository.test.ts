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

// Mock BaseRepository to mock TypeORM's Repository methods
jest.mock('../../../src/persistence/repositories/BaseRepository', () => {
  return {
    BaseRepository: jest.fn().mockImplementation(() => ({
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      createQueryBuilder: jest.fn(),
      create: jest.fn((entity) => entity),
    })),
  };
});

import { InventoryRepository } from '../../../src/persistence/repositories/InventoryRepository';
import { BaseRepository } from '../../../src/persistence/repositories/BaseRepository';

describe('InventoryRepository', () => {
  let repository: InventoryRepository;
  let mockDataSource: Partial<DataSource>;
  let mockFind: jest.Mock;
  let mockFindOne: jest.Mock;
  let mockSave: jest.Mock;
  let mockDelete: jest.Mock;
  let mockCount: jest.Mock;
  let mockCreateQueryBuilder: jest.Mock;
  let mockCreate: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockFind = jest.fn();
    mockFindOne = jest.fn();
    mockSave = jest.fn();
    mockDelete = jest.fn();
    mockCount = jest.fn();
    mockCreateQueryBuilder = jest.fn();
    mockCreate = jest.fn((entity) => entity);

    // Mock BaseRepository constructor
    (BaseRepository as any).mockImplementation(function (this: any) {
      this.find = mockFind;
      this.findOne = mockFindOne;
      this.save = mockSave;
      this.delete = mockDelete;
      this.count = mockCount;
      this.createQueryBuilder = mockCreateQueryBuilder;
      this.create = mockCreate;
      // Mock safeOperation to just execute the operation
      this.safeOperation = jest.fn().mockImplementation(async (op) => await op);
    });

    mockDataSource = {} as DataSource;

    repository = new InventoryRepository(mockDataSource as DataSource);
  });

  describe('findByPlayerId', () => {
    it('should return inventory items for a player', async () => {
      const mockInventory = [
        { playerId: 'player1', itemId: 'item1', quantity: 5 },
        { playerId: 'player1', itemId: 'item2', quantity: 10 },
      ];
      mockFind.mockResolvedValue(mockInventory);

      const result = await repository.findByPlayerId('player1');

      expect(mockFind).toHaveBeenCalledWith({ where: { playerId: 'player1' } });
      expect(result).toEqual(mockInventory);
    });

    it('should handle empty results', async () => {
      mockFind.mockResolvedValue([]);

      const result = await repository.findByPlayerId('player1');

      expect(result).toEqual([]);
    });

    it('should propagate errors through safeOperation', async () => {
      const error = new Error('Database error');
      mockFind.mockRejectedValue(error);

      await expect(repository.findByPlayerId('player1')).rejects.toThrow(
        'Database error',
      );
    });
  });

  describe('findByItemId', () => {
    it('should return inventory item when found', async () => {
      const mockItem = { playerId: 'player1', itemId: 'item1', quantity: 5 };
      mockFindOne.mockResolvedValue(mockItem);

      const result = await repository.findByItemId('player1', 'item1');

      expect(mockFindOne).toHaveBeenCalledWith({
        where: { playerId: 'player1', itemId: 'item1' },
      });
      expect(result).toEqual(mockItem);
    });

    it('should return null when item not found', async () => {
      mockFindOne.mockResolvedValue(null);

      const result = await repository.findByItemId('player1', 'nonexistent');

      expect(result).toBeNull();
    });

    it('should handle errors', async () => {
      const error = new Error('Database error');
      mockFindOne.mockRejectedValue(error);

      await expect(repository.findByItemId('player1', 'item1')).rejects.toThrow(
        'Database error',
      );
    });
  });

  describe('addItem', () => {
    it('should add new item when it does not exist', async () => {
      mockFindOne.mockResolvedValue(null);
      const mockSavedItem = {
        playerId: 'player1',
        itemId: 'item1',
        quantity: 3,
        metadata: { rarity: 'rare' },
      };
      mockSave.mockResolvedValue(mockSavedItem);

      const result = await repository.addItem('player1', 'item1', 3, {
        rarity: 'rare',
      });

      expect(mockFindOne).toHaveBeenCalledWith({
        where: { playerId: 'player1', itemId: 'item1' },
      });
      expect(mockCreate).toHaveBeenCalledWith({
        playerId: 'player1',
        itemId: 'item1',
        quantity: 3,
        metadata: { rarity: 'rare' },
        acquiredAt: expect.any(Date),
      });
      expect(mockSave).toHaveBeenCalledWith(
        expect.objectContaining({
          playerId: 'player1',
          itemId: 'item1',
          quantity: 3,
        }),
      );
      expect(result).toEqual(mockSavedItem);
    });

    it('should update existing item by increasing quantity', async () => {
      const existingItem = {
        playerId: 'player1',
        itemId: 'item1',
        quantity: 5,
        metadata: { rarity: 'common' },
      };
      mockFindOne.mockResolvedValue(existingItem);
      const updatedItem = {
        ...existingItem,
        quantity: 8,
        metadata: { rarity: 'rare' },
      };
      mockSave.mockResolvedValue(updatedItem);

      const result = await repository.addItem('player1', 'item1', 3, {
        rarity: 'rare',
      });

      expect(result).toEqual(updatedItem);
      expect(existingItem.quantity).toBe(8);
      expect(existingItem.metadata).toEqual({ rarity: 'rare' });
    });

    it('should update existing item without metadata', async () => {
      const existingItem = {
        playerId: 'player1',
        itemId: 'item1',
        quantity: 5,
      };
      mockFindOne.mockResolvedValue(existingItem);
      const updatedItem = { ...existingItem, quantity: 7 };
      mockSave.mockResolvedValue(updatedItem);

      const result = await repository.addItem('player1', 'item1', 2);

      expect(result).toEqual(updatedItem);
      expect(existingItem.quantity).toBe(7);
    });

    it('should handle errors when adding item', async () => {
      mockFindOne.mockResolvedValue(null);
      const error = new Error('Save failed');
      mockSave.mockRejectedValue(error);

      await expect(repository.addItem('player1', 'item1', 1)).rejects.toThrow(
        'Save failed',
      );
    });
  });

  describe('removeItem', () => {
    it('should return false when item does not exist', async () => {
      mockFindOne.mockResolvedValue(null);

      const result = await repository.removeItem('player1', 'nonexistent');

      expect(result).toBe(false);
      expect(mockDelete).not.toHaveBeenCalled();
      expect(mockSave).not.toHaveBeenCalled();
    });

    it('should delete item when quantity equals or exceeds item quantity', async () => {
      const item = { playerId: 'player1', itemId: 'item1', quantity: 2 };
      mockFindOne.mockResolvedValue(item);
      mockDelete.mockResolvedValue({ affected: 1 });

      const result = await repository.removeItem('player1', 'item1', 2);

      expect(result).toBe(true);
      expect(mockDelete).toHaveBeenCalledWith({
        playerId: 'player1',
        itemId: 'item1',
      });
      expect(mockSave).not.toHaveBeenCalled();
    });

    it('should delete item when quantity is greater than item quantity', async () => {
      const item = { playerId: 'player1', itemId: 'item1', quantity: 1 };
      mockFindOne.mockResolvedValue(item);
      mockDelete.mockResolvedValue({ affected: 1 });

      const result = await repository.removeItem('player1', 'item1', 5);

      expect(result).toBe(true);
      expect(mockDelete).toHaveBeenCalledWith({
        playerId: 'player1',
        itemId: 'item1',
      });
    });

    it('should decrement quantity when removal quantity is less than item quantity', async () => {
      const item = { playerId: 'player1', itemId: 'item1', quantity: 10 };
      mockFindOne.mockResolvedValue(item);
      const updatedItem = { ...item, quantity: 7 };
      mockSave.mockResolvedValue(updatedItem);

      const result = await repository.removeItem('player1', 'item1', 3);

      expect(result).toBe(true);
      expect(item.quantity).toBe(7);
      expect(mockSave).toHaveBeenCalledWith(item);
      expect(mockDelete).not.toHaveBeenCalled();
    });

    it('should handle errors during delete', async () => {
      const item = { playerId: 'player1', itemId: 'item1', quantity: 1 };
      mockFindOne.mockResolvedValue(item);
      const error = new Error('Delete failed');
      mockDelete.mockRejectedValue(error);

      await expect(
        repository.removeItem('player1', 'item1', 1),
      ).rejects.toThrow('Delete failed');
    });

    it('should handle errors during save when decrementing', async () => {
      const item = { playerId: 'player1', itemId: 'item1', quantity: 10 };
      mockFindOne.mockResolvedValue(item);
      const error = new Error('Save failed');
      mockSave.mockRejectedValue(error);

      await expect(
        repository.removeItem('player1', 'item1', 3),
      ).rejects.toThrow('Save failed');
    });
  });

  describe('getTotalItemCount', () => {
    it('should return sum of all item quantities for a player', async () => {
      mockCreateQueryBuilder.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ total: '25' }),
      });

      const result = await repository.getTotalItemCount('player1');

      expect(mockCreateQueryBuilder).toHaveBeenCalledWith('inventory');
      expect(result).toBe(25);
    });

    it('should return 0 when no items exist', async () => {
      mockCreateQueryBuilder.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({}),
      });

      const result = await repository.getTotalItemCount('player1');

      expect(result).toBe(0);
    });

    it('should handle errors in query', async () => {
      mockCreateQueryBuilder.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockRejectedValue(new Error('Query failed')),
      });

      await expect(repository.getTotalItemCount('player1')).rejects.toThrow(
        'Query failed',
      );
    });
  });
});
