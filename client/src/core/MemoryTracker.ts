import { logger } from '../utils/logger';
export interface TrackedReference {
  id: string;
  type: string;
  ref: any;
  createdAt: number;
  destroyedAt?: number;
  parent?: string;
}

export class MemoryTracker {
  private static instance: MemoryTracker;
  private trackedObjects: Map<string, TrackedReference> = new Map();
  private enabled: boolean = false;
  private maxTracked: number = 1000;
  private warnings: string[] = [];

  private constructor() {}

  public static getInstance(): MemoryTracker {
    if (!MemoryTracker.instance) {
      MemoryTracker.instance = new MemoryTracker();
    }
    return MemoryTracker.instance;
  }

  public enable(): void {
    this.enabled = true;
  }

  public disable(): void {
    this.enabled = false;
  }

  public track(
    obj: any,
    type: string,
    parent?: string,
    customId?: string,
  ): string {
    if (!this.enabled) return '';

    const id =
      customId ||
      `${type}_${obj.constructor.name}_${Date.now()}_${Math.random()}`;

    if (this.trackedObjects.size >= this.maxTracked) {
      this.cleanupOldReferences();
    }

    this.trackedObjects.set(id, {
      id,
      type,
      ref: obj,
      createdAt: Date.now(),
      parent,
    });

    return id;
  }

  public untrack(id: string): void {
    if (!this.enabled) return;

    const tracked = this.trackedObjects.get(id);
    if (tracked) {
      tracked.destroyedAt = Date.now();
      this.trackedObjects.delete(id);
    }
  }

  public checkLeaks(thresholdMs: number = 5000): string[] {
    const leaks: string[] = [];
    const now = Date.now();

    for (const [id, tracked] of this.trackedObjects.entries()) {
      const age = now - tracked.createdAt;
      const isStuck = !tracked.destroyedAt && age > thresholdMs;
      const lingering =
        tracked.destroyedAt && now - (tracked.destroyedAt || 0) < 100;

      if (isStuck || lingering) {
        leaks.push(
          `Potential leak: ${tracked.type} (id: ${id}) age: ${age}ms, parent: ${tracked.parent || 'none'}`,
        );
      }
    }

    return leaks;
  }

  public getStatistics(): {
    totalTracked: number;
    byType: Map<string, number>;
    withParent: number;
    withoutParent: number;
    } {
    const stats = {
      totalTracked: this.trackedObjects.size,
      byType: new Map<string, number>(),
      withParent: 0,
      withoutParent: 0,
    };

    for (const tracked of this.trackedObjects.values()) {
      const count = stats.byType.get(tracked.type) || 0;
      stats.byType.set(tracked.type, count + 1);

      if (tracked.parent) {
        stats.withParent++;
      } else {
        stats.withoutParent++;
      }
    }

    return stats;
  }

  public addWarning(warning: string): void {
    this.warnings.push(warning);
    if (this.warnings.length > 100) {
      this.warnings = this.warnings.slice(-100);
    }
  }

  public getWarnings(): string[] {
    return [...this.warnings];
  }

  public clearWarnings(): void {
    this.warnings = [];
  }

  public clearAll(): void {
    this.trackedObjects.clear();
    this.warnings = [];
  }

  public startWatching<T extends object>(
    obj: T,
    propName: string,
    callback: (oldValue: any, newValue: any) => void,
  ): void {
    if (!this.enabled) return;

    let value = (obj as any)[propName];
    Object.defineProperty(obj, propName, {
      get() {
        return value;
      },
      set(newValue) {
        callback(value, newValue);
        value = newValue;
      },
    });
  }

  private cleanupOldReferences(): void {
    const entries = Array.from(this.trackedObjects.entries());
    entries.sort((a, b) => a[1].createdAt - b[1].createdAt);

    const toRemove = entries.slice(0, Math.floor(this.maxTracked * 0.1));
    for (const [id] of toRemove) {
      this.trackedObjects.delete(id);
    }
  }
}

export function trackObject(obj: any, type: string, parent?: string): string {
  return MemoryTracker.getInstance().track(obj, type, parent);
}

export function untrackObject(id: string): void {
  MemoryTracker.getInstance().untrack(id);
}

export function checkMemoryLeaks(thresholdMs?: number): string[] {
  return MemoryTracker.getInstance().checkLeaks(thresholdMs);
}

export function enableMemoryTracking(): void {
  MemoryTracker.getInstance().enable();
}

export function disableMemoryTracking(): void {
  MemoryTracker.getInstance().disable();
}

export class CleanupHelper {
  private static cleanupStack: Map<string, (() => void)[]> = new Map();

  public static registerCleanup(id: string, cleanupFn: () => void): void {
    if (!this.cleanupStack.has(id)) {
      this.cleanupStack.set(id, []);
    }
    this.cleanupStack.get(id)!.push(cleanupFn);
  }

  public static performCleanup(id: string): void {
    const cleanups = this.cleanupStack.get(id);
    if (cleanups) {
      for (const cleanup of cleanups) {
        try {
          cleanup();
        } catch (error) {
          logger.error(`Error in cleanup for ${id}:`, error);
        }
      }
      this.cleanupStack.delete(id);
    }
  }

  public static clearAllCleanups(): void {
    this.cleanupStack.clear();
  }
}

export class ObjectLifecycleTracker {
  public static trackCreation(obj: any, type: string, parent?: string): string {
    return trackObject(obj, type, parent);
  }

  public static trackDestruction(id: string): void {
    untrackObject(id);
  }

  public static reportLeaks(): void {
    const leaks = checkMemoryLeaks(10000);
    if (leaks.length > 0) {
      logger.warn('Memory leak detection report:');
      leaks.forEach((leak) => logger.warn(`  - ${leak}`));
    } else {
      logger.info('No obvious memory leaks detected.');
    }
  }

  public static getTrackedObjectsCount(): number {
    return MemoryTracker.getInstance().getStatistics().totalTracked;
  }
}

export function withAutoCleanup<T extends object>(
  obj: T,
  cleanupFn: () => void,
  id?: string,
): T {
  const trackerId = id || `${obj.constructor.name}_${Date.now()}`;
  ObjectLifecycleTracker.trackCreation(obj, obj.constructor.name);

  const originalDestroy = (obj as any).destroy?.bind(obj);

  (obj as any).destroy = function (...args: any[]) {
    ObjectLifecycleTracker.trackDestruction(trackerId);
    CleanupHelper.performCleanup(trackerId);
    cleanupFn();
    if (originalDestroy) {
      originalDestroy(...args);
    }
  };

  return obj;
}
