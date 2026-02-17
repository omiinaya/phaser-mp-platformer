import { GameObject } from '../entities/GameObject';
import { Player } from '../entities/Player';

export type PowerUpType =
  | 'double_jump'
  | 'shield'
  | 'speed_boost'
  | 'health_boost'
  | 'damage_boost';

export interface PowerUpConfig {
  type: PowerUpType;
  duration: number;
  effectValue?: number;
}

export interface PowerUpEffect {
  type: PowerUpType;
  startTime: number;
  duration: number;
  value?: number;
}

export class PowerUpManager {
  private scene: Phaser.Scene;
  private activeEffects: Map<PowerUpType, PowerUpEffect> = new Map();
  private onEffectAdd?: (type: PowerUpType, effect: PowerUpEffect) => void;
  private onEffectRemove?: (type: PowerUpType) => void;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  public activatePowerUp(
    type: PowerUpType,
    duration: number,
    value?: number,
  ): void {
    const effect: PowerUpEffect = {
      type,
      startTime: Date.now(),
      duration,
      value,
    };

    this.activeEffects.set(type, effect);
    this.onEffectAdd?.(type, effect);

    // Schedule removal
    this.scene.time.delayedCall(duration, () => {
      this.removePowerUp(type);
    });
  }

  public removePowerUp(type: PowerUpType): void {
    if (this.activeEffects.has(type)) {
      this.activeEffects.delete(type);
      this.onEffectRemove?.(type);
    }
  }

  public isActive(type: PowerUpType): boolean {
    const effect = this.activeEffects.get(type);
    if (!effect) return false;

    const elapsed = Date.now() - effect.startTime;
    return elapsed < effect.duration;
  }

  public getEffect(type: PowerUpType): PowerUpEffect | undefined {
    return this.activeEffects.get(type);
  }

  public getActiveEffects(): PowerUpType[] {
    return Array.from(this.activeEffects.keys()).filter((type) =>
      this.isActive(type),
    );
  }

  public onEffectAdded(
    callback: (type: PowerUpType, effect: PowerUpEffect) => void,
  ): void {
    this.onEffectAdd = callback;
  }

  public onEffectRemoved(callback: (type: PowerUpType) => void): void {
    this.onEffectRemove = callback;
  }

  public update(_delta: number): void {
    const now = Date.now();
    const expired: PowerUpType[] = [];

    this.activeEffects.forEach((effect, type) => {
      if (now - effect.startTime >= effect.duration) {
        expired.push(type);
      }
    });

    expired.forEach((type) => this.removePowerUp(type));
  }

  public clear(): void {
    this.activeEffects.forEach((_, type) => this.removePowerUp(type));
  }
}

export class PowerUp extends GameObject {
  protected powerUpType: PowerUpType;
  protected duration: number;
  protected effectValue?: number;
  protected collected: boolean = false;
  private powerUpManager?: PowerUpManager;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    texture: string,
    powerUpManager: PowerUpManager,
    config: PowerUpConfig,
  ) {
    super(scene, x, y, texture);
    this.powerUpType = config.type;
    this.duration = config.duration;
    this.effectValue = config.effectValue;
    this.powerUpManager = powerUpManager;

    scene.add.existing(this);

    this.setupAnimation();
  }

  protected setupAnimation(): void {
    this.scene.tweens.add({
      targets: this,
      y: this.y - 8,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.scene.tweens.add({
      targets: this,
      angle: 360,
      duration: 3000,
      repeat: -1,
      ease: 'Linear',
    });

    switch (this.powerUpType) {
    case 'double_jump':
      this.scene.tweens.add({
        targets: this,
        scaleX: 1.2,
        scaleY: 0.8,
        duration: 400,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
      break;
    case 'shield':
      this.scene.tweens.add({
        targets: this,
        alpha: 0.6,
        duration: 500,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
      break;
    case 'speed_boost':
      this.scene.tweens.add({
        targets: this,
        scaleX: 1.3,
        duration: 300,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
      break;
    }
  }

  public collect(_player: Player): void {
    if (this.collected) return;
    this.collected = true;

    this.powerUpManager?.activatePowerUp(
      this.powerUpType,
      this.duration,
      this.effectValue,
    );

    this.scene.events.emit('powerup:collected', {
      type: this.powerUpType,
      duration: this.duration,
      effectValue: this.effectValue,
    });

    this.createCollectionEffect();
    this.destroy();
  }

  protected createCollectionEffect(): void {
    const particles = this.scene.add.particles(
      this.x,
      this.y,
      this.texture.key,
      {
        speed: { min: 50, max: 150 },
        scale: { start: 1, end: 0 },
        alpha: { start: 1, end: 0 },
        lifespan: 800,
        quantity: 20,
      },
    );

    this.scene.time.delayedCall(800, () => particles.destroy());
  }

  public getPowerUpType(): PowerUpType {
    return this.powerUpType;
  }
}

export class DoubleJumpPowerUp extends PowerUp {
  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    powerUpManager: PowerUpManager,
    duration: number = 10000,
  ) {
    super(scene, x, y, 'double_jump', powerUpManager, {
      type: 'double_jump',
      duration,
    });
  }
}

export class ShieldPowerUp extends PowerUp {
  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    powerUpManager: PowerUpManager,
    duration: number = 8000,
  ) {
    super(scene, x, y, 'shield', powerUpManager, {
      type: 'shield',
      duration,
      effectValue: 5, // blocks 5 damage
    });
  }
}

export class SpeedBoostPowerUp extends PowerUp {
  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    powerUpManager: PowerUpManager,
    duration: number = 6000,
    multiplier: number = 1.5,
  ) {
    super(scene, x, y, 'speed_boost', powerUpManager, {
      type: 'speed_boost',
      duration,
      effectValue: multiplier,
    });
  }
}

export class HealthBoostPowerUp extends PowerUp {
  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    powerUpManager: PowerUpManager,
    healAmount: number = 5,
  ) {
    super(scene, x, y, 'health_boost', powerUpManager, {
      type: 'health_boost',
      duration: 0, // instant effect
      effectValue: healAmount,
    });
  }

  public collect(player: Player): void {
    if (this.collected) return;
    this.collected = true;

    if (player.health < player.maxHealth) {
      player.heal(this.effectValue || 5);
    }

    this.scene.events.emit('powerup:collected', {
      type: this.powerUpType,
      effectValue: this.effectValue,
    });

    this.createCollectionEffect();
    this.destroy();
  }
}

export class DamageBoostPowerUp extends PowerUp {
  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    powerUpManager: PowerUpManager,
    duration: number = 10000,
    multiplier: number = 2,
  ) {
    super(scene, x, y, 'damage_boost', powerUpManager, {
      type: 'damage_boost',
      duration,
      effectValue: multiplier,
    });
  }
}
