import 'phaser';
import { GameObject } from './GameObject';

/**
 * Abstract base class for characters (player, enemies).
 * Extends GameObject with movement, jumping, and damage handling.
 */
export abstract class Character extends GameObject {
  /** Movement speed in pixels per second. */
  public moveSpeed: number;

  /** Jump force (vertical velocity) in pixels per second. */
  public jumpForce: number;

  /** Direction the character is facing: -1 for left, 1 for right. */
  public facing: number;

  /** Whether the character is currently on the ground. */
  public isOnGround: boolean;

  /** Whether the character is currently jumping. */
  public isJumping: boolean;

  /** Whether the character is invulnerable (e.g., after taking damage). */
  public invulnerable: boolean;

  /** Invulnerability duration in milliseconds. */
  public invulnerableDuration: number;

  /** Timer for invulnerability. */
  private invulnerableTimer: number;

  /**
     * Creates an instance of Character.
     * @param scene The scene this character belongs to.
     * @param x The x position.
     * @param y The y position.
     * @param texture The texture key.
     * @param frame The frame index (optional).
     */
  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    texture: string,
    frame?: string | number
  ) {
    super(scene, x, y, texture, frame);
    this.moveSpeed = 200;
    this.jumpForce = 400;
    this.facing = 1; // default facing right
    this.isOnGround = false;
    this.isJumping = false;
    this.invulnerable = false;
    this.invulnerableDuration = 1000;
    this.invulnerableTimer = 0;
  }

  /**
     * Move the character horizontally.
     * @param direction -1 for left, 1 for right, 0 to stop.
     */
  public move(direction: number): void {
    if (direction === 0) {
      this.velocity.x = 0;
      return;
    }
    this.velocity.x = direction * this.moveSpeed;
    this.facing = direction;
    this.updateAnimation();
  }

  /**
     * Make the character jump if on ground.
     * @param force Optional custom jump force (overrides jumpForce).
     */
  public jump(force?: number): void {
    if (this.isOnGround && !this.isJumping) {
      const jumpForce = force ?? this.jumpForce;
      this.velocity.y = -jumpForce;
      this.isJumping = true;
      this.isOnGround = false;
      this.updateAnimation();
    }
  }

  /**
     * Called when the character lands on the ground.
     */
  public land(): void {
    this.isJumping = false;
    this.isOnGround = true;
    this.updateAnimation();
  }

  /**
     * Take damage with optional invulnerability period.
     * @param amount Damage amount.
     * @returns True if still alive.
     */
  public takeDamage(amount: number): boolean {
    if (this.invulnerable) {
      return true;
    }
    const alive = super.takeDamage(amount);
    if (alive) {
      this.becomeInvulnerable();
    }
    return alive;
  }

  /**
     * Make the character invulnerable for a short duration.
     */
  protected becomeInvulnerable(): void {
    this.invulnerable = true;
    this.invulnerableTimer = this.invulnerableDuration;
    // Visual feedback (e.g., flashing) can be added in subclasses
  }

  /**
     * Update the character's state each frame.
     * @param delta Time delta in milliseconds.
     */
  public update(delta: number): void {
    super.update(delta);

    // Update invulnerability timer
    if (this.invulnerable) {
      this.invulnerableTimer -= delta;
      if (this.invulnerableTimer <= 0) {
        this.invulnerable = false;
      }
    }

    // Update ground detection (simplified)
    const body = this.body as Phaser.Physics.Arcade.Body;
    if (body) {
      this.isOnGround = body.onFloor();
    }

    // Update animation based on state
    this.updateAnimation();
  }

  /**
     * Update the character's animation based on current state.
     * Override in subclasses to implement specific animations.
     */
  protected updateAnimation(): void {
    // Base implementation does nothing; subclasses should override.
  }

  /**
     * Attack action. Override in subclasses.
     * @param target Optional target character.
     */
  public attack(_target?: Character): void {
    // Base implementation does nothing
  }

  /**
     * Get the direction as a string.
     */
  public getDirection(): 'left' | 'right' {
    return this.facing === -1 ? 'left' : 'right';
  }

  /**
     * Set the character's facing direction.
     * @param direction -1 for left, 1 for right.
     */
  public setFacing(direction: number): void {
    this.facing = Math.sign(direction) || 1;
    this.updateAnimation();
  }
}