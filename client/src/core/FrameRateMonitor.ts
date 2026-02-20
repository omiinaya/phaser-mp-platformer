import 'phaser';
import { logger } from '../utils/logger';

/**
 * Quality level for adaptive settings.
 */
export enum QualityLevel {
  Low = 'low',
  Medium = 'medium',
  High = 'high',
}

/**
 * Configuration for the frame rate monitor.
 */
export interface FrameRateMonitorConfig {
  /** Target FPS (default: 60). */
  targetFps?: number;
  /** Sampling window size in seconds (default: 1). */
  sampleWindow?: number;
  /** Thresholds for quality adjustment (low if fps < lowThreshold, etc.). */
  lowThreshold?: number;
  mediumThreshold?: number;
  /** Callback when quality level changes. */
  onQualityChange?: (level: QualityLevel) => void;
  /** Whether to enable adaptive quality (default: true). */
  adaptive?: boolean;
}

/**
 * Monitors frame rate and adjusts quality settings adaptively.
 */
export class FrameRateMonitor {
  private scene: Phaser.Scene;
  private config: FrameRateMonitorConfig;
  private samples: number[] = [];
  private sampleTimes: number[] = [];
  private currentFps: number = 0;
  private qualityLevel: QualityLevel = QualityLevel.High;
  private lastUpdateTime: number = 0;
  private updateInterval: number = 1000; // update every second

  constructor(scene: Phaser.Scene, config: FrameRateMonitorConfig = {}) {
    this.scene = scene;
    this.config = {
      targetFps: 60,
      sampleWindow: 1,
      lowThreshold: 30,
      mediumThreshold: 45,
      adaptive: true,
      ...config,
    };
    this.lastUpdateTime = this.scene.time.now;
    this.scene.events.on('update', this.update, this);
  }

  /**
   * Update FPS sampling.
   */
  private update(): void {
    const now = this.scene.time.now;
    const delta = now - this.lastUpdateTime;
    if (delta < this.updateInterval) return;

    // Calculate FPS based on accumulated samples
    if (this.samples.length > 0) {
      const totalFrames = this.samples.reduce((a, b) => a + b, 0);
      const windowDuration =
        this.sampleTimes[this.sampleTimes.length - 1] - this.sampleTimes[0] ||
        1;
      this.currentFps = totalFrames / (windowDuration / 1000);
    } else {
      this.currentFps = 0;
    }

    // Adaptive quality adjustment
    if (this.config.adaptive) {
      this.adjustQuality();
    }

    // Reset sampling for next window
    this.samples = [];
    this.sampleTimes = [];
    this.lastUpdateTime = now;
  }

  /**
   * Record a frame sample.
   * Call this every frame from the game loop.
   */
  public sample(): void {
    const now = this.scene.time.now;
    this.samples.push(1);
    this.sampleTimes.push(now);

    // Keep only samples within the time window
    const windowStart = now - this.config.sampleWindow! * 1000;
    while (this.sampleTimes.length > 0 && this.sampleTimes[0] < windowStart) {
      this.sampleTimes.shift();
      this.samples.shift();
    }
  }

  /**
   * Adjust quality level based on current FPS.
   */
  private adjustQuality(): void {
    const fps = this.currentFps;
    let newLevel = QualityLevel.High;
    if (fps < this.config.lowThreshold!) {
      newLevel = QualityLevel.Low;
    } else if (fps < this.config.mediumThreshold!) {
      newLevel = QualityLevel.Medium;
    }

    if (newLevel !== this.qualityLevel) {
      this.qualityLevel = newLevel;
      this.config.onQualityChange?.(newLevel);
      this.applyQualitySettings();
    }
  }

  /**
   * Apply quality settings based on current level.
   */
  private applyQualitySettings(): void {
    // In a real implementation, you would adjust rendering settings,
    // such as particle density, shadow quality, resolution scaling, etc.
    // For now, we just emit an event; the game can listen and adjust accordingly.
    logger.info(`Quality level changed to ${this.qualityLevel}`);
  }

  /**
   * Get current FPS.
   */
  public getFps(): number {
    return this.currentFps;
  }

  /**
   * Get current quality level.
   */
  public getQualityLevel(): QualityLevel {
    return this.qualityLevel;
  }

  /**
   * Manually set quality level (disables adaptive if called).
   */
  public setQualityLevel(level: QualityLevel): void {
    this.qualityLevel = level;
    this.config.adaptive = false;
    this.applyQualitySettings();
  }

  /**
   * Enable or disable adaptive quality.
   */
  public setAdaptive(enabled: boolean): void {
    this.config.adaptive = enabled;
  }

  /**
   * Destroy the monitor and clean up.
   */
  public destroy(): void {
    this.scene.events.off('update', this.update, this);
  }
}
