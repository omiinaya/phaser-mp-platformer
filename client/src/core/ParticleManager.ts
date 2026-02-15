import { Scene } from 'phaser';

export interface ParticleConfig {
  x: number;
  y: number;
  count?: number;
  speed?: number;
  lifespan?: number;
  scale?: { start: number; end: number };
  alpha?: { start: number; end: number };
  tint?: number;
  gravity?: number;
  blendMode?: Phaser.BlendModes;
  angle?: { min: number; max: number };
}

export interface ParticleEffect {
  name: string;
  config: ParticleConfig;
  autoDestroy: boolean;
}

/**
 * Manages particle effects for visual feedback.
 * Provides easy-to-use methods for common effects.
 */
export class ParticleManager {
  private scene: Scene;
  private emitters: Map<string, Phaser.GameObjects.Particles.ParticleEmitter> =
    new Map();
  private particleTextures: Map<string, string> = new Map();

  constructor(scene: Scene) {
    this.scene = scene;
    this.createParticleTextures();
  }

  /**
   * Create simple particle textures programmatically.
   */
  private createParticleTextures(): void {
    // Circle particle
    const circleGraphics = this.scene.add.graphics();
    circleGraphics.fillStyle(0xffffff);
    circleGraphics.fillCircle(4, 4, 4);
    circleGraphics.generateTexture('particle_circle', 8, 8);
    circleGraphics.destroy();

    // Square particle
    const squareGraphics = this.scene.add.graphics();
    squareGraphics.fillStyle(0xffffff);
    squareGraphics.fillRect(0, 0, 8, 8);
    squareGraphics.generateTexture('particle_square', 8, 8);
    squareGraphics.destroy();

    // Star particle
    const starGraphics = this.scene.add.graphics();
    starGraphics.fillStyle(0xffffff);
    this.drawStar(starGraphics, 4, 4, 5, 4, 2);
    starGraphics.generateTexture('particle_star', 8, 8);
    starGraphics.destroy();

    // Dust particle (soft circle)
    const dustGraphics = this.scene.add.graphics();
    for (let i = 0; i < 8; i++) {
      const alpha = 1 - i / 8;
      dustGraphics.fillStyle(0xffffff, alpha);
      dustGraphics.fillCircle(8, 8, 8 - i);
    }
    dustGraphics.generateTexture('particle_dust', 16, 16);
    dustGraphics.destroy();
  }

  /**
   * Draw a star shape.
   */
  private drawStar(
    graphics: Phaser.GameObjects.Graphics,
    cx: number,
    cy: number,
    spikes: number,
    outerRadius: number,
    innerRadius: number,
  ): void {
    let rot = (Math.PI / 2) * 3;
    let x = cx;
    let y = cy;
    const step = Math.PI / spikes;

    graphics.beginPath();
    graphics.moveTo(cx, cy - outerRadius);
    for (let i = 0; i < spikes; i++) {
      x = cx + Math.cos(rot) * outerRadius;
      y = cy + Math.sin(rot) * outerRadius;
      graphics.lineTo(x, y);
      rot += step;

      x = cx + Math.cos(rot) * innerRadius;
      y = cy + Math.sin(rot) * innerRadius;
      graphics.lineTo(x, y);
      rot += step;
    }
    graphics.lineTo(cx, cy - outerRadius);
    graphics.closePath();
    graphics.fillPath();
  }

  /**
   * Create a particle emitter.
   */
  public createEmitter(
    name: string,
    texture: string,
    config: Partial<Phaser.Types.GameObjects.Particles.ParticleEmitterConfig>,
  ): Phaser.GameObjects.Particles.ParticleEmitter {
    const particles = this.scene.add.particles(0, 0, texture, config);
    this.emitters.set(name, particles);
    return particles;
  }

  /**
   * Create jump dust effect (when player lands).
   */
  public createJumpDust(x: number, y: number): void {
    const particles = this.scene.add.particles(x, y, 'particle_dust', {
      speed: { min: 20, max: 60 },
      scale: { start: 0.5, end: 0 },
      alpha: { start: 0.6, end: 0 },
      lifespan: 400,
      gravityY: 50,
      angle: { min: 180, max: 360 },
      tint: 0xdcdcdc,
      quantity: 8,
      emitting: false,
    });

    particles.explode(8, x, y);

    // Auto-destroy after animation
    this.scene.time.delayedCall(500, () => {
      particles.destroy();
    });
  }

