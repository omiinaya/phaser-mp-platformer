import { DataSource, Repository } from 'typeorm';
import { BaseRepository } from '../../../src/persistence/repositories/BaseRepository';
import { logger } from '../../../src/utils/logger';

// Mock the logger
jest.mock('../../../src/utils/logger', () => ({
  logger: {
    error: jest.fn(),
  },
}));

// Create a concrete implementation for testing
class TestEntity {
  id!: string;
  name!: string;
}

class TestRepository extends BaseRepository<TestEntity> {
  constructor(dataSource: DataSource) {
    super(dataSource, TestEntity);
  }

  async testSafeOperation<T>(
    operation: Promise<T>,
    errorMessage: string,
  ): Promise<T> {
    return this.safeOperation(operation, errorMessage) as Promise<T>;
  }
}

describe('BaseRepository', () => {
  let dataSource: jest.Mocked<DataSource>;
  let testRepository: TestRepository;

  beforeEach(() => {
    // Create mock DataSource
    dataSource = {
      manager: {
        createEntityManager: jest.fn(),
      },
    } as unknown as jest.Mocked<DataSource>;

    jest.clearAllMocks();
    testRepository = new TestRepository(dataSource);
  });

  describe('constructor', () => {
    it('should create repository with DataSource and entity target', () => {
      expect(testRepository).toBeDefined();
      expect(testRepository).toBeInstanceOf(Repository);
    });

    it('should inherit from TypeORM Repository', () => {
      expect(testRepository).toBeInstanceOf(Repository);
    });
  });

  describe('safeOperation', () => {
    it('should return result when operation succeeds', async () => {
      const expectedResult = { id: '1', name: 'Test' };
      const operation = Promise.resolve(expectedResult);

      const result = await testRepository.testSafeOperation(
        operation,
        'Error message',
      );

      expect(result).toEqual(expectedResult);
      expect(logger.error).not.toHaveBeenCalled();
    });

    it('should log error and rethrow when operation fails', async () => {
      const error = new Error('Database error');
      const operation = Promise.reject(error);

      await expect(
        testRepository.testSafeOperation(operation, 'Custom error message'),
      ).rejects.toThrow('Database error');

      expect(logger.error).toHaveBeenCalledWith(
        'Custom error message: Error: Database error',
      );
    });

    it('should handle async operations with complex errors', async () => {
      const complexError = new Error('Complex database error');
      (complexError as any).code = '23505'; // Postgres unique constraint violation

      const operation = Promise.reject(complexError);

      await expect(
        testRepository.testSafeOperation(
          operation,
          'Database operation failed',
        ),
      ).rejects.toThrow(complexError);

      expect(logger.error).toHaveBeenCalledWith(
        'Database operation failed: Error: Complex database error',
      );
    });

    it('should handle string errors', async () => {
      const stringError = 'String error';
      const operation = Promise.reject(stringError);

      await expect(
        testRepository.testSafeOperation(operation, 'Operation failed'),
      ).rejects.toBe(stringError);
    });

    it('should handle null error message', async () => {
      const operation = Promise.reject(null);

      await expect(
        testRepository.testSafeOperation(operation, 'Operation failed'),
      ).rejects.toBeNull();

      expect(logger.error).toHaveBeenCalledWith('Operation failed: null');
    });

    it('should handle undefined error message', async () => {
      const operation = Promise.reject(undefined);

      await expect(
        testRepository.testSafeOperation(operation, 'Operation failed'),
      ).rejects.toBeUndefined();

      expect(logger.error).toHaveBeenCalledWith('Operation failed: undefined');
    });

    it('should handle successful operation with primitive values', async () => {
      const testCases = [
        { input: Promise.resolve(42), expected: 42 },
        { input: Promise.resolve('string'), expected: 'string' },
        { input: Promise.resolve(true), expected: true },
        { input: Promise.resolve(null), expected: null },
        { input: Promise.resolve([1, 2, 3]), expected: [1, 2, 3] },
        {
          input: Promise.resolve({ key: 'value' }),
          expected: { key: 'value' },
        },
      ];

      for (const { input, expected } of testCases) {
        const result = await testRepository.testSafeOperation(input, 'Error');
        expect(result).toEqual(expected);
      }
    });

    it('should handle error objects with stack traces', async () => {
      const errorWithStack = new Error('Error with stack');
      errorWithStack.stack = 'Stack trace here';

      const operation = Promise.reject(errorWithStack);

      await expect(
        testRepository.testSafeOperation(operation, 'Failed'),
      ).rejects.toThrow(errorWithStack);

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed: Error: Error with stack'),
      );
    });

    it('should work with repository methods using safeOperation', async () => {
      // Test that safeOperation can wrap actual repository operations
      const mockOperation = jest
        .fn()
        .mockResolvedValue({ id: '1', name: 'Test' });

      const wrapperMethod = async () => {
        return testRepository.testSafeOperation(
          mockOperation(),
          'Repository operation failed',
        );
      };

      const result = await wrapperMethod();

      expect(result).toEqual({ id: '1', name: 'Test' });
      expect(mockOperation).toHaveBeenCalled();
    });

    it('should preserve error type when rethrowing', async () => {
      class CustomError extends Error {
        constructor(message: string) {
          super(message);
          this.name = 'CustomError';
        }
      }

      const customError = new CustomError('Custom error message');
      const operation = Promise.reject(customError);

      await expect(
        testRepository.testSafeOperation(operation, 'Wrapped error'),
      ).rejects.toBeInstanceOf(CustomError);

      expect(logger.error).toHaveBeenCalledWith(
        'Wrapped error: CustomError: Custom error message',
      );
    });
  });

  describe('inheritance behavior', () => {
    it('should allow child classes to access TypeORM repository methods', () => {
      // Verify the repository has TypeORM methods
      expect(typeof testRepository.save).toBe('function');
      expect(typeof testRepository.find).toBe('function');
      expect(typeof testRepository.findOne).toBe('function');
      expect(typeof testRepository.remove).toBe('function');
      expect(typeof testRepository.delete).toBe('function');
      expect(typeof testRepository.update).toBe('function');
      expect(typeof testRepository.createQueryBuilder).toBe('function');
    });

    it('should be instance of TypeORM Repository', () => {
      expect(testRepository).toBeInstanceOf(Repository);
    });

    it('should have access to DataSource via constructor', () => {
      // Repository should have been initialized with the provided DataSource
      expect(testRepository).toBeDefined();
    });
  });
});
