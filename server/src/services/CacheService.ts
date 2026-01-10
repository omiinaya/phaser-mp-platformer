import { logger } from '../utils/logger';

/**
 * Cache entry with expiration timestamp.
 */
interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

/**
 * Configuration for cache service.
 */
export interface CacheConfig {
  /** Default TTL in milliseconds. */
  defaultTtl?: number;
  /** Whether to enable periodic cleanup of expired entries. */
  cleanupInterval?: number;
}

/**
 * Simple in‑memory cache with TTL support.
 */
export class CacheService {
  private cache = new Map<string, CacheEntry<any>>();
  private config: CacheConfig;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(config: CacheConfig = {}) {
    this.config = {
      defaultTtl: 5 * 60 * 1000, // 5 minutes
      cleanupInterval: 60 * 1000, // 1 minute
      ...config,
    };
    this.startCleanup();
  }

  /**
   * Store a value in the cache.
   * @param key Cache key.
   * @param data Data to store.
   * @param ttl Time to live in milliseconds (optional, uses default).
   */
  public set<T>(key: string, data: T, ttl?: number): void {
    const expiresAt = Date.now() + (ttl ?? this.config.defaultTtl!);
    this.cache.set(key, { data, expiresAt });
    logger.debug(`Cache set: ${key}`);
  }

  /**
   * Retrieve a value from the cache.
   * @param key Cache key.
   * @returns The cached data or undefined if not found/expired.
   */
  public get<T>(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    if (Date.now() > entry.expiresAt) {
      // Expired, remove it
      this.cache.delete(key);
      logger.debug(`Cache expired: ${key}`);
      return undefined;
    }

    return entry.data as T;
  }

  /**
   * Check if a key exists and is not expired.
   */
  public has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }
    return true;
  }

  /**
   * Delete a key from the cache.
   */
  public delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear the entire cache.
   */
  public clear(): void {
    this.cache.clear();
  }

  /**
   * Get all cache keys (for debugging).
   */
  public keys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Start periodic cleanup of expired entries.
   */
  private startCleanup(): void {
    if (this.config.cleanupInterval) {
      this.cleanupInterval = setInterval(() => {
        this.cleanup();
      }, this.config.cleanupInterval);
    }
  }

  /**
   * Remove all expired entries.
   */
  private cleanup(): void {
    const now = Date.now();
    let deleted = 0;
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        deleted++;
      }
    }
    if (deleted > 0) {
      logger.debug(`Cache cleanup removed ${deleted} expired entries`);
    }
  }

  /**
   * Stop the cleanup interval.
   */
  public stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}