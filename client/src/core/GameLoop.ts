import 'phaser';

/**
 * Configuration for the game loop.
 */
export interface GameLoopConfig {
  /** Target frames per second (default: 60). */
  targetFps?: number;
  /** Whether to use fixed timestep (default: false). */
  fixedTimestep?: boolean;
  /** Fixed delta time in milliseconds (default: 16.666). */
  fixedDelta?: number;
  /** Maximum allowed delta time (in ms) to prevent spiral of death (default: 100). */
  maxDelta?: number;
  /** Whether to enable slow motion mode (default: false). */
  slowMotion?: boolean;
  /** Slow motion factor (default: 0.5). */
  slowMotionFactor?: number;
}

/**
 * Game loop events.
 */
export enum GameLoopEvent {
  PreUpdate = 'preupdate',
  Update = 'update',
  PostUpdate = 'postupdate',
  FixedUpdate = 'fixedupdate',
  Render = 'render',
}

/**
 * Central game loop controller that ties together update cycles,
 * fixed timestep logic, and frame rate management.
 */
export class GameLoop {
  private scene: Phaser.Scene;
  private config: GameLoopConfig;
  private events: Phaser.Events.EventEmitter;
  private accumulatedTime: number;
  private lastTime: number;
  private isRunning: boolean;
  private fixedDelta: number;
  private slowMotionFactor: number;

  /**
   * Creates an instance of GameLoop.
   * @param scene The Phaser scene.
   * @param config Loop configuration.
   */
  constructor(scene: Phaser.Scene, config: GameLoopConfig = {}) {
    this.scene = scene;
    this.config = {
      targetFps: 60,
      fixedTimestep: false,
      fixedDelta: 1000 / 60, // ~16.666 ms
      maxDelta: 100,
      slowMotion: false,
      slowMotionFactor: 0.5,
      ...config,
    };
    this.events = new Phaser.Events.EventEmitter();
    this.accumulatedTime = 0;
    this.lastTime = 0;
    this.isRunning = false;
    this.fixedDelta = this.config.fixedDelta!;
    this.slowMotionFactor = this.config.slowMotionFactor!;

    // Bind to scene's update loop
    this.scene.events.on('update', this.update, this);
    this.scene.events.on('postupdate', this.postUpdate, this);
    this.scene.events.on('preupdate', this.preUpdate, this);
    this.scene.events.on('render', this.render, this);
  }

  /**
   * Start the game loop.
   */
  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = this.scene.time.now;
    this.events.emit('start');
  }

  /**
   * Stop the game loop.
   */
  public stop(): void {
    if (!this.isRunning) return;
    this.isRunning = false;
    this.events.emit('stop');
  }

  /**
   * Pre-update phase (before physics).
   * @param time Current time.
   * @param delta Delta time since last frame.
   */
  private preUpdate(time: number, delta: number): void {
    if (!this.isRunning) return;

    // Apply slow motion if enabled
    if (this.config.slowMotion) {
      delta *= this.slowMotionFactor;
    }

    // Clamp delta to prevent spiral of death
    const clampedDelta = Math.min(delta, this.config.maxDelta!);

    this.events.emit(GameLoopEvent.PreUpdate, clampedDelta, time);
  }

  /**
   * Main update phase.
   * @param time Current time.
   * @param delta Delta time since last frame.
   */
  private update(time: number, delta: number): void {
    if (!this.isRunning) return;

    // Apply slow motion if enabled
    if (this.config.slowMotion) {
      delta *= this.slowMotionFactor;
    }

    const clampedDelta = Math.min(delta, this.config.maxDelta!);

    if (this.config.fixedTimestep) {
      // Fixed timestep logic
      this.accumulatedTime += clampedDelta;

      while (this.accumulatedTime >= this.fixedDelta) {
        this.events.emit(GameLoopEvent.FixedUpdate, this.fixedDelta, time);
        this.accumulatedTime -= this.fixedDelta;
      }
    } else {
      // Variable timestep
      this.events.emit(GameLoopEvent.Update, clampedDelta, time);
    }
  }

  /**
   * Post-update phase (after physics).
   * @param time Current time.
   * @param delta Delta time since last frame.
   */
  private postUpdate(time: number, delta: number): void {
    if (!this.isRunning) return;

    // Apply slow motion if enabled
    if (this.config.slowMotion) {
      delta *= this.slowMotionFactor;
    }

    const clampedDelta = Math.min(delta, this.config.maxDelta!);
    this.events.emit(GameLoopEvent.PostUpdate, clampedDelta, time);
  }

  /**
   * Render phase (after all updates).
   * @param _time Current time.
   * @param delta Delta time since last frame.
   */
  private render(_time: number, delta: number): void {
    if (!this.isRunning) return;

    // Apply slow motion if enabled
    if (this.config.slowMotion) {
      delta *= this.slowMotionFactor;
    }

    const clampedDelta = Math.min(delta, this.config.maxDelta!);
    this.events.emit(GameLoopEvent.Render, clampedDelta);
  }

  /**
   * Subscribe to a game loop event.
   * @param event Event type.
   * @param callback Callback function.
   * @param context Optional context.
   */
  public on(
    event: GameLoopEvent,
    callback: (delta: number, time?: number) => void,
    context?: any,
  ): void {
    this.events.on(event, callback, context);
  }

  /**
   * Unsubscribe from a game loop event.
   * @param event Event type.
   * @param callback Callback function.
   * @param context Optional context.
   */
  public off(
    event: GameLoopEvent,
    callback: (delta: number, time?: number) => void,
    context?: any,
  ): void {
    this.events.off(event, callback, context);
  }

  /**
   * Set the target FPS (does not affect Phaser's internal FPS, but can be used for logic).
   * @param fps Target frames per second.
   */
  public setTargetFps(fps: number): void {
    this.config.targetFps = fps;
    this.fixedDelta = 1000 / fps;
  }

  /**
   * Enable or disable fixed timestep.
   * @param enabled True to enable.
   */
  public setFixedTimestep(enabled: boolean): void {
    this.config.fixedTimestep = enabled;
    if (enabled) {
      this.accumulatedTime = 0;
    }
  }

  /**
   * Set fixed delta time.
   * @param delta Time in milliseconds.
   */
  public setFixedDelta(delta: number): void {
    this.fixedDelta = delta;
  }

  /**
   * Enable or disable slow motion.
   * @param enabled True to enable.
   * @param factor Slow motion factor (default 0.5).
   */
  public setSlowMotion(enabled: boolean, factor = 0.5): void {
    this.config.slowMotion = enabled;
    this.slowMotionFactor = factor;
  }

  /**
   * Get the current accumulated time (for fixed timestep).
   */
  public getAccumulatedTime(): number {
    return this.accumulatedTime;
  }

  /**
   * Reset accumulated time.
   */
  public resetAccumulatedTime(): void {
    this.accumulatedTime = 0;
  }

  /**
   * Get whether the loop is running.
   */
  public getIsRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Destroy the game loop and clean up event listeners.
   */
  public destroy(): void {
    this.stop();
    this.events.removeAllListeners();
    this.scene.events.off('update', this.update, this);
    this.scene.events.off('postupdate', this.postUpdate, this);
    this.scene.events.off('preupdate', this.preUpdate, this);
    this.scene.events.off('render', this.render, this);
  }
}
