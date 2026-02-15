export interface FrameMetrics {
  fps: number;
  delta: number;
  fpsAverage: number;
  minFps: number;
  maxFps: number;
  droppedFrames: number;
  frameTimeMs: number;
  frameTimeAverage: number;
}

export interface PerformanceSnapshot {
  timestamp: number;
  fps: number;
  activeEntities: number;
  activeParticles: number;
  activeProjectiles: number;
  memoryUsed?: number;
}

export class PerformanceMonitor {
  private static instance: PerformanceMonitor;

  private enabled: boolean = false;
  private frameSamples: number[] = new Array(120).fill(0);
  private frameSampleIndex: number = 0;
  private maxSamples: number = 120;
  private frameCount: number = 0;
  private lastFpsUpdate: number = 0;
  private minFps: number = Infinity;
  private maxFps: number = 0;
  private droppedFrames: number = 0;
  private frameTimes: number[] = [];
  private thresholdFps: number = 30;
  private snapshots: PerformanceSnapshot[] = new Array(100).fill(null);
  private snapshotIndex: number = 0;
  private maxSnapshots: number = 100;
  private frameSamplesFilled: boolean = false;
  private snapshotsFilled: boolean = false;

  private constructor() {}

  public static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  public enable(thresholdFps: number = 30): void {
    this.enabled = true;
    this.thresholdFps = thresholdFps;
  }

  public disable(): void {
    this.enabled = false;
  }

  public startFrame(): void {
    if (!this.enabled) return;
    this.frameTimes.push(performance.now());
  }

  public endFrame(delta: number): FrameMetrics | null {
    if (!this.enabled) return null;

    this.frameCount++;
    const now = performance.now();

    if (this.frameTimes.length > 0) {
      const frameStart = this.frameTimes.pop()!;
      const frameTime = now - frameStart;
      this.frameSamples[this.frameSampleIndex] = frameTime;
      this.frameSampleIndex = (this.frameSampleIndex + 1) % this.maxSamples;
      if (this.frameSampleIndex === 0) {
        this.frameSamplesFilled = true;
      }
    }

    const nowMs = Date.now();
    if (nowMs - this.lastFpsUpdate > 1000) {
      const fps = Math.round(1000 / delta);
      this.minFps = Math.min(this.minFps, fps);
      this.maxFps = Math.max(this.maxFps, fps);

      if (fps < this.thresholdFps) {
        this.droppedFrames++;
      }

      this.lastFpsUpdate = nowMs;
    }

    return this.getCurrentMetrics(delta);
  }

  public getCurrentMetrics(delta: number): FrameMetrics {
    const frameTimeAverage = this.getFrameTimeAverage();
    const fps = delta > 0 ? Math.round(1000 / delta) : 60;
    const fpsAverage =
      frameTimeAverage > 0 ? Math.round(1000 / frameTimeAverage) : 60;

    return {
      fps,
      delta,
      fpsAverage,
      minFps: this.minFps === Infinity ? fps : this.minFps,
      maxFps: this.maxFps,
      droppedFrames: this.droppedFrames,
      frameTimeMs: delta,
      frameTimeAverage,
    };
  }

  public takeSnapshot(
    activeEntities: number,
    activeParticles: number,
    activeProjectiles: number,
  ): PerformanceSnapshot {
    const samples = this.getFrameSamples();
    const snapshot: PerformanceSnapshot = {
      timestamp: Date.now(),
      fps:
        samples.length > 0
          ? Math.round(1000 / (samples[samples.length - 1] || 16))
          : 60,
      activeEntities,
      activeParticles,
      activeProjectiles,
    };

    if (
      typeof (window as any).performance !== 'undefined' &&
      (window as any).performance.memory
    ) {
      snapshot.memoryUsed =
        (window as any).performance.memory.usedJSHeapSize / 1024 / 1024;
    }

    this.snapshots[this.snapshotIndex] = snapshot;
    this.snapshotIndex = (this.snapshotIndex + 1) % this.maxSnapshots;
    if (this.snapshotIndex === 0) {
      this.snapshotsFilled = true;
    }

    return snapshot;
  }

