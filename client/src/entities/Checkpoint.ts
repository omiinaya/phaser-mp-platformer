import Phaser from 'phaser';

/**
 * Data to store about a checkpoint.
 */
export interface CheckpointData {
  /** Unique checkpoint ID. */
  id: string;
  /** Checkpoint number/position in level. */
  checkpointNumber: number;
  /** X position. */
  x: number;
  /** Y position. */
  y: number;
  /** Level number where checkpoint was reached. */
  level: number;
  /** Player health when checkpoint was reached (for restoring). */
  playerHealth: number;
  /** Player score when checkpoint was reached (optional). */
  score?: number;
}

/**
 * Checkpoint class for save points in levels.
 * Auto-saves progress when player reaches checkpoint.
 */
export class Checkpoint {
  /** Scene reference. */
  readonly scene: Phaser.Scene;

  /** Checkpoint sprite/visual. */
  private sprite: Phaser.GameObjects.Sprite;

  /** Checkpoint data. */
  readonly data: CheckpointData;

  /** Whether the checkpoint has been activated. */
  private activated: boolean;

  /** Whether the checkpoint emits particles when activated. */
  private emitParticles: boolean;

  /**
   * Creates an instance of Checkpoint.
   * @param scene The scene this checkpoint belongs to.
   * @param id Unique checkpoint ID.
   * @param x X position.
   * @param y Y position.
   * @param checkpointNumber Checkpoint number in current level.
   * @param playerHealth Player health at this save point.
   * @param texture Optional texture key (defaults to 'platform' or uses rect).
   */
  constructor(
    scene: Phaser.Scene,
    id: string,
    x: number,
    y: number,
    checkpointNumber: number = 1,
    playerHealth: number = 20,
  ) {
    this.scene = scene;
    this.activated = false;
    this.emitParticles = true;

    this.data = {
      id,
      checkpointNumber,
      x,
      y,
      level: 0, // Set from game state
      playerHealth,
    };

    // Create visual indicator
    this.sprite = scene.add.sprite(
      x,
      y,
      'platform',
    ) as Phaser.GameObjects.Sprite;
    this.sprite.setTint(0xff8800); // Orange color for checkpoints
    this.sprite.setAlpha(0.8);

    // Animate floating effect
    this.startFloatingAnimation();
  }

  /**
   * Start the floating animation effect.
   */
  private startFloatingAnimation(): void {
    this.scene.tweens.add({
      targets: this.sprite,
      y: this.data.y - 5,
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  /**
   * Activate this checkpoint (player touched it).
   */
  activate(): void {
    if (this.activated) return;

    this.activated = true;

    // Visual feedback
    this.sprite.setTint(0x00ff00); // Green when activated
    this.sprite.setAlpha(1);

    // Glow effect
    this.createActivationEffect();

    // Emit checkpoint reached event
    this.scene.events.emit('checkpoint:reached', {
      checkpoint: this.data,
    });

    // Create particles if enabled
    if (this.emitParticles) {
      this.createParticles();
    }
  }

  /**
   * Create activation visual effect.
   */
  private createActivationEffect(): void {
    const { x, y } = this.data;

    // Ring expansion effect
    const ring = this.scene.add.graphics();
    ring.lineStyle(3, 0x00ff00, 0.8);
    ring.strokeCircle(x, y, 20);

    this.scene.tweens.add({
      targets: ring,
      scaleX: 3,
      scaleY: 3,
      alpha: 0,
      duration: 500,
      ease: 'Sine.easeOut',
      onComplete: () => {
        ring.destroy();
      },
    });

    // Pulse effect
    this.scene.tweens.add({
      targets: this.sprite,
      scaleX: 1.3,
      scaleY: 1.3,
      duration: 200,
      yoyo: true,
      ease: 'Sine.easeInOut',
    });
  }

  /**
   * Create particle effects.
   */
  private createParticles(): void {
    const { x, y } = this.data;
    const particleCount = 15;

    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2;
      const distance = 30 + Math.random() * 20;

      const particle = this.scene.add.circle(x, y, 3, 0x00ff00);

      this.scene.tweens.add({
        targets: particle,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance,
        alpha: 0,
        scale: 0.5,
        duration: 800,
        ease: 'Sine.easeOut',
        onComplete: () => {
          particle.destroy();
        },
      });
    }
  }

  /**
   * Update checkpoint level number.
   * @param level Level number.
   */
  setLevel(level: number): void {
    this.data.level = level;
  }

  /**
   * Update player health for this checkpoint.
   * @param health Health value.
   */
  setPlayerHealth(health: number): void {
    this.data.playerHealth = health;
  }

  /**
   * Update score for this checkpoint (optional).
   * @param score Score value.
   */
  setScore(score: number): void {
    this.data.score = score;
  }

  /**
   * Enable/disable particle emissions.
   * @param enabled Whether to emit particles.
   */
  setEmitParticles(enabled: boolean): void {
    this.emitParticles = enabled;
  }

  /**
   * Check if checkpoint is activated.
   */
  isActive(): boolean {
    return this.activated;
  }

  /**
   * Reset checkpoint (e.g., on level restart).
   */
  reset(): void {
    this.activated = false;
    this.sprite.setTint(0xff8800);
    this.sprite.setAlpha(0.8);
  }

  /**
   * Get the checkpoint data.
   */
  getData(): CheckpointData {
    return { ...this.data };
  }

  /**
   * Set checkpoint to "cleared" state (for visual feedback when passing).
   * This allows players to see which checkpoints they've reached while continuing.
   */
  setPassed(): void {
    if (!this.activated) return;

    this.sprite.setTint(0x00aaff); // Blue when passed (not reset to)
    this.sprite.setScale(0.9);
    this.sprite.setAlpha(0.6);
  }

  /**
   * Destroy checkpoint and clean up.
   */
  destroy(): void {
    this.sprite.destroy();
  }
}
