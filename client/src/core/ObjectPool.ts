import { logger } from '../utils/logger';
import 'phaser';

/**
 * Configuration for an object pool.
 */
export interface ObjectPoolConfig<T> {
  /** Initial size of the pool. */
  initialSize?: number;
  /** Maximum size of the pool (optional). */
  maxSize?: number;
  /** Factory function to create new instances. */
  create: () => T;
  /** Function to reset an instance before reusing. */
  reset?: (obj: T) => void;
  /** Function to destroy an instance when pool is cleared. */
  destroy?: (obj: T) => void;
}

/**
 * Generic object pool for reusing objects to reduce garbage collection.
 */
export class ObjectPool<T> {
  private pool: T[];
  private config: ObjectPoolConfig<T>;
  private activeCount: number;

  constructor(config: ObjectPoolConfig<T>) {
    this.config = {
      initialSize: 10,
      maxSize: 100,
      ...config,
    };
    this.pool = [];
    this.activeCount = 0;

    // Pre-populate pool
    for (let i = 0; i < this.config.initialSize!; i++) {
      this.pool.push(this.config.create());
    }
  }

  /**
   * Acquire an object from the pool.
   * If pool is empty, create a new instance (subject to maxSize).
   */
  public acquire(): T {
    let obj: T;
    if (this.pool.length > 0) {
      obj = this.pool.pop()!;
    } else {
      // Check max size
      if (this.activeCount >= this.config.maxSize!) {
        logger.warn('ObjectPool max size reached, creating extra instance');
      }
      obj = this.config.create();
    }
    this.activeCount++;
    return obj;
  }

  /**
   * Release an object back to the pool.
   * @param obj The object to release.
   */
  public release(obj: T): void {
    if (this.pool.length >= this.config.maxSize!) {
      // Pool is full, destroy the object
      if (this.config.destroy) {
        this.config.destroy(obj);
      }
      this.activeCount--;
      return;
    }
    // Reset object state
    if (this.config.reset) {
      this.config.reset(obj);
    }
    this.pool.push(obj);
    this.activeCount--;
  }

  /**
   * Release all active objects (call release on each).
   * @param activeList Array of active objects (optional).
   */
  public releaseAll(activeList?: T[]): void {
    if (activeList) {
      activeList.forEach((obj) => this.release(obj));
    }
    // If no list provided, we cannot know which objects are active.
    // In that case, just clear the active count (assume all objects are returned)
    this.activeCount = 0;
  }

  /**
   * Get number of objects currently in the pool (idle).
   */
  public getIdleCount(): number {
    return this.pool.length;
  }

  /**
   * Get number of objects currently active (checked out).
   */
  public getActiveCount(): number {
    return this.activeCount;
  }

  /**
   * Clear the pool, destroying all idle objects.
   */
  public clear(): void {
    if (this.config.destroy) {
      this.pool.forEach((obj) => this.config.destroy!(obj));
    }
    this.pool = [];
    this.activeCount = 0;
  }

  /**
   * Preallocate additional objects.
   * @param count Number of objects to add.
   */
  public preallocate(count: number): void {
    for (let i = 0; i < count; i++) {
      if (this.pool.length >= this.config.maxSize!) break;
      this.pool.push(this.config.create());
    }
  }
}