  public getPerformanceReport(): string {
    const metrics = this.getCurrentMetrics(16);
    const stats = this.getStatistics();

    let report = '=== Performance Report ===\n';
    report += `Current FPS: ${metrics.fps}\n`;
    report += `Average FPS: ${metrics.fpsAverage}\n`;
    report += `Min FPS: ${metrics.minFps}\n`;
    report += `Max FPS: ${metrics.maxFps}\n`;
    report += `Dropped Frames: ${metrics.droppedFrames}\n`;
    report += `Average Frame Time: ${metrics.frameTimeAverage.toFixed(2)}ms\n`;
    report += `Frame Time (p50): ${stats.p50.toFixed(2)}ms\n`;
    report += `Frame Time (p95): ${stats.p95.toFixed(2)}ms\n`;
    report += `Frame Time (p99): ${stats.p99.toFixed(2)}ms\n`;

    const snapshots = this.getSnapshotsArray();
    if (snapshots.length > 0) {
      const latest = snapshots[snapshots.length - 1];
      report += '\n=== Latest Snapshot ===\n';
      report += `Active Entities: ${latest.activeEntities}\n`;
      report += `Active Particles: ${latest.activeParticles}\n`;
      report += `Active Projectiles: ${latest.activeProjectiles}\n`;
      if (latest.memoryUsed) {
        report += `Memory Used: ${latest.memoryUsed.toFixed(2)} MB\n`;
      }
    }

    return report;
  }

  /**
   * Get the number of valid frame samples in the circular buffer.
   */
  private getFrameSampleCount(): number {
    return this.frameSamplesFilled ? this.maxSamples : this.frameSampleIndex;
  }

  /**
   * Get the current frame samples as an array (excluding empty slots).
   */
  private getFrameSamples(): number[] {
    const count = this.getFrameSampleCount();
    if (count === 0) return [];

    if (!this.frameSamplesFilled) {
      return this.frameSamples.slice(0, count);
    }

    // Return samples in chronological order
    const result: number[] = [];
    for (let i = 0; i < count; i++) {
      const idx = (this.frameSampleIndex + i) % this.maxSamples;
      result.push(this.frameSamples[idx]);
    }
    return result;
  }

  /**
   * Get the current snapshots as an array (excluding empty slots).
   */
  private getSnapshotsArray(): PerformanceSnapshot[] {
    const count = this.snapshotsFilled ? this.maxSnapshots : this.snapshotIndex;
    if (count === 0) return [];

    if (!this.snapshotsFilled) {
      return this.snapshots
        .slice(0, count)
        .filter((s): s is PerformanceSnapshot => s !== null);
    }

    // Return snapshots in chronological order
    const result: PerformanceSnapshot[] = [];
    for (let i = 0; i < count; i++) {
      const idx = (this.snapshotIndex + i) % this.maxSnapshots;
      if (this.snapshots[idx] !== null) {
        result.push(this.snapshots[idx]);
      }
    }
    return result;
  }

  public getFrameTimeAverage(): number {
    const samples = this.getFrameSamples();
    if (samples.length === 0) return 0;
    const sum = samples.reduce((acc, val) => acc + val, 0);
    return sum / samples.length;
  }

  public getStatistics(): {
    average: number;
    min: number;
    max: number;
    p50: number;
    p95: number;
    p99: number;
    } {
    const samples = this.getFrameSamples();
    if (samples.length === 0) {
      return { average: 0, min: 0, max: 0, p50: 0, p95: 0, p99: 0 };
    }

    const sorted = [...samples].sort((a, b) => a - b);
    const sum = sorted.reduce((acc, val) => acc + val, 0);
    const average = sum / sorted.length;
    const min = sorted[0];
    const max = sorted[sorted.length - 1];

    const p50Index = Math.floor(sorted.length * 0.5);
    const p95Index = Math.floor(sorted.length * 0.95);
    const p99Index = Math.floor(sorted.length * 0.99);

    return {
      average,
      min,
      max,
      p50: sorted[p50Index],
      p95: sorted[p95Index],
      p99: sorted[p99Index],
    };
  }

  public getSnapshots(): PerformanceSnapshot[] {
    return this.getSnapshotsArray();
  }

  public clearSnapshots(): void {
    this.snapshots = new Array(this.maxSnapshots).fill(null);
    this.snapshotIndex = 0;
    this.snapshotsFilled = false;
  }

