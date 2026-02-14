import { logger } from '../utils/logger';
import 'phaser';

/**
 * Configuration for arcade physics.
 */
export interface ArcadePhysicsConfig {
  /** Gravity in x and y direction. */
  gravity?: { x: number; y: number };
  /** Whether to enable debug rendering. */
  debug?: boolean;
  /** Debug color for static bodies. */
  debugShowStaticBodyColor?: number;
  /** Debug color for dynamic bodies. */
  debugShowBodyColor?: number;
  /** Debug color for velocity. */
  debugShowVelocityColor?: number;
}

/**
 * Collision group definition.
 */
export interface CollisionGroup {
  /** Unique name for the group. */
  name: string;
  /** Category bits for collision filtering. */
  category?: number;
  /** Mask bits for collision filtering. */
  mask?: number;
}

/**
 * Simplified interface for enabling and configuring arcade physics,
 * collision groups, and debug rendering.
 */
export class PhysicsManager {
  private scene: Phaser.Scene;
  private physics: Phaser.Physics.Arcade.ArcadePhysics;
  private config: ArcadePhysicsConfig;
  private collisionGroups: Map<string, CollisionGroup>;
  private debugGraphics?: Phaser.GameObjects.Graphics;

  /**
   * Creates an instance of PhysicsManager.
   * @param scene The Phaser scene.
   * @param config Physics configuration.
   */
  constructor(scene: Phaser.Scene, config: ArcadePhysicsConfig = {}) {
    this.scene = scene;
    this.physics = scene.physics;
    this.config = {
      gravity: { x: 0, y: 300 },
      debug: false,
      ...config,
    };
    this.collisionGroups = new Map();

    this.init();
  }

  /**
   * Initialize physics system.
   */
  private init(): void {
    // Enable arcade physics if not already enabled
    if (!this.physics) {
      logger.warn('Arcade physics not available in this scene.');
      return;
    }

    // Set gravity
    this.physics.world.gravity.set(this.config.gravity!.x, this.config.gravity!.y);

    // Debug rendering
    if (this.config.debug) {
      this.enableDebug();
    }
  }

  /**
   * Enable debug rendering for physics bodies.
   */
  public enableDebug(): void {
    if (this.debugGraphics) return;

    this.debugGraphics = this.scene.add.graphics();
    this.physics.world.createDebugGraphic();

    // Override debug colors if provided
    if (this.config.debugShowStaticBodyColor !== undefined) {
      (this.physics.world as any).debugGraphic.defaultStaticColor = this.config.debugShowStaticBodyColor;
    }
    if (this.config.debugShowBodyColor !== undefined) {
      (this.physics.world as any).debugGraphic.defaultBodyColor = this.config.debugShowBodyColor;
    }
    if (this.config.debugShowVelocityColor !== undefined) {
      (this.physics.world as any).debugGraphic.defaultVelocityColor = this.config.debugShowVelocityColor;
    }

    this.physics.world.drawDebug = true;
  }

  /**
   * Disable debug rendering.
   */
  public disableDebug(): void {
    if (!this.debugGraphics) return;

    this.physics.world.drawDebug = false;
    this.debugGraphics.destroy();
    this.debugGraphics = undefined;
  }

  /**
   * Set gravity.
   * @param x Gravity in x direction.
   * @param y Gravity in y direction.
   */
  public setGravity(x: number, y: number): void {
    this.physics.world.gravity.set(x, y);
  }

  /**
   * Enable physics for a game object.
   * @param obj The game object (sprite, image, etc.).
   * @param staticBody Whether the body should be static (default false).
   */
  public enableBody(obj: Phaser.GameObjects.GameObject, staticBody = false): void {
    this.physics.add.existing(obj, staticBody);
  }

  /**
   * Disable physics for a game object.
   * @param obj The game object.
   */
  public disableBody(obj: Phaser.GameObjects.GameObject): void {
    const body = (obj as any).body;
    if (body) {
      body.enable = false;
    }
  }

