import 'phaser';
import { GameObject } from './GameObject';

export type HazardType = 'spike' | 'lava' | 'saw_blade' | 'fire' | 'acid';

export interface HazardConfig {
  type: HazardType;
  damage: number;
  damageInterval?: number;
  animated?: boolean;
  moving?: boolean;
  moveSpeed?: number;
  moveRange?: number;
}

export class Hazard extends GameObject {
  protected hazardType: HazardType;
  protected damage: number;
  protected damageInterval: number;
  protected lastDamageTime: number = 0;
  protected isAnimated: boolean;
  protected isMoving: boolean;
  protected moveSpeed: number;
  protected moveRange: number;
  protected initialX: number;
  protected moveDirection: number = 1;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    texture: string,
    config: HazardConfig,
  ) {
    super(scene, x, y, texture);
    this.hazardType = config.type;
    this.damage = config.damage;
    this.damageInterval = config.damageInterval ?? 500;
    this.isAnimated = config.animated ?? false;
    this.isMoving = config.moving ?? false;
    this.moveSpeed = config.moveSpeed ?? 100;
    this.moveRange = config.moveRange ?? 100;
    this.initialX = x;

    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setupBody();
    this.setupAnimation();
  }

  protected setupBody(): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    if (body) {
      body.setImmovable(true);
      body.allowGravity = false;

      switch (this.hazardType) {
      case 'spike':
        body.setSize(this.width * 0.6, this.height * 0.6);
        body.setOffset(this.width * 0.2, this.height * 0.4);
        break;
      case 'lava':
        body.setSize(this.width, this.height * 0.3);
        body.setOffset(0, this.height * 0.7);
        break;
      case 'saw_blade':
        body.setCircle(this.width * 0.4, this.width * 0.1, this.width * 0.1);
        break;
      case 'fire':
        body.setSize(this.width * 0.8, this.height * 0.8);
        break;
      case 'acid':
        body.setSize(this.width, this.height * 0.3);
        break;
      }
    }
  }

  protected setupAnimation(): void {
    if (!this.isAnimated) return;

    switch (this.hazardType) {
    case 'spike':
      this.scene.tweens.add({
        targets: this,
        scaleX: 1.1,
        scaleY: 0.9,
        duration: 300,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
      break;
    case 'lava':
      this.scene.tweens.add({
        targets: this,
        alpha: 0.8,
        duration: 500,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
      break;
    case 'saw_blade':
      this.scene.tweens.add({
        targets: this,
        angle: 360,
        duration: 2000,
        repeat: -1,
        ease: 'Linear',
      });
      break;
    case 'fire':
      this.scene.tweens.add({
        targets: this,
        scale: 1.2,
        alpha: 0.7,
        duration: 400,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
      break;
    case 'acid':
      this.scene.tweens.add({
        targets: this,
        alpha: 0.7,
        y: this.y + 5,
        duration: 600,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
      break;
    }
  }

  public update(delta: number): void {
    this.lastDamageTime += delta;

    if (this.isMoving) {
      this.updateMovement(delta);
    }
  }

  protected updateMovement(_delta: number): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    if (!body) return;

    const distanceFromStart = Math.abs(this.x - this.initialX);

    if (distanceFromStart >= this.moveRange) {
      this.moveDirection *= -1;
    }

    body.setVelocityX(this.moveDirection * this.moveSpeed);
  }

  public canDamage(): boolean {
    return this.lastDamageTime >= this.damageInterval;
  }

  public dealDamage(): number {
    this.lastDamageTime = 0;
    return this.damage;
  }

  public getHazardType(): HazardType {
    return this.hazardType;
  }

  public getDamage(): number {
    return this.damage;
  }

  public onPlayerContact(callback: (hazard: Hazard) => void): void {
    this.scene.physics.add.overlap(this, (this as any).player, () => {
      if (this.canDamage()) {
        callback(this);
      }
    });
  }
}

export class Spike extends Hazard {
  constructor(scene: Phaser.Scene, x: number, y: number, damage: number = 1) {
    super(scene, x, y, 'spike', {
      type: 'spike',
      damage,
      damageInterval: 1000,
      animated: true,
    });
  }
}

export class Lava extends Hazard {
  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    width: number = 64,
    height: number = 32,
    damage: number = 2,
  ) {
    super(scene, x, y, 'lava', {
      type: 'lava',
      damage,
      damageInterval: 500,
      animated: true,
    });
    this.setDisplaySize(width, height);
  }
}

export class SawBlade extends Hazard {
  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    damage: number = 3,
    moving: boolean = false,
    moveSpeed: number = 150,
    moveRange: number = 100,
  ) {
    super(scene, x, y, 'saw_blade', {
      type: 'saw_blade',
      damage,
      damageInterval: 800,
      animated: true,
      moving,
      moveSpeed,
      moveRange,
    });
    this.setScale(1.5);
  }
}

export class Fire extends Hazard {
  constructor(scene: Phaser.Scene, x: number, y: number, damage: number = 2) {
    super(scene, x, y, 'fire', {
      type: 'fire',
      damage,
      damageInterval: 600,
      animated: true,
    });
  }
}

export class Acid extends Hazard {
  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    width: number = 64,
    height: number = 32,
    damage: number = 1,
  ) {
    super(scene, x, y, 'acid', {
      type: 'acid',
      damage,
      damageInterval: 700,
      animated: true,
    });
    this.setDisplaySize(width, height);
  }
}