  public reset(): void {
    this.frameSamples = new Array(this.maxSamples).fill(0);
    this.frameSampleIndex = 0;
    this.frameSamplesFilled = false;
    this.frameTimes = [];
    this.frameCount = 0;
    this.minFps = Infinity;
    this.maxFps = 0;
    this.droppedFrames = 0;
    this.snapshots = new Array(this.maxSnapshots).fill(null);
    this.snapshotIndex = 0;
    this.snapshotsFilled = false;
  }

  public isPerformanceGood(): boolean {
    const metrics = this.getCurrentMetrics(16);
    return metrics.fpsAverage >= this.thresholdFps;
  }
}

export class PerformanceProfiler {
  private static profiles: Map<
    string,
    { totalTime: number; callCount: number; startTimes: number[] }
  > = new Map();
  private static enabled: boolean = false;

  public static enable(): void {
    this.enabled = true;
  }

  public static disable(): void {
    this.enabled = false;
  }

  public static start(profileId: string): void {
    if (!this.enabled) return;

    if (!this.profiles.has(profileId)) {
      this.profiles.set(profileId, {
        totalTime: 0,
        callCount: 0,
        startTimes: [],
      });
    }

    const profile = this.profiles.get(profileId)!;
    profile.startTimes.push(performance.now());
  }

  public static end(profileId: string): number {
    if (!this.enabled) return 0;

    const profile = this.profiles.get(profileId);
    if (!profile || profile.startTimes.length === 0) return 0;

    const startTime = profile.startTimes.pop()!;
    const duration = performance.now() - startTime;

    profile.totalTime += duration;
    profile.callCount++;

    return duration;
  }

  public static getProfileStats(profileId: string): {
    totalTime: number;
    averageTime: number;
    callCount: number;
  } | null {
    if (!this.enabled) return null;

    const profile = this.profiles.get(profileId);
    if (!profile || profile.callCount === 0) return null;

    return {
      totalTime: profile.totalTime,
      averageTime: profile.totalTime / profile.callCount,
      callCount: profile.callCount,
    };
  }

  public static getAllProfiles(): Map<
    string,
    { totalTime: number; averageTime: number; callCount: number }
    > {
    if (!this.enabled) return new Map();

    const result = new Map();
    for (const [id, profile] of this.profiles.entries()) {
      result.set(id, {
        totalTime: profile.totalTime,
        averageTime:
          profile.callCount > 0 ? profile.totalTime / profile.callCount : 0,
        callCount: profile.callCount,
      });
    }
    return result;
  }

  public static resetProfiles(): void {
    this.profiles.clear();
  }

  public static reportTopProfiles(count: number = 10): string {
    if (!this.enabled) return 'Profiling not enabled';

    const all = this.getAllProfiles();
    const sorted = Array.from(all.entries())
      .sort((a, b) => b[1].totalTime - a[1].totalTime)
      .slice(0, count);

    if (sorted.length === 0) {
      return 'No profile data available';
    }

    let report = '=== Top Performance Profiles ===\n';
    report +=
      'Profile'.padEnd(30) +
      'Calls'.padStart(10) +
      'Total(ms)'.padStart(15) +
      'Avg(ms)'.padStart(15) +
      '\n';
    report += '-'.repeat(70) + '\n';

    for (const [id, stats] of sorted) {
      report += `${id.padEnd(30)} ${stats.callCount.toString().padStart(10)} ${stats.totalTime.toFixed(2).padStart(15)} ${stats.averageTime.toFixed(2).padStart(15)}\n`;
    }

    return report;
  }
}

export function profileFunction(name: string) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = function (...args: any[]) {
      PerformanceProfiler.start(name);
      const result = originalMethod.apply(this, args);
      PerformanceProfiler.end(name);
      return result;
    };

    return descriptor;
  };
}

export function startPerformanceMonitoring(thresholdFps?: number): void {
  PerformanceMonitor.getInstance().enable(thresholdFps);
  PerformanceProfiler.enable();
}

export function stopPerformanceMonitoring(): void {
  PerformanceMonitor.getInstance().disable();
  PerformanceProfiler.disable();
}

export function getPerformanceReport(): string {
  return PerformanceMonitor.getInstance().getPerformanceReport();
}

export function getProfilerReport(): string {
  return PerformanceProfiler.reportTopProfiles();
}

export function resetPerformanceData(): void {
  PerformanceMonitor.getInstance().reset();
  PerformanceProfiler.resetProfiles();
}
