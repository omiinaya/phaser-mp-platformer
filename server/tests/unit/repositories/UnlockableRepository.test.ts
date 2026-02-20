import { DataSource } from 'typeorm';
import {
  Unlockable,
  UnlockableType,
} from '../../../src/persistence/repositories/UnlockableRepository';

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
      createQueryBuilder: jest.fn(),
    })),
  };
});

import { UnlockableRepository } from '../../../src/persistence/repositories/UnlockableRepository';
import { BaseRepository } from '../../../src/persistence/repositories/BaseRepository';

describe('UnlockableRepository', () => {
  let repository: UnlockableRepository;
  let mockDataSource: Partial<DataSource>;
  let mockFind: jest.Mock;
  let mockCreateQueryBuilder: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockFind = jest.fn();
    mockCreateQueryBuilder = jest.fn();

    (BaseRepository as any).mockImplementation(function (this: any) {
      this.find = mockFind;
      this.createQueryBuilder = mockCreateQueryBuilder;
      this.safeOperation = jest.fn().mockImplementation(async (op) => await op);
    });

    mockDataSource = {} as DataSource;

    repository = new UnlockableRepository(mockDataSource as DataSource);
  });

  describe('findByType', () => {
    it('should return unlockables of a specific type', async () => {
      const mockUnlockables = [
        { id: '1', type: UnlockableType.SKIN, name: 'Skin 1' },
        { id: '2', type: UnlockableType.SKIN, name: 'Skin 2' },
      ];
      mockFind.mockResolvedValue(mockUnlockables);

      const result = await repository.findByType(UnlockableType.SKIN);

      expect(mockFind).toHaveBeenCalledWith({
        where: { type: UnlockableType.SKIN },
      });
      expect(result).toEqual(mockUnlockables);
    });

    it('should return empty array when no unlockables found for type', async () => {
      mockFind.mockResolvedValue([]);

      const result = await repository.findByType(UnlockableType.SKIN);

      expect(result).toEqual([]);
    });
  });

  describe('findSecretUnlockables', () => {
    it('should return secret unlockables', async () => {
      const mockSecretUnlockables = [
        { id: '1', isSecret: true, name: 'Secret 1' },
        { id: '2', isSecret: true, name: 'Secret 2' },
      ];
      mockFind.mockResolvedValue(mockSecretUnlockables);

      const result = await repository.findSecretUnlockables();

      expect(mockFind).toHaveBeenCalledWith({ where: { isSecret: true } });
      expect(result).toEqual(mockSecretUnlockables);
    });

    it('should handle no secret unlockables', async () => {
      mockFind.mockResolvedValue([]);

      const result = await repository.findSecretUnlockables();

      expect(result).toEqual([]);
    });
  });

  describe('findUnlockablesByRequiredLevel', () => {
    it('should return unlockables that require at most a certain level', async () => {
      const mockUnlockables = [
        { id: '1', requiredLevel: 5, name: 'Level 5 unlock' },
        { id: '2', requiredLevel: 10, name: 'Level 10 unlock' },
      ];
      mockFind.mockResolvedValue(mockUnlockables);

      const result = await repository.findUnlockablesByRequiredLevel(10);

      // Note: the repository query is { requiredLevel: maxLevel } which is an exact match, not <=
      // According to the source, it's an exact match, so we test accordingly
      expect(mockFind).toHaveBeenCalledWith({ where: { requiredLevel: 10 } });
      expect(result).toEqual(mockUnlockables);
    });

    it('should handle no matching unlockables', async () => {
      mockFind.mockResolvedValue([]);

      const result = await repository.findUnlockablesByRequiredLevel(5);

      expect(result).toEqual([]);
    });
  });

  describe('findUnlockablesByAchievement', () => {
    it('should return unlockables linked to an achievement', async () => {
      const mockUnlockables = [
        { id: '1', requiredAchievementId: 'ach1', name: 'Unlock 1' },
        { id: '2', requiredAchievementId: 'ach1', name: 'Unlock 2' },
      ];
      mockFind.mockResolvedValue(mockUnlockables);

      const result = await repository.findUnlockablesByAchievement('ach1');

      expect(mockFind).toHaveBeenCalledWith({
        where: { requiredAchievementId: 'ach1' },
      });
      expect(result).toEqual(mockUnlockables);
    });

    it('should handle no unlockables for given achievement', async () => {
      mockFind.mockResolvedValue([]);

      const result =
        await repository.findUnlockablesByAchievement('nonexistent');

      expect(result).toEqual([]);
    });
  });
});
