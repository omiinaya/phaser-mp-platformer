import { logger } from '../utils/logger';
import { Scene } from 'phaser';
import {
  Enemy,
  Slime,
  FlyingEnemy,
  Archer,
  AdvancedEnemy,
} from '../entities/Enemy';

export type EnemyType = 'slime' | 'flying' | 'archer' | 'advanced' | 'custom';

export interface EnemySpawnParams {
  x: number;
  y: number;
  type: EnemyType;
  config?: any;
  customFactory?: (scene: Scene, x: number, y: number, config: any) => Enemy;
}

export class EnemyPool {
  private pool: Map<EnemyType, Enemy[]> = new Map();
  private activeEnemies: Enemy[] = [];
  private scene: Scene;
  private maxPerType: number;
  private factories: Map<
    EnemyType,
    (scene: Scene, x: number, y: number, config: any) => Enemy
  > = new Map();

  constructor(scene: Scene, maxPerType: number = 20) {
    this.scene = scene;
    this.maxPerType = maxPerType;

    this.factories.set('slime', (s, x, y, cfg) => new Slime(s, x, y, cfg));
    this.factories.set(
      'flying',
      (s, x, y, cfg) => new FlyingEnemy(s, x, y, cfg),
    );
    this.factories.set('archer', (s, x, y, cfg) => new Archer(s, x, y, cfg));
    this.factories.set(
      'advanced',
      (s, x, y, cfg) => new AdvancedEnemy(s, x, y, cfg),
    );
  }

  public spawn(params: EnemySpawnParams): Enemy | null {
    const type = params.type;
    const factory =
      params.customFactory ||
      this.factories.get(type) ||
      this.factories.get('slime') ||
      (() => new Slime(this.scene, params.x, params.y, params.config || {}));

    let pool = this.pool.get(type);
    if (!pool) {
      pool = [];
      this.pool.set(type, pool);
    }

    let enemy: Enemy;
    const availableEnemy = pool.find((e) => !e.active && e.visible === false);

    if (availableEnemy) {
      enemy = availableEnemy;
      this.resetEnemy(enemy, params);
      pool = pool.filter((e) => e !== enemy);
      this.pool.set(type, pool);
    } else if (pool.length < this.maxPerType) {
      enemy = factory(this.scene, params.x, params.y, params.config || {});
    } else {
      logger.warn(`EnemyPool max size reached for type: ${type}`);
      const oldestInactive = pool.find((e) => !e.active);
      if (oldestInactive) {
        enemy = oldestInactive;
        this.resetEnemy(enemy, params);
        pool = pool.filter((e) => e !== enemy);
        this.pool.set(type, pool);
      } else {
        return null;
      }
    }

    enemy.setVisible(true);
    enemy.setActive(true);

    const body = enemy.body as Phaser.Physics.Arcade.Body;
    if (body) {
      body.enable = true;
    }

    this.activeEnemies.push(enemy);
    return enemy;
  }

  public recycle(enemy: Enemy): void {
    const index = this.activeEnemies.indexOf(enemy);
    if (index > -1) {
      this.activeEnemies.splice(index, 1);
    }

    const type = this.getEnemyType(enemy);
    let pool = this.pool.get(type);
    if (!pool) {
      pool = [];
      this.pool.set(type, pool);
    }

    if (pool.length >= this.maxPerType) {
      enemy.destroy();
      return;
    }

    enemy.setVisible(false);
    enemy.setActive(false);
    enemy.x = -1000;
    enemy.y = -1000;

    const body = enemy.body as Phaser.Physics.Arcade.Body;
    if (body) {
      body.enable = false;
      body.setVelocity(0, 0);
    }

    pool.push(enemy);
  }

  public recycleAll(): void {
    for (const enemy of [...this.activeEnemies]) {
      this.recycle(enemy);
    }
  }

  public update(delta: number): void {
    for (let i = this.activeEnemies.length - 1; i >= 0; i--) {
      const enemy = this.activeEnemies[i];
      if (enemy.active && enemy.visible) {
        enemy.update(delta);
      }
    }
  }

  public getActiveEnemy(type?: EnemyType): Enemy[] {
    if (type) {
      return this.activeEnemies.filter((e) => this.getEnemyType(e) === type);
    }
    return this.activeEnemies;
  }

  public getActiveCount(type?: EnemyType): number {
    return this.getActiveEnemy(type).length;
  }

  public getIdleCount(type?: EnemyType): number {
    if (type) {
      const pool = this.pool.get(type);
      return pool ? pool.length : 0;
    }
    let count = 0;
    for (const pool of this.pool.values()) {
      count += pool.length;
    }
    return count;
  }

  public preallocate(type: EnemyType, count: number, config?: any): void {
    const factory =
      this.factories.get(type) ||
      this.factories.get('slime') ||
      (() => new Slime(this.scene, -1000, -1000, config || {}));
    let pool = this.pool.get(type);
    if (!pool) {
      pool = [];
      this.pool.set(type, pool);
    }

    for (let i = 0; i < count && pool.length < this.maxPerType; i++) {
      const enemy = factory(this.scene, -1000, -1000, config || {});
      enemy.setVisible(false);
      enemy.setActive(false);

      const body = enemy.body as Phaser.Physics.Arcade.Body;
      if (body) {
        body.enable = false;
      }

      pool.push(enemy);
    }
  }

  public clear(): void {
    this.activeEnemies.forEach((e) => e.destroy());
    this.pool.forEach((pool) => pool.forEach((e) => e.destroy()));
    this.activeEnemies = [];
    this.pool.clear();
  }

  private resetEnemy(enemy: Enemy, params: EnemySpawnParams): void {
    enemy.x = params.x;
    enemy.y = params.y;

    const body = enemy.body as Phaser.Physics.Arcade.Body;
    if (body) {
      body.enable = true;
      body.setVelocity(0, 0);
      body.reset(params.x, params.y);
    }
  }

  private getEnemyType(enemy: Enemy): EnemyType {
    if (enemy instanceof Slime) return 'slime';
    if (enemy instanceof FlyingEnemy) return 'flying';
    if (enemy instanceof Archer) return 'archer';
    if (enemy instanceof AdvancedEnemy) return 'advanced';
    return 'custom';
  }
}

let globalEnemyPool: EnemyPool | null = null;

export function setGlobalEnemyPool(pool: EnemyPool): void {
  globalEnemyPool = pool;
}

export function getGlobalEnemyPool(): EnemyPool | null {
  return globalEnemyPool;
}
