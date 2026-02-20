import 'phaser';
import { GameObject } from './GameObject';

/**
 * Platform movement type.
 */
export enum PlatformMovement {
  Static = 'static',
  Horizontal = 'horizontal',
  Vertical = 'vertical',
  Circular = 'circular',
  Patrolling = 'patrolling',
}

/**
 * Configuration for a platform.
 */
export interface PlatformConfig {
  /** Movement type. */
  movement?: PlatformMovement;
  /** Speed in pixels per second (if moving). */
  speed?: number;
  /** Distance to travel (for horizontal/vertical). */
  travelDistance?: number;
  /** Whether the platform is one‑way (can be jumped through from below). */
  oneWay?: boolean;
  /** Tile sprite width (in tiles). */
  tileWidth?: number;
  /** Tile sprite height (in tiles). */
  tileHeight?: number;
  /** Tile size (pixels). */
  tileSize?: number;
}

/**
 * Platform game object.
 * Extends GameObject with tiled sprite support and optional movement.
 */
export class Platform extends GameObject {
  /** Platform configuration. */
  public config: PlatformConfig;

  /** Movement direction (1 or -1). */
  private _moveDirection: number;

  /** Original X position (for oscillating movement). */
  private _originX: number;

  /** Original Y position. */
  private _originY: number;

  /** Timer for circular movement. */
  private _moveTimer: number;

  /**
   * Creates an instance of Platform.
   * @param scene The scene this platform belongs to.
   * @param x The x position.
   * @param y The y position.
   * @param texture The texture key.
   * @param config Platform configuration.
   * @param frame The frame index (optional).
   */
  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    texture: string,
    config: PlatformConfig = {},
    frame?: string | number,
  ) {
    super(scene, x, y, texture, frame);
    this.config = {
      movement: PlatformMovement.Static,
      speed: 100,
      travelDistance: 200,
      oneWay: false,
      tileWidth: 1,
      tileHeight: 1,
      tileSize: 32,
      ...config,
    };
    this._moveDirection = 1;
    this._originX = x;
    this._originY = y;
    this._moveTimer = 0;

    // Enable physics as a static body by default
    this.enablePhysics(true);

    // Adjust size if tile dimensions are specified
    if (this.config.tileWidth! > 1 || this.config.tileHeight! > 1) {
      this.setDisplaySize(
        this.config.tileWidth! * this.config.tileSize!,
        this.config.tileHeight! * this.config.tileSize!,
      );
    }

    // Set up one‑way collision if needed
    if (this.config.oneWay) {
      this.setOneWay();
    }
  }

  /**
   * Update platform movement each frame.
   * @param delta Time delta in milliseconds.
   */
  public update(delta: number): void {
    super.update(delta);

    if (this.config.movement === PlatformMovement.Static) {
      return;
    }

    const speed = this.config.speed!;
    const distance = this.config.travelDistance!;

    switch (this.config.movement) {
    case PlatformMovement.Horizontal:
      this.x += this._moveDirection * speed * (delta / 1000);
      if (Math.abs(this.x - this._originX) >= distance) {
        this._moveDirection *= -1;
      }
      break;
    case PlatformMovement.Vertical:
      this.y += this._moveDirection * speed * (delta / 1000);
      if (Math.abs(this.y - this._originY) >= distance) {
        this._moveDirection *= -1;
      }
      break;
    case PlatformMovement.Circular:
      this._moveTimer += delta / 1000;
      const radius = distance / 2;
      this.x =
          this._originX + Math.cos((this._moveTimer * speed) / radius) * radius;
      this.y =
          this._originY + Math.sin((this._moveTimer * speed) / radius) * radius;
      break;
    case PlatformMovement.Patrolling:
      // Simple back‑and‑forth with pause at ends (simplified)
      this.x += this._moveDirection * speed * (delta / 1000);
      if (Math.abs(this.x - this._originX) >= distance) {
        this._moveDirection *= -1;
      }
      break;
    }

    // Update physics body position
    const body = this.body as Phaser.Physics.Arcade.Body;
    if (body) {
      body.updateCenter();
    }
  }

  /**
   * Configure the platform as a one‑way platform (can be jumped through from below).
   */
  private setOneWay(): void {
    const body = this.body as Phaser.Physics.Arcade.StaticBody;
    if (body) {
      // In Arcade Physics, one‑way platforms are typically implemented via custom collision checks.
      // For simplicity, we'll just set a flag and handle collision elsewhere.
      // This is a placeholder.
    }
  }

  /**
   * Create a tiled platform from a tilemap sprite.
   * @param scene The scene.
   * @param x The x position.
   * @param y The y position.
   * @param texture The texture key.
   * @param tileWidth Number of tiles horizontally.
   * @param tileHeight Number of tiles vertically.
   * @param tileSize Tile size in pixels.
   * @param config Additional platform configuration.
   */
  public static createTiled(
    scene: Phaser.Scene,
    x: number,
    y: number,
    texture: string,
    tileWidth: number,
    tileHeight: number,
    tileSize: number,
    config: PlatformConfig = {},
  ): Platform {
    const platform = new Platform(scene, x, y, texture, {
      ...config,
      tileWidth,
      tileHeight,
      tileSize,
    });
    // If the texture is a tile, we might need to set the display size accordingly
    // Already handled in constructor
    return platform;
  }
}