  /**
   * Create coin collection sparkles.
   */
  public createCoinSparkles(x: number, y: number): void {
    const particles = this.scene.add.particles(x, y, 'particle_star', {
      speed: { min: 50, max: 100 },
      scale: { start: 0.8, end: 0 },
      alpha: { start: 1, end: 0 },
      lifespan: 600,
      gravityY: -100,
      angle: { min: 0, max: 360 },
      tint: 0xffd700, // Gold color
      quantity: 12,
      emitting: false,
    });

    particles.explode(12, x, y);

    this.scene.time.delayedCall(700, () => {
      particles.destroy();
    });
  }

  /**
   * Create enemy death explosion.
   */
  public createEnemyExplosion(
    x: number,
    y: number,
    color: number = 0xff0000,
  ): void {
    // Main explosion
    const particles = this.scene.add.particles(x, y, 'particle_circle', {
      speed: { min: 80, max: 150 },
      scale: { start: 1, end: 0 },
      alpha: { start: 1, end: 0 },
      lifespan: 800,
      gravityY: 100,
      angle: { min: 0, max: 360 },
      tint: color,
      quantity: 20,
      emitting: false,
    });

    particles.explode(20, x, y);

    // Secondary burst (smaller, faster particles)
    const burstParticles = this.scene.add.particles(x, y, 'particle_square', {
      speed: { min: 100, max: 200 },
      scale: { start: 0.5, end: 0 },
      alpha: { start: 1, end: 0 },
      lifespan: 400,
      angle: { min: 0, max: 360 },
      tint: 0xffffff,
      quantity: 10,
      emitting: false,
    });

    burstParticles.explode(10, x, y);

    this.scene.time.delayedCall(900, () => {
      particles.destroy();
      burstParticles.destroy();
    });
  }

  /**
   * Create health pickup effect (green sparkles).
   */
  public createHealthPickupEffect(x: number, y: number): void {
    const particles = this.scene.add.particles(x, y, 'particle_star', {
      speed: { min: 30, max: 80 },
      scale: { start: 0.6, end: 0 },
      alpha: { start: 1, end: 0 },
      lifespan: 800,
      gravityY: -50,
      angle: { min: 0, max: 360 },
      tint: 0x2ecc71, // Green color
      quantity: 15,
      emitting: false,
    });

    particles.explode(15, x, y);

    // Add floating plus signs (using text)
    for (let i = 0; i < 3; i++) {
      const plusX = x + (Math.random() - 0.5) * 40;
      const plusY = y + (Math.random() - 0.5) * 20;
      const plus = this.scene.add.text(plusX, plusY, '+', {
        fontSize: '24px',
        color: '#2ecc71',
        fontStyle: 'bold',
      });

      this.scene.tweens.add({
        targets: plus,
        y: plusY - 50,
        alpha: 0,
        duration: 800,
        delay: i * 100,
        onComplete: () => plus.destroy(),
      });
    }

    this.scene.time.delayedCall(900, () => {
      particles.destroy();
    });
  }

  /**
   * Create damage taken effect (red flash + particles).
   */
  public createDamageEffect(x: number, y: number, amount: number = 1): void {
    // Red flash particles
    const particles = this.scene.add.particles(x, y, 'particle_circle', {
      speed: { min: 60, max: 120 },
      scale: { start: 0.8, end: 0 },
      alpha: { start: 1, end: 0 },
      lifespan: 500,
      gravityY: 0,
      angle: { min: 0, max: 360 },
      tint: 0xe74c3c, // Red color
      quantity: 10,
      emitting: false,
    });

    particles.explode(10, x, y);

    // Floating damage number
    const damageText = this.scene.add.text(x, y - 20, `-${amount}`, {
      fontSize: '20px',
      color: '#e74c3c',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3,
    });
    damageText.setOrigin(0.5);

    this.scene.tweens.add({
      targets: damageText,
      y: y - 60,
      alpha: 0,
      duration: 1000,
      ease: 'Power2',
      onComplete: () => damageText.destroy(),
    });

    this.scene.time.delayedCall(600, () => {
      particles.destroy();
    });
  }

