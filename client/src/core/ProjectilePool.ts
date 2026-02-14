import { logger } from '../utils/logger';
import "phaser";
import { Scene } from "phaser";
import { Enemy } from "../entities/Enemy";

let globalProjectilePool: ProjectilePool | null = null;

export function setGlobalProjectilePool(pool: ProjectilePool): void {
  globalProjectilePool = pool;
}

export function getGlobalProjectilePool(): ProjectilePool | null {
  return globalProjectilePool;
}

export class PooledProjectile extends Phaser.Physics.Arcade.Sprite {
  protected damage: number = 1;
  protected speed: number = 300;
  protected owner?: Enemy;
  protected lifetime: number = 3000;
  protected lifetimeTimer: number = 0;
  protected isActive: boolean = false;

  constructor(scene: Phaser.Scene, pool?: ProjectilePool) {
    super(scene, -1000, -1000, "arrow");
    this.scene.add.existing(this);
    this.scene.physics.add.existing(this);
    this.setVisible(false);
    this.setActive(false);
    this.setCollideWorldBounds(true);
    const body = this.body as Phaser.Physics.Arcade.Body;
    if (body) {
      body.setCollideWorldBounds(true);
      body.onWorldBounds = true;
      body.enable = false;

      body.world.on(
        "worldbounds",
        (
          _body: any,
          _up: boolean,
          _down: boolean,
          _left: boolean,
          _right: boolean,
        ) => {
          if (_body === body) {
            this.recycle();
            pool?.release(this);
          }
        },
      );
    }
  }

  public initialize(
    x: number,
    y: number,
    texture: string,
    owner: Enemy,
    direction: number,
    speed: number = 300,
    damage: number = 1,
    lifetime: number = 3000,
  ): void {
    this.x = x;
    this.y = y;
    this.setTexture(texture);
    this.damage = damage;
    this.speed = speed;
    this.owner = owner;
    this.lifetime = lifetime;
    this.lifetimeTimer = 0;
    this.isActive = true;
    this.setVisible(true);
    this.setActive(true);

    const body = this.body as Phaser.Physics.Arcade.Body;
    if (body) {
      body.enable = true;
      body.setVelocityX(direction * speed);
    }
    this.flipX = direction === -1;
  }

  public update(delta: number): void {
    if (!this.isActive) return;

    this.lifetimeTimer += delta;
    if (this.lifetimeTimer >= this.lifetime) {
      this.recycle();
    }
  }

  public recycle(): void {
    this.isActive = false;
    this.setVisible(false);
    this.setActive(false);

    const body = this.body as Phaser.Physics.Arcade.Body;
    if (body) {
      body.enable = false;
      body.setVelocity(0, 0);
    }

    this.x = -1000;
    this.y = -1000;
    this.lifetimeTimer = 0;
  }

  public getDamage(): number {
    return this.damage;
  }

  public getOwner(): Enemy | undefined {
    return this.owner;
  }

  public getIsActive(): boolean {
    return this.isActive;
  }
}

export class ProjectilePool {
  private pool: PooledProjectile[];
  private activeProjectiles: PooledProjectile[] = [];
  private scene: Phaser.Scene;
  private maxSize: number;

  constructor(
    scene: Phaser.Scene,
    initialSize: number = 20,
    maxSize: number = 100,
  ) {
    this.scene = scene;
    this.maxSize = maxSize;
    this.pool = [];
    this.activeProjectiles = [];

    for (let i = 0; i < initialSize; i++) {
      const proj = new PooledProjectile(scene, this);
      this.pool.push(proj);
    }
  }

  public acquire(): PooledProjectile {
    let projectile: PooledProjectile;
    if (this.pool.length > 0) {
      projectile = this.pool.pop()!;
    } else {
      if (this.activeProjectiles.length >= this.maxSize) {
        logger.warn(
          "ProjectilePool max size reached, creating extra projectile",
        );
      }
      projectile = new PooledProjectile(this.scene, this);
    }
    this.activeProjectiles.push(projectile);
    return projectile;
  }

  public release(projectile: PooledProjectile): void {
    if (this.pool.length >= this.maxSize) {
      projectile.destroy();
      const index = this.activeProjectiles.indexOf(projectile);
      if (index > -1) {
        this.activeProjectiles.splice(index, 1);
      }
      return;
    }

    const index = this.activeProjectiles.indexOf(projectile);
    if (index > -1) {
      this.activeProjectiles.splice(index, 1);
    }

    projectile.recycle();
    if (this.pool.length < this.maxSize) {
      this.pool.push(projectile);
    } else {
      projectile.destroy();
    }
  }

  public recycleAll(): void {
    for (let i = this.activeProjectiles.length - 1; i >= 0; i--) {
      const projectile = this.activeProjectiles[i];
      projectile.recycle();
      if (this.pool.length < this.maxSize) {
        this.pool.push(projectile);
      } else {
        projectile.destroy();
      }
    }
    this.activeProjectiles = [];
  }

  public update(delta: number): void {
    for (let i = this.activeProjectiles.length - 1; i >= 0; i--) {
      const projectile = this.activeProjectiles[i];
      projectile.update(delta);
      if (!projectile.getIsActive()) {
        this.release(projectile);
      }
    }
  }

  public getActiveCount(): number {
    return this.activeProjectiles.length;
  }

  public getIdleCount(): number {
    return this.pool.length;
  }

  public clear(): void {
    this.activeProjectiles.forEach((p) => p.destroy());
    this.pool.forEach((p) => p.destroy());
    this.activeProjectiles = [];
    this.pool = [];
  }

  public preallocate(count: number): void {
    for (let i = 0; i < count; i++) {
      if (this.pool.length >= this.maxSize) break;
      const proj = new PooledProjectile(this.scene, this);
      this.pool.push(proj);
    }
  }
}