  /**
   * Set collision between two objects or groups.
   * @param objA First object or group.
   * @param objB Second object or group.
   * @param callback Optional collision callback.
   * @param processCallback Optional process callback.
   */
  public setCollision(
    objA: Phaser.GameObjects.GameObject | Phaser.Physics.Arcade.Group,
    objB: Phaser.GameObjects.GameObject | Phaser.Physics.Arcade.Group,
    callback?: Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
    processCallback?: Phaser.Types.Physics.Arcade.ArcadePhysicsCallback
  ): void {
    this.physics.add.collider(objA, objB, callback, processCallback);
  }

  /**
   * Set overlap between two objects or groups.
   * @param objA First object or group.
   * @param objB Second object or group.
   * @param callback Optional overlap callback.
   * @param processCallback Optional process callback.
   */
  public setOverlap(
    objA: Phaser.GameObjects.GameObject | Phaser.Physics.Arcade.Group,
    objB: Phaser.GameObjects.GameObject | Phaser.Physics.Arcade.Group,
    callback?: Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
    processCallback?: Phaser.Types.Physics.Arcade.ArcadePhysicsCallback
  ): void {
    this.physics.add.overlap(objA, objB, callback, processCallback);
  }

  /**
   * Create a collision group.
   * @param group Definition of the collision group.
   */
  public createCollisionGroup(group: CollisionGroup): void {
    this.collisionGroups.set(group.name, group);
  }

  /**
   * Get a collision group by name.
   * @param name Group name.
   */
  public getCollisionGroup(name: string): CollisionGroup | undefined {
    return this.collisionGroups.get(name);
  }

  /**
   * Set collision category and mask for a body.
   * @param body The physics body.
   * @param category Category bits.
   * @param mask Mask bits.
   */
  public setCollisionFilter(
    body: Phaser.Physics.Arcade.Body,
    category: number,
    mask: number
  ): void {
    body.collisionCategory = category;
    body.collisionMask = mask;
  }

  /**
   * Create a static group of physics bodies.
   * @param config Configuration for the static group.
   * @returns The created static group.
   */
  public createStaticGroup(
    config?: Phaser.Types.Physics.Arcade.PhysicsGroupConfig
  ): Phaser.Physics.Arcade.StaticGroup {
    return this.physics.add.staticGroup(config);
  }

  /**
   * Create a dynamic group of physics bodies.
   * @param config Configuration for the group.
   * @returns The created group.
   */
  public createGroup(
    config?: Phaser.Types.Physics.Arcade.PhysicsGroupConfig
  ): Phaser.Physics.Arcade.Group {
    return this.physics.add.group(config);
  }

  /**
   * Pause the physics simulation.
   */
  public pause(): void {
    this.physics.world.pause();
  }

  /**
   * Resume the physics simulation.
   */
  public resume(): void {
    this.physics.world.resume();
  }

  /**
   * Check if the physics world is paused.
   */
  public isPaused(): boolean {
    return this.physics.world.isPaused;
  }

  /**
   * Set the bounds of the physics world.
   * @param x World bounds x.
   * @param y World bounds y.
   * @param width World bounds width.
   * @param height World bounds height.
   * @param checkCollision Whether to check collision against bounds.
   */
  public setBounds(x: number, y: number, width: number, height: number, checkCollision = true): void {
    this.physics.world.setBounds(x, y, width, height, checkCollision);
  }

  /**
   * Set the bounds collision for a body.
   * @param body The physics body.
   * @param left Whether to collide with left bound.
   * @param right Whether to collide with right bound.
   * @param up Whether to collide with top bound.
   * @param down Whether to collide with bottom bound.
   */
  public setBodyCollisionWithBounds(
    body: Phaser.Physics.Arcade.Body,
    left = true,
    right = true,
    up = true,
    down = true
  ): void {
    // Use type assertion to bypass TypeScript signature mismatch
    (body as any).setCollideWorldBounds(true, left, right, up, down);
  }
}