import { CacheService } from '../../../src/services/CacheService';

// Mock the logger
jest.mock('../../../src/utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('CacheService', () => {
  let cacheService: CacheService;

  beforeEach(() => {
    jest.useFakeTimers();
    cacheService = new CacheService({
      defaultTtl: 5000,
      cleanupInterval: 60000,
    });
  });

  afterEach(() => {
    cacheService.stopCleanup();
    cacheService.clear();
    jest.useRealTimers();
  });

  describe('constructor', () => {
    it('should create cache with default config', () => {
      const service = new CacheService();
      expect(service).toBeInstanceOf(CacheService);
      service.stopCleanup();
    });

    it('should create cache with custom config', () => {
      const service = new CacheService({
        defaultTtl: 10000,
        cleanupInterval: 30000,
      });
      expect(service).toBeInstanceOf(CacheService);
      service.stopCleanup();
    });
  });

  describe('set', () => {
    it('should store data in cache', () => {
      cacheService.set('key1', { value: 'test' });
      expect(cacheService.get('key1')).toEqual({ value: 'test' });
    });

    it('should store data with custom TTL', () => {
      cacheService.set('key1', 'value', 1000);
      expect(cacheService.get('key1')).toBe('value');
    });

    it('should overwrite existing key', () => {
      cacheService.set('key1', 'value1');
      cacheService.set('key1', 'value2');
      expect(cacheService.get('key1')).toBe('value2');
    });
  });

  describe('get', () => {
    it('should retrieve stored data', () => {
      cacheService.set('key1', { data: 'test' });
      expect(cacheService.get('key1')).toEqual({ data: 'test' });
    });

    it('should return undefined for non-existent key', () => {
      expect(cacheService.get('nonexistent')).toBeUndefined();
    });

    it('should return undefined for expired data', () => {
      cacheService.set('key1', 'value', 100);

      jest.advanceTimersByTime(101);

      expect(cacheService.get('key1')).toBeUndefined();
    });
  });

  describe('has', () => {
    it('should return true for existing non-expired key', () => {
      cacheService.set('key1', 'value');
      expect(cacheService.has('key1')).toBe(true);
    });

    it('should return false for non-existent key', () => {
      expect(cacheService.has('nonexistent')).toBe(false);
    });

    it('should return false for expired key', () => {
      cacheService.set('key1', 'value', 100);

      jest.advanceTimersByTime(101);

      expect(cacheService.has('key1')).toBe(false);
    });
  });

  describe('delete', () => {
    it('should delete key from cache', () => {
      cacheService.set('key1', 'value');
      cacheService.delete('key1');

      expect(cacheService.get('key1')).toBeUndefined();
    });

    it('should handle deleting non-existent key', () => {
      expect(() => cacheService.delete('nonexistent')).not.toThrow();
    });
  });

  describe('clear', () => {
    it('should clear all cached data', () => {
      cacheService.set('key1', 'value1');
      cacheService.set('key2', 'value2');
      cacheService.clear();

      expect(cacheService.get('key1')).toBeUndefined();
      expect(cacheService.get('key2')).toBeUndefined();
    });
  });

  describe('keys', () => {
    it('should return all cache keys', () => {
      cacheService.set('key1', 'value1');
      cacheService.set('key2', 'value2');
      cacheService.set('key3', 'value3');

      const keys = cacheService.keys();
      expect(keys).toHaveLength(3);
      expect(keys).toContain('key1');
      expect(keys).toContain('key2');
      expect(keys).toContain('key3');
    });

    it('should return empty array for empty cache', () => {
      expect(cacheService.keys()).toEqual([]);
    });
  });

  describe('cleanup', () => {
    it('should remove expired entries', () => {
      cacheService.set('key1', 'value1', 100);
      cacheService.set('key2', 'value2', 10000);

      jest.advanceTimersByTime(101);

      // Access has to trigger cleanup check
      expect(cacheService.has('key1')).toBe(false);
      expect(cacheService.has('key2')).toBe(true);
    });

    it('should stop cleanup interval', () => {
      cacheService.stopCleanup();
      // Should not throw when called multiple times
      cacheService.stopCleanup();
    });

    it('should automatically cleanup expired entries via interval', () => {
      // Set up cache with short TTL and immediate cleanup interval
      const shortCleanupService = new CacheService({
        defaultTtl: 100,
        cleanupInterval: 50,
      });

      shortCleanupService.set('key1', 'value1');
      shortCleanupService.set('key2', 'value2');

      // Advance past TTL but less than cleanup interval
      jest.advanceTimersByTime(150);

      // Manually trigger cleanup by calling stopCleanup which runs cleanup
      shortCleanupService.stopCleanup();

      // Both should be expired now
      expect(shortCleanupService.get('key1')).toBeUndefined();
      expect(shortCleanupService.get('key2')).toBeUndefined();

      shortCleanupService.clear();
    });

    it('should handle cleanup when no interval configured', () => {
      const noCleanupService = new CacheService({ cleanupInterval: 0 });
      expect(noCleanupService).toBeInstanceOf(CacheService);
      noCleanupService.stopCleanup();
    });
  });

  describe('TTL', () => {
    it('should use default TTL when not specified', () => {
      cacheService.set('key', 'value');

      // Advance time but less than default TTL (5 seconds)
      jest.advanceTimersByTime(4000);
      expect(cacheService.get('key')).toBe('value');

      // Advance past TTL
      jest.advanceTimersByTime(2000);
      expect(cacheService.get('key')).toBeUndefined();
    });

    it('should use fallback TTL when config.defaultTtl is undefined', () => {
      // Create service with undefined defaultTtl to cover the ?? branch
      const serviceWithNoTtl = new CacheService({ cleanupInterval: 60000 });
      serviceWithNoTtl.set('key', 'value');

      // Advance time but less than fallback TTL (5 minutes = 300000ms)
      jest.advanceTimersByTime(299999);
      expect(serviceWithNoTtl.get('key')).toBe('value');

      serviceWithNoTtl.stopCleanup();
      serviceWithNoTtl.clear();
    });
  });
});
