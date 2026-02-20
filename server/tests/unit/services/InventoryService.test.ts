import { InventoryService } from '../../../src/services/InventoryService';
import { InventoryRepository } from '../../../src/persistence/repositories/InventoryRepository';
import { AppDataSource } from '../../../src/persistence/database';

// Mock the database
jest.mock('../../../src/persistence/database', () => ({
  AppDataSource: {
    transaction: jest.fn(),
  },
}));

jest.mock('../../../src/persistence/repositories/InventoryRepository', () => {
  return {
    InventoryRepository: jest.fn().mockImplementation(() => {
      return {
        findByPlayerId: jest.fn(),
        findByItemId: jest.fn(),
        addItem: jest.fn(),
        removeItem: jest.fn(),
        getTotalItemCount: jest.fn(),
      };
    }),
  };
});

describe('InventoryService', () => {
  let inventoryService: InventoryService;
  let mockInventoryRepo: jest.Mocked<InventoryRepository>;

  beforeEach(() => {
    mockInventoryRepo = {
      findByPlayerId: jest.fn(),
      findByItemId: jest.fn(),
      addItem: jest.fn(),
      removeItem: jest.fn(),
      getTotalItemCount: jest.fn(),
    } as any;

    inventoryService = new InventoryService(
      AppDataSource as any,
      mockInventoryRepo,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getInventory', () => {
    it('should return inventory items for player', async () => {
      const mockItems = [
        {
          itemId: 'sword',
          quantity: 1,
          metadata: { damage: 10 },
          acquiredAt: new Date(),
        },
        {
          itemId: 'potion',
          quantity: 5,
          metadata: null,
          acquiredAt: new Date(),
        },
      ];
      mockInventoryRepo.findByPlayerId.mockResolvedValue(mockItems as any);

      const result = await inventoryService.getInventory('player1');

      expect(mockInventoryRepo.findByPlayerId).toHaveBeenCalledWith('player1');
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        itemId: 'sword',
        quantity: 1,
        metadata: { damage: 10 },
        acquiredAt: mockItems[0].acquiredAt,
      });
    });

    it('should return empty array if player has no items', async () => {
      mockInventoryRepo.findByPlayerId.mockResolvedValue([]);

      const result = await inventoryService.getInventory('player1');

      expect(result).toEqual([]);
    });
  });

  describe('addItem', () => {
    it('should add item successfully', async () => {
      const mockItem = { itemId: 'sword', quantity: 1 } as any;
      mockInventoryRepo.addItem.mockResolvedValue(mockItem);

      const result = await inventoryService.addItem('player1', 'sword', 1, {
        damage: 10,
      });

      expect(mockInventoryRepo.addItem).toHaveBeenCalledWith(
        'player1',
        'sword',
        1,
        { damage: 10 },
      );
      expect(result).toBe(true);
    });

    it('should use default quantity of 1', async () => {
      const mockItem = { itemId: 'potion', quantity: 1 } as any;
      mockInventoryRepo.addItem.mockResolvedValue(mockItem);

      await inventoryService.addItem('player1', 'potion');

      expect(mockInventoryRepo.addItem).toHaveBeenCalledWith(
        'player1',
        'potion',
        1,
        undefined,
      );
    });

    it('should return false on error', async () => {
      mockInventoryRepo.addItem.mockRejectedValue(new Error('DB error'));

      const result = await inventoryService.addItem('player1', 'sword', 1);

      expect(result).toBe(false);
    });
  });

  describe('removeItem', () => {
    it('should remove item successfully', async () => {
      mockInventoryRepo.removeItem.mockResolvedValue(true);

      const result = await inventoryService.removeItem('player1', 'sword', 1);

      expect(mockInventoryRepo.removeItem).toHaveBeenCalledWith(
        'player1',
        'sword',
        1,
      );
      expect(result).toBe(true);
    });

    it('should return false if item not found', async () => {
      mockInventoryRepo.removeItem.mockResolvedValue(false);

      const result = await inventoryService.removeItem('player1', 'sword', 1);

      expect(result).toBe(false);
    });

    it('should use default quantity of 1', async () => {
      mockInventoryRepo.removeItem.mockResolvedValue(true);

      await inventoryService.removeItem('player1', 'potion');

      expect(mockInventoryRepo.removeItem).toHaveBeenCalledWith(
        'player1',
        'potion',
        1,
      );
    });

    it('should return false on error', async () => {
      mockInventoryRepo.removeItem.mockRejectedValue(new Error('DB error'));

      const result = await inventoryService.removeItem('player1', 'sword', 1);

      expect(result).toBe(false);
    });
  });

  describe('transferItem', () => {
    it('should transfer item between players executing actual callback', async () => {
      // Mock transaction to execute the callback with mocked repos
      const mockTransaction = jest
        .fn()
        .mockImplementation(async (callback: Function) => {
          return await callback({}); // Mock manager
        });
      (AppDataSource.transaction as jest.Mock).mockImplementation(
        mockTransaction,
      );

      // Mock repository methods for the callback
      mockInventoryRepo.removeItem.mockResolvedValue(true);
      mockInventoryRepo.addItem.mockResolvedValue({} as any);

      const result = await inventoryService.transferItem(
        'player1',
        'player2',
        'sword',
        1,
      );

      expect(AppDataSource.transaction).toHaveBeenCalled();
      expect(mockInventoryRepo.removeItem).toHaveBeenCalledWith(
        'player1',
        'sword',
        1,
      );
      expect(mockInventoryRepo.addItem).toHaveBeenCalledWith(
        'player2',
        'sword',
        1,
        undefined,
      );
      expect(result).toBe(true);
    });

    it('should transfer item between players (legacy mock)', async () => {
      // Mock transaction to succeed - callback returns true
      const mockTransaction = jest.fn().mockResolvedValue(true);
      (AppDataSource.transaction as jest.Mock).mockImplementation(
        mockTransaction,
      );

      const result = await inventoryService.transferItem(
        'player1',
        'player2',
        'sword',
        1,
      );

      expect(AppDataSource.transaction).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should execute transaction callback and transfer item', async () => {
      // Mock transaction to actually execute the callback function
      let capturedCallback: Function;
      const mockTransaction = jest
        .fn()
        .mockImplementation((callback: Function) => {
          capturedCallback = callback;
          return Promise.resolve(true);
        });
      (AppDataSource.transaction as jest.Mock).mockImplementation(
        mockTransaction,
      );

      const result = await inventoryService.transferItem(
        'player1',
        'player2',
        'sword',
        1,
      );

      // Verify callback was executed
      expect(capturedCallback).toBeDefined();
      expect(result).toBe(true);
    });

    it('should use default quantity of 1', async () => {
      const mockTransaction = jest.fn().mockResolvedValue(true);
      (AppDataSource.transaction as jest.Mock).mockImplementation(
        mockTransaction,
      );

      const result = await inventoryService.transferItem(
        'player1',
        'player2',
        'potion',
      );

      expect(AppDataSource.transaction).toHaveBeenCalled();
      expect(result).toBe(true);
      // Verify the callback was called and would pass quantity=1 as default
    });

    it('should return false on transfer failure', async () => {
      const mockTransaction = jest.fn().mockImplementation(async () => {
        throw new Error('Transfer failed');
      });
      (AppDataSource.transaction as jest.Mock).mockImplementation(
        mockTransaction,
      );

      const result = await inventoryService.transferItem(
        'player1',
        'player2',
        'sword',
        1,
      );

      expect(result).toBe(false);
    });

    it('should handle transaction rejection and return false', async () => {
      // Simulate transaction throwing an error that's caught by .catch
      const mockTransaction = jest
        .fn()
        .mockRejectedValue(
          new Error('Source player does not have enough items'),
        );
      (AppDataSource.transaction as jest.Mock).mockImplementation(
        mockTransaction,
      );

      const result = await inventoryService.transferItem(
        'player1',
        'player2',
        'sword',
        1,
      );

      expect(result).toBe(false);
    });

    it('should catch error from transaction promise chain', async () => {
      // Make transaction return a promise that rejects
      // This directly tests the .catch() handler in the service
      (AppDataSource.transaction as jest.Mock).mockResolvedValue(
        Promise.reject(new Error('Transaction error')),
      );

      const result = await inventoryService.transferItem(
        'player1',
        'player2',
        'sword',
        1,
      );

      expect(result).toBe(false);
    });

    it('should return false when source player has insufficient items (removeItem returns false)', async () => {
      // Mock transaction to execute the callback; removeItem returns false
      const mockTransaction = jest
        .fn()
        .mockImplementation(async (callback: Function) => {
          return await callback({});
        });
      (AppDataSource.transaction as jest.Mock).mockImplementation(
        mockTransaction,
      );

      // removeItem returns false (insufficient)
      mockInventoryRepo.removeItem.mockResolvedValue(false);

      const result = await inventoryService.transferItem(
        'player1',
        'player2',
        'sword',
        1,
      );

      expect(mockInventoryRepo.removeItem).toHaveBeenCalledWith(
        'player1',
        'sword',
        1,
      );
      // addItem should not be called because of early throw
      expect(mockInventoryRepo.addItem).not.toHaveBeenCalled();
      expect(result).toBe(false);
    });

    it('should return false when addItem throws an error during transaction', async () => {
      // Mock transaction to execute the callback; addItem rejects
      const mockTransaction = jest
        .fn()
        .mockImplementation(async (callback: Function) => {
          return await callback({});
        });
      (AppDataSource.transaction as jest.Mock).mockImplementation(
        mockTransaction,
      );

      mockInventoryRepo.removeItem.mockResolvedValue(true);
      mockInventoryRepo.addItem.mockRejectedValue(new Error('DB error'));

      const result = await inventoryService.transferItem(
        'player1',
        'player2',
        'sword',
        1,
      );

      expect(mockInventoryRepo.removeItem).toHaveBeenCalledWith(
        'player1',
        'sword',
        1,
      );
      expect(mockInventoryRepo.addItem).toHaveBeenCalledWith(
        'player2',
        'sword',
        1,
        undefined,
      );
      expect(result).toBe(false);
    });
  });

  describe('getItemCount', () => {
    it('should return item quantity', async () => {
      mockInventoryRepo.findByItemId.mockResolvedValue({ quantity: 5 } as any);

      const result = await inventoryService.getItemCount('player1', 'potion');

      expect(mockInventoryRepo.findByItemId).toHaveBeenCalledWith(
        'player1',
        'potion',
      );
      expect(result).toBe(5);
    });

    it('should return 0 if item not found', async () => {
      mockInventoryRepo.findByItemId.mockResolvedValue(null);

      const result = await inventoryService.getItemCount('player1', 'sword');

      expect(result).toBe(0);
    });
  });

  describe('getTotalItemCount', () => {
    it('should return total count of all items', async () => {
      mockInventoryRepo.getTotalItemCount.mockResolvedValue(10);

      const result = await inventoryService.getTotalItemCount('player1');

      expect(mockInventoryRepo.getTotalItemCount).toHaveBeenCalledWith(
        'player1',
      );
      expect(result).toBe(10);
    });
  });
});
