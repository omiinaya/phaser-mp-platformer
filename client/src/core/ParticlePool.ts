import { logger } from '../utils/logger';
import { Scene } from 'phaser';

export class PooledEmitter {
  private emitter: Phaser.GameObjects.Particles.ParticleEmitter;
  private isInUse: boolean = false;
  private config: Phaser.Types.GameObjects.Particles.ParticleEmitterConfig;
  private baseQuantity: number;
  private autoReleaseTimer?: Phaser.Time.TimerEvent;
  private parentPool?: ParticlePool;

  constructor(
    scene: Scene,
    texture: string,
    config: Phaser.Types.GameObjects.Particles.ParticleEmitterConfig,
    baseQuantity: number = 10,
    parentPool?: ParticlePool,
  ) {
    this.config = { ...config };
    this.baseQuantity = baseQuantity;
    this.parentPool = parentPool;
    this.emitter = scene.add.particles(-1000, -1000, texture, {
      ...config,
      x: -1000,
      y: -1000,
      emitting: false,
    });
    this.isInUse = false;
  }

  public emit(x: number, y: number, count?: number, duration?: number): void {
    this.emitter.setPosition(x, y);
    this.isInUse = true;

    const qty = count !== undefined ? count : this.baseQuantity;

    if (qty > 0) {
      this.emitter.explode(qty);
      const releaseDelay = duration !== undefined ? duration : 1000;
      this.autoReleaseTimer = this.emitter.scene.time.delayedCall(
        releaseDelay,
        () => {
          this.release();
        },
      );
    }
  }

  public startEmitting(x: number, y: number, duration?: number): void {
    this.emitter.setPosition(x, y);
    this.isInUse = true;
    this.emitter.start();

    if (duration) {
      this.autoReleaseTimer = this.emitter.scene.time.delayedCall(
        duration,
        () => {
          this.emitter.stop();
          this.emitter.scene.time.delayedCall(1000, () => {
            this.release();
          });
        },
      );
    }
  }

  public stop(): void {
    this.emitter.stop();
    if (this.autoReleaseTimer) {
      this.autoReleaseTimer.remove();
      this.autoReleaseTimer = undefined;
    }
  }

  public reset(): void {
    this.stop();
    this.emitter.killAll();
    this.emitter.setPosition(-1000, -1000);
    this.isInUse = false;
  }

  public release(): void {
    this.reset();
    this.parentPool?.releaseEmitter(this);
  }

  public getEmitter(): Phaser.GameObjects.Particles.ParticleEmitter {
    return this.emitter;
  }

  public getIsInUse(): boolean {
    return this.isInUse;
  }

  public destroy(): void {
    this.stop();
    this.emitter.destroy();
  }
}

export class ParticlePool {
  private pool: Map<string, PooledEmitter[]> = new Map();
  private scene: Scene;
  private maxPerConfig: number;

  constructor(
    scene: Scene,
    initialSize: number = 5,
    maxPerConfig: number = 10,
  ) {
    this.scene = scene;
    this.maxPerConfig = maxPerConfig;
  }

  public acquire(
    texture: string,
    config: Phaser.Types.GameObjects.Particles.ParticleEmitterConfig,
    x: number,
    y: number,
    count?: number,
  ): PooledEmitter | null {
    const key = this.getConfigKey(texture, config);
    const qty = this.extractQuantity(config, count);

    let emitters = this.pool.get(key);
    if (!emitters) {
      emitters = [];
      this.pool.set(key, emitters);
    }

    for (const emitter of emitters) {
      if (!emitter.getIsInUse()) {
        emitter.emit(x, y, qty);
        return emitter;
      }
    }

    if (emitters.length >= this.maxPerConfig) {
      logger.warn(`ParticlePool max size reached for config: ${key}`);
    }

    const newEmitter = new PooledEmitter(
      this.scene,
      texture,
      config,
      qty,
      this,
    );
    emitters.push(newEmitter);
    newEmitter.emit(x, y, qty);
    return newEmitter;
  }

  public releaseEmitter(emitter: PooledEmitter): void {
    emitter.reset();
  }

  public update(delta: number): void {
    for (const [key, emitters] of this.pool.entries()) {
      for (const emitter of emitters) {
        if (emitter.getIsInUse()) {
          const emitterObj = emitter.getEmitter();
          if (!emitterObj.scene) {
            emitter.release();
          }
        }
      }
    }
  }

  public preallocate(
    texture: string,
    config: Phaser.Types.GameObjects.Particles.ParticleEmitterConfig,
    count: number,
  ): void {
    const key = this.getConfigKey(texture, config);
    let emitters = this.pool.get(key);
    if (!emitters) {
      emitters = [];
      this.pool.set(key, emitters);
    }

    for (let i = 0; i < count && emitters.length < this.maxPerConfig; i++) {
      const emitter = new PooledEmitter(this.scene, texture, config, 10, this);
      emitters.push(emitter);
    }
  }

  public clear(): void {
    for (const emitters of this.pool.values()) {
      emitters.forEach((e) => e.destroy());
    }
    this.pool.clear();
  }

  public getActiveCount(): number {
    let count = 0;
    for (const emitters of this.pool.values()) {
      count += emitters.filter((e) => e.getIsInUse()).length;
    }
    return count;
  }

  public getIdleCount(): number {
    let count = 0;
    for (const emitters of this.pool.values()) {
      count += emitters.filter((e) => !e.getIsInUse()).length;
    }
    return count;
  }

  private getConfigKey(
    texture: string,
    config: Phaser.Types.GameObjects.Particles.ParticleEmitterConfig,
  ): string {
    return `${texture}:${config.lifespan}:${config.tint}:${JSON.stringify(config.speed)}`;
  }

  private extractQuantity(
    config: Phaser.Types.GameObjects.Particles.ParticleEmitterConfig,
    overrideCount?: number,
  ): number {
    if (overrideCount !== undefined && overrideCount > 0) {
      return overrideCount;
    }
    if (
      config.quantity !== undefined &&
      typeof config.quantity === 'number' &&
      config.quantity > 0
    ) {
      return config.quantity;
    }
    return 10;
  }
}

let globalParticlePool: ParticlePool | null = null;

export function setGlobalParticlePool(pool: ParticlePool): void {
  globalParticlePool = pool;
}

export function getGlobalParticlePool(): ParticlePool | null {
  return globalParticlePool;
}
