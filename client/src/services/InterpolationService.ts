import { logger } from '../utils/logger';

/**
 * Snapshot of an entity state at a specific timestamp.
 */
export interface EntitySnapshot {
  timestamp: number;
  entityId: string;
  state: any;
}

/**
 * Configuration for interpolation service.
 */
export interface InterpolationConfig {
  /** Interpolation delay in milliseconds (how far behind the server we render). */
  delay?: number;
  /** Maximum number of snapshots to keep per entity. */
  maxSnapshots?: number;
}

/**
 * Smoothly interpolates between received server snapshots to reduce jitter.
 */
export class InterpolationService {
  private snapshots: Map<string, EntitySnapshot[]> = new Map();
  private config: InterpolationConfig;

  constructor(config: InterpolationConfig = {}) {
    this.config = {
      delay: 100, // 100 ms behind server time
      maxSnapshots: 10,
      ...config,
    };
  }

  /**
   * Add a new snapshot for an entity.
   */
  public addSnapshot(entityId: string, snapshot: EntitySnapshot): void {
    if (!this.snapshots.has(entityId)) {
      this.snapshots.set(entityId, []);
    }
    const list = this.snapshots.get(entityId)!;
    list.push(snapshot);
    // Keep list sorted by timestamp
    list.sort((a, b) => a.timestamp - b.timestamp);
    // Trim excess snapshots
    if (list.length > this.config.maxSnapshots!) {
      list.shift();
    }
  }

  /**
   * Get interpolated state for an entity at a given client time.
   * @param entityId Entity ID.
   * @param clientTime Current client time (e.g., Date.now()).
   * @returns Interpolated state or null if not enough data.
   */
  public getInterpolatedState(entityId: string, clientTime: number): any | null {
    const snapshots = this.snapshots.get(entityId);
    if (!snapshots || snapshots.length < 2) {
      // Not enough data, return latest snapshot if exists
      if (snapshots && snapshots.length > 0) {
        return snapshots[snapshots.length - 1].state;
      }
      return null;
    }

    // Apply interpolation delay
    const renderTime = clientTime - this.config.delay!;

    // Find the two snapshots that bracket the render time
    let before = snapshots[0];
    let after = snapshots[snapshots.length - 1];
    for (let i = 0; i < snapshots.length - 1; i++) {
      const cur = snapshots[i];
      const next = snapshots[i + 1];
      if (cur.timestamp <= renderTime && next.timestamp >= renderTime) {
        before = cur;
        after = next;
        break;
      }
    }

    // If render time is outside snapshot range, use closest
    if (renderTime <= before.timestamp) {
      return before.state;
    }
    if (renderTime >= after.timestamp) {
      return after.state;
    }

    // Linear interpolation factor
    const t = (renderTime - before.timestamp) / (after.timestamp - before.timestamp);
    return this.interpolate(before.state, after.state, t);
  }

  /**
   * Linear interpolation between two states (simplified).
   * Assumes state is a flat object with numeric values.
   */
  private interpolate(stateA: any, stateB: any, t: number): any {
    const result: any = {};
    for (const key in stateA) {
      if (typeof stateA[key] === 'number' && typeof stateB[key] === 'number') {
        result[key] = stateA[key] + (stateB[key] - stateA[key]) * t;
      } else {
        // Non‑numeric values: just use the newer state
        result[key] = t > 0.5 ? stateB[key] : stateA[key];
      }
    }
    return result;
  }

  /**
   * Remove old snapshots older than given timestamp.
   */
  public pruneOlderThan(timestamp: number): void {
    for (const [entityId, list] of this.snapshots.entries()) {
      const filtered = list.filter(snap => snap.timestamp >= timestamp);
      this.snapshots.set(entityId, filtered);
      if (filtered.length === 0) {
        this.snapshots.delete(entityId);
      }
    }
  }

  /**
   * Clear all snapshots for a specific entity.
   */
  public clearEntity(entityId: string): void {
    this.snapshots.delete(entityId);
  }

  /**
   * Clear all snapshots.
   */
  public clear(): void {
    this.snapshots.clear();
  }
}