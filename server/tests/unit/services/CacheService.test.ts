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
    cacheService = new CacheService({ defaultTtl: 5000, cleanupInterval: 60000 });
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
      const service = new CacheService({ defaultTtl: 10000, cleanupInterval: 30000 });
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
  });
});