  /**
   * Create trail effect for fast movement.
   */
  public createMovementTrail(
    x: number,
    y: number,
    direction: number,
    color: number = 0x3498db,
  ): void {
    const particles = this.scene.add.particles(x, y, 'particle_dust', {
      speed: 20,
      scale: { start: 0.4, end: 0 },
      alpha: { start: 0.5, end: 0 },
      lifespan: 300,
      angle: direction + 180,
      tint: color,
      quantity: 2,
      emitting: false,
    });

    particles.explode(2, x, y);

    this.scene.time.delayedCall(350, () => {
      particles.destroy();
    });
  }

  /**
   * Create level complete celebration.
   */
  public createLevelCompleteCelebration(x: number, y: number): void {
    // Multi-colored confetti
    const colors = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff00ff, 0x00ffff];

    colors.forEach((color, index) => {
      const particles = this.scene.add.particles(x, y, 'particle_square', {
        speed: { min: 100, max: 300 },
        scale: { start: 0.8, end: 0 },
        alpha: { start: 1, end: 0 },
        lifespan: 1500,
        gravityY: 200,
        angle: { min: 200, max: 340 },
        tint: color,
        quantity: 8,
        emitting: false,
        rotate: { min: 0, max: 360 },
      });

      this.scene.time.delayedCall(index * 50, () => {
        particles.explode(8, x, y);
      });

      this.scene.time.delayedCall(2000, () => {
        particles.destroy();
      });
    });

    // Victory text effect
    const victoryText = this.scene.add.text(x, y - 100, 'VICTORY!', {
      fontSize: '48px',
      color: '#f1c40f',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 6,
    });
    victoryText.setOrigin(0.5);
    victoryText.setScale(0);

    this.scene.tweens.add({
      targets: victoryText,
      scale: 1,
      duration: 500,
      ease: 'Back.out',
    });

    this.scene.tweens.add({
      targets: victoryText,
      y: y - 150,
      alpha: 0,
      duration: 1000,
      delay: 1000,
      onComplete: () => victoryText.destroy(),
    });
  }

  /**
   * Create a custom particle effect.
   */
  public createCustomEffect(
    x: number,
    y: number,
    texture: string,
    config: Partial<Phaser.Types.GameObjects.Particles.ParticleEmitterConfig>,
  ): Phaser.GameObjects.Particles.ParticleEmitter {
    const particles = this.scene.add.particles(x, y, texture, {
      emitting: false,
      ...config,
    });

    return particles;
  }

  /**
   * Create continuous emitter (e.g., for fire, smoke).
   */
  public createContinuousEmitter(
    name: string,
    x: number,
    y: number,
    texture: string,
    config: Partial<Phaser.Types.GameObjects.Particles.ParticleEmitterConfig>,
  ): Phaser.GameObjects.Particles.ParticleEmitter {
    const particles = this.scene.add.particles(x, y, texture, {
      emitting: true,
      ...config,
    });

    this.emitters.set(name, particles);
    return particles;
  }

  /**
   * Stop and remove a continuous emitter.
   */
  public stopEmitter(name: string): void {
    const emitter = this.emitters.get(name);
    if (emitter) {
      emitter.stop();
      this.scene.time.delayedCall(1000, () => {
        emitter.destroy();
        this.emitters.delete(name);
      });
    }
  }

  /**
   * Preload particle textures (call in scene preload).
   */
  public static preloadTextures(scene: Scene): void {
    // Placeholder - textures are created programmatically in createParticleTextures
  }

  /**
   * Clean up all emitters.
   */
  public destroy(): void {
    this.emitters.forEach((emitter) => {
      emitter.destroy();
    });
    this.emitters.clear();
    this.particleTextures.clear();
  }
}

/**
 * Global particle manager instance for cross-scene access.
 */
let globalParticleManager: ParticleManager | null = null;

export function setGlobalParticleManager(manager: ParticleManager): void {
  globalParticleManager = manager;
}

export function getGlobalParticleManager(): ParticleManager | null {
  return globalParticleManager;
}
