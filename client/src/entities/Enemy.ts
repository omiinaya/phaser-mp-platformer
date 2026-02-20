import { logger } from '../utils/logger';
import 'phaser';
import { Character } from './Character';
import { Player } from './Player';
import {
  AttackPatternManager,
  AttackPatternType,
  AttackConfig,
} from './AttackPatternManager';
import { getGlobalProjectilePool } from '../core/ProjectilePool';

/**
 * Enemy behavior state.
 */
export type EnemyState =
  | 'idle'
  | 'patrol'
  | 'chase'
  | 'attack'
  | 'flee'
  | 'dead';

/**
 * Configuration for enemy AI.
 */
export interface EnemyAIConfig {
  /** Detection range (pixels) for chasing player. */
  detectionRange?: number;
  /** Attack range (pixels). */
  attackRange?: number;
  /** Patrol speed (pixels per second). */
  patrolSpeed?: number;
  /** Chase speed (pixels per second). */
  chaseSpeed?: number;
  /** Time between patrol direction changes (ms). */
  patrolChangeTime?: number;
  /** Whether the enemy can fly (ignore ground collisions). */
  flying?: boolean;
  /** Whether the enemy drops loot on death. */
  dropsLoot?: boolean;
  /** Loot item keys (if dropsLoot is true). */
  lootTable?: string[];
}

/**
 * Abstract base class for enemies.
 * Extends Character with AI behavior and state machine.
 */
export abstract class Enemy extends Character {
  /** Current AI state. */
  protected aiState: EnemyState;

  /** Reference to the player (target). */
  protected target?: Player;

  /** AI configuration. */
  protected aiConfig: EnemyAIConfig;

  /** Timer for patrol direction changes. */
  protected patrolTimer: number;

  /** Current patrol direction (-1 left, 1 right). */
  protected patrolDirection: number;

  /** Time since last state change. */
  protected stateTimer: number;

  /** Attack pattern manager. */
  protected attackManager?: AttackPatternManager;

  /** Whether attack patterns are enabled. */
  protected useAttackPatterns: boolean = true;

  /**
   * Creates an instance of Enemy.
   * @param scene The scene this enemy belongs to.
   * @param x The x position.
   * @param y The y position.
   * @param texture The texture key.
   * @param config AI configuration.
   * @param frame The frame index (optional).
   */
  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    texture: string,
    config: EnemyAIConfig = {},
    frame?: string | number,
  ) {
    super(scene, x, y, texture, frame);
    this.aiState = 'idle';
    this.target = undefined;
    this.aiConfig = config;
    this.patrolTimer = 0;
    this.patrolDirection = 1;
    this.stateTimer = 0;

    // Initialize default AI config values
    this.aiConfig = {
      detectionRange: 300,
      attackRange: 50,
      patrolSpeed: 100,
      chaseSpeed: 150,
      patrolChangeTime: 2000,
      flying: false,
      dropsLoot: true,
      lootTable: ['coin'],
      ...config,
    };

    this.moveSpeed = this.aiConfig.patrolSpeed!;
    this.health = 5;
    this.maxHealth = this.health;

    // Initialize attack pattern manager
    this.attackManager = new AttackPatternManager(this);
    this.setupAttackPatterns();

    // Enable physics
    this.enablePhysics();
  }

  /**
   * Update enemy AI and state each frame.
   * @param delta Time delta in milliseconds.
   */
  public update(_delta: number): void {
    super.update(_delta);

    this.stateTimer += _delta;

    // Find target if not already set
    if (!this.target) {
      this.findTarget();
    }

    // Update attack pattern manager
    if (this.useAttackPatterns && this.attackManager) {
      this.attackManager.update(_delta);
    }

    // State machine
    switch (this.aiState) {
    case 'idle':
      this.updateIdle(_delta);
      break;
    case 'patrol':
      this.updatePatrol(_delta);
      break;
    case 'chase':
      this.updateChase(_delta);
      break;
    case 'attack':
      this.updateAttack(_delta);
      break;
    case 'flee':
      this.updateFlee(_delta);
      break;
    case 'dead':
      // Do nothing
      break;
    }

    // Update animation based on state
    this.updateAnimation();
  }

  /**
   * Setup attack patterns for this enemy.
   * Override in subclasses to define custom attacks.
   */
  protected setupAttackPatterns(): void {
    // Default melee attack
    const meleeAttack: AttackConfig = {
      type: AttackPatternType.MELEE,
      damage: 1,
      range: this.aiConfig.attackRange!,
      telegraphTime: 500,
      attackDuration: 300,
      cooldown: 1500,
      priority: 1,
    };

    this.attackManager?.addAttack('melee', meleeAttack);
  }

  /**
   * Find a target (player) within detection range.
   */
  protected findTarget(): void {
    const players = this.scene.children.list.filter(
      (child) => child instanceof Player,
    ) as Player[];
    if (players.length === 0) return;

    const detectionRange = this.aiConfig.detectionRange!;
    for (const player of players) {
      const distance = Phaser.Math.Distance.Between(
        this.x,
        this.y,
        player.x,
        player.y,
      );
      if (distance <= detectionRange) {
        this.target = player;
        this.setAIState('chase');
        return;
      }
    }
  }

  /**
   * Update idle state.
   * @param delta Time delta.
   */
  protected updateIdle(_delta: number): void {
    // After a while, start patrolling
    if (this.stateTimer > 2000) {
      this.setState('patrol');
    }
  }

  /**
   * Update patrol state.
   * @param delta Time delta.
   */
  protected updatePatrol(_delta: number): void {
    // Move in patrol direction
    this.move(this.patrolDirection);

    // Change direction periodically
    this.patrolTimer += _delta;
    if (this.patrolTimer >= this.aiConfig.patrolChangeTime!) {
      this.patrolDirection *= -1;
      this.patrolTimer = 0;
    }

    // Check for target
    if (this.target) {
      this.setAIState('chase');
    }
  }

  /**
   * Update chase state.
   * @param delta Time delta.
   */
  protected updateChase(_delta: number): void {
    if (!this.target) {
      this.setAIState('patrol');
      return;
    }

    const distance = Phaser.Math.Distance.Between(
      this.x,
      this.y,
      this.target.x,
      this.target.y,
    );

    // If within attack range, attack
    if (distance <= this.aiConfig.attackRange!) {
      this.setAIState('attack');
      return;
    }

    // If out of detection range, lose target
    if (distance > this.aiConfig.detectionRange!) {
      this.target = undefined;
      this.setAIState('patrol');
      return;
    }

    // Move towards target
    const direction = this.target.x > this.x ? 1 : -1;
    this.moveSpeed = this.aiConfig.chaseSpeed!;
    this.move(direction);
  }

  /**
   * Update attack state.
   * @param delta Time delta.
   */
  protected updateAttack(_delta: number): void {
    if (!this.target) {
      this.setAIState('patrol');
      return;
    }

    const distance = Phaser.Math.Distance.Between(
      this.x,
      this.y,
      this.target.x,
      this.target.y,
    );

    // If target moved out of attack range, chase
    if (distance > this.aiConfig.attackRange!) {
      this.setAIState('chase');
      return;
    }

    // Use attack pattern manager if enabled and available
    if (this.useAttackPatterns && this.attackManager) {
      // Check if an attack is already active
      if (!this.attackManager.getActiveAttack()) {
        // Select and execute an attack
        const attackName = this.attackManager.selectBestAttack(this.target);
        if (attackName) {
          this.attackManager.executeAttack(attackName, this.target);
        } else {
          // No attacks available, fall back to old behavior
          this.performAttack();
        }
      }
    } else {
      // Fall back to old attack behavior
      this.performAttack();
    }
  }

  /**
   * Update flee state (e.g., when health is low).
   * @param delta Time delta.
   */
  protected updateFlee(_delta: number): void {
    // Move away from target
    if (this.target) {
      const direction = this.target.x > this.x ? -1 : 1;
      this.move(direction);
    }
    // After some time, revert to idle
    if (this.stateTimer > 3000) {
      this.setAIState('idle');
    }
  }

  /**
   * Perform attack on target. Override in subclasses.
   */
  protected performAttack(): void {
    // Default attack deals damage to target
    if (this.target) {
      this.target.takeDamage(1);
    }
  }

  /**
   * Change AI state.
   * @param newState New state to transition to.
   */
  protected setAIState(newState: EnemyState): void {
    if (this.aiState === newState) return;
    this.aiState = newState;
    this.stateTimer = 0;

    // On state exit/entry logic
    switch (newState) {
    case 'patrol':
      this.moveSpeed = this.aiConfig.patrolSpeed!;
      break;
    case 'chase':
      this.moveSpeed = this.aiConfig.chaseSpeed!;
      break;
    case 'attack':
      this.velocity.x = 0;
      break;
    }
  }

  /**
   * Take damage and possibly flee if health low.
   * @param amount Damage amount.
   * @returns True if still alive.
   */
  public takeDamage(amount: number): boolean {
    const alive = super.takeDamage(amount);
    if (alive && this.health < this.maxHealth * 0.3) {
      this.setAIState('flee');
    }
    return alive;
  }

  /**
   * Called when health reaches zero.
   */
  protected die(): void {
    this.setAIState('dead');
    this.dropLoot();
    super.die();
  }

  /**
   * Drop loot items if configured.
   */
  protected dropLoot(): void {
    if (this.aiConfig.dropsLoot && this.aiConfig.lootTable) {
      // Emit event for loot creation
      this.scene.events.emit('enemy:dropped-loot', {
        enemy: this,
        loot: this.aiConfig.lootTable,
      });
    }
  }

  /**
   * Update animation based on state.
   */
  protected updateAnimation(): void {
    // Base implementation: flip sprite based on facing direction
    // Subclasses override this to actually play animations
    this.flipX = this.facing === -1;

    // Subclasses should implement actual animation playing
    // Example: this.anims.play(`enemy-${animName}`, true);
  }
}

/**
 * Concrete enemy: Slime.
 */
export class Slime extends Enemy {
  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    config: EnemyAIConfig = {},
  ) {
    super(scene, x, y, 'slime', {
      detectionRange: 200,
      attackRange: 30,
      patrolSpeed: 60,
      chaseSpeed: 80,
      ...config,
    });
    this.health = 3;
    this.maxHealth = this.health;
  }

  protected performAttack(): void {
    if (this.target) {
      // Slime deals 1 damage and applies slow? (optional)
      this.target.takeDamage(1);
    }
  }
}

/**
 * Concrete enemy: Flying (e.g., bat).
 */
export class FlyingEnemy extends Enemy {
  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    config: EnemyAIConfig = {},
  ) {
    super(scene, x, y, 'flying', {
      flying: true,
      detectionRange: 400,
      attackRange: 60,
      patrolSpeed: -1, // flying enemies don't patrol on ground
      chaseSpeed: 120,
      ...config,
    });
    this.health = 2;
    this.maxHealth = this.health;
  }

  public update(_delta: number): void {
    // Override to ignore ground detection
    super.update(_delta);
    // Flying enemies ignore ground collisions
    this.isOnGround = false;
  }

  protected updatePatrol(_delta: number): void {
    // Flying patrol: move in a sine wave pattern
    this.velocity.x = this.patrolDirection * this.aiConfig.patrolSpeed!;
    this.velocity.y = Math.sin(this.stateTimer / 500) * 50;

    this.patrolTimer += _delta;
    if (this.patrolTimer >= this.aiConfig.patrolChangeTime!) {
      this.patrolDirection *= -1;
      this.patrolTimer = 0;
    }
  }
}

/**
 * Projectile class for ranged attacks (arrows, fireballs, etc.)
 */
export class Projectile extends Phaser.Physics.Arcade.Sprite {
  protected damage: number;
  protected speed: number;
  protected owner: Enemy;
  protected lifetime: number;
  protected lifetimeTimer: number = 0;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    texture: string,
    owner: Enemy,
    direction: number,
    speed: number = 300,
    damage: number = 1,
    lifetime: number = 3000,
  ) {
    super(scene, x, y, texture);
    this.damage = damage;
    this.speed = speed;
    this.owner = owner;
    this.lifetime = lifetime;
    this.scene.add.existing(this);
    this.scene.physics.add.existing(this);
    this.setCollideWorldBounds(true);
    const body = this.body as Phaser.Physics.Arcade.Body;
    if (body) {
      body.setCollideWorldBounds(true);
      body.onWorldBounds = true;
      body.setVelocityX(direction * speed);
    }
    this.flipX = direction === -1;
  }

  public update(_delta: number): void {
    this.lifetimeTimer += _delta;
    if (this.lifetimeTimer >= this.lifetime) {
      this.destroy();
    }
  }

  public getDamage(): number {
    return this.damage;
  }

  public getOwner(): Enemy {
    return this.owner;
  }

  public onHit(): void {
    this.destroy();
  }
}

/**
 * Archer enemy: Ranged attacker that shoots projectiles.
 * Now enhanced with the attack pattern system.
 */
export class Archer extends Enemy {
  protected lastShotTime: number = 0;
  protected shotCooldown: number = 1500;
  protected projectileSpeed: number = 350;
  protected projectileDamage: number = 2;
  protected projectileTexture: string = 'arrow';

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    config: EnemyAIConfig = {},
  ) {
    super(scene, x, y, 'archer', {
      detectionRange: 400,
      attackRange: 350,
      patrolSpeed: 50,
      chaseSpeed: 70,
      ...config,
    });
    this.health = 5;
    this.maxHealth = this.health;
  }

  protected setupAttackPatterns(): void {
    // Use attack pattern system
    const projectileAttack: AttackConfig = {
      type: AttackPatternType.PROJECTILE,
      damage: this.projectileDamage,
      range: this.aiConfig.attackRange!,
      telegraphTime: 800,
      attackDuration: 500,
      cooldown: 2000,
      priority: 2,
      customAttack: (_enemy, _target) => {
        this.shoot();
      },
    };

    this.attackManager?.addAttack('shoot', projectileAttack);
  }

  protected updateChase(_delta: number): void {
    if (!this.target) {
      this.setAIState('patrol');
      return;
    }

    const distance = Phaser.Math.Distance.Between(
      this.x,
      this.y,
      this.target.x,
      this.target.y,
    );

    // Archer tries to maintain attack range
    const minRange = this.aiConfig.attackRange! * 0.5;
    const maxRange = this.aiConfig.attackRange!;

    if (distance < minRange) {
      this.setAIState('flee');
      return;
    }

    if (distance <= maxRange) {
      this.setAIState('attack');
      return;
    }

    if (distance > this.aiConfig.detectionRange!) {
      this.target = undefined;
      this.setAIState('patrol');
      return;
    }

    const direction = this.target.x > this.x ? 1 : -1;
    this.moveSpeed = this.aiConfig.chaseSpeed!;
    this.move(direction);
  }

  protected updateAttack(_delta: number): void {
    // Use parent's attack manager handling
    // Check if too close or too far
    if (!this.target) {
      this.setAIState('patrol');
      return;
    }

    const distance = Phaser.Math.Distance.Between(
      this.x,
      this.y,
      this.target.x,
      this.target.y,
    );

    // If too close, flee
    if (distance < this.aiConfig.attackRange! * 0.4) {
      this.setAIState('flee');
      return;
    }

    // If too far, chase
    if (distance > this.aiConfig.attackRange!) {
      this.setAIState('chase');
      return;
    }

    // Use the attack pattern manager from parent class
    if (this.useAttackPatterns && this.attackManager) {
      // Check if an attack is already active
      if (!this.attackManager.getActiveAttack()) {
        // Select and execute an attack
        const attackName = this.attackManager.selectBestAttack(this.target);
        if (attackName) {
          this.attackManager.executeAttack(attackName, this.target);
        } else {
          // No attacks available
          const activeAttack = this.attackManager.getActiveAttack();
          if (!activeAttack) {
            this.shoot();
          }
        }
      }
    } else {
      // Fall back to default behavior
      this.lastShotTime += _delta;
      if (this.lastShotTime >= this.shotCooldown) {
        this.shoot();
        this.lastShotTime = 0;
      }
    }
  }

  protected updateFlee(_delta: number): void {
    if (!this.target) {
      this.setAIState('patrol');
      return;
    }

    const distance = Phaser.Math.Distance.Between(
      this.x,
      this.y,
      this.target.x,
      this.target.y,
    );

    if (distance >= this.aiConfig.attackRange! * 0.8) {
      this.setAIState('attack');
      return;
    }

    const direction = this.target.x > this.x ? -1 : 1;
    this.moveSpeed = this.aiConfig.chaseSpeed!;
    this.move(direction);

    if (this.stateTimer > 3000) {
      this.setAIState('patrol');
    }
  }

  protected shoot(): void {
    if (!this.target) return;

    const direction = this.target.x > this.x ? 1 : -1;
    const arrowX = this.x + direction * 20;
    const arrowY = this.y - 10;

    const pool = getGlobalProjectilePool();
    if (pool) {
      const arrow = pool.acquire();
      arrow.initialize(
        arrowX,
        arrowY,
        this.projectileTexture,
        this,
        direction,
        this.projectileSpeed,
        this.projectileDamage,
      );

      this.scene.events.emit('enemy:projectile-fired', {
        enemy: this,
        projectile: arrow,
      });
    } else {
      logger.warn('ProjectilePool not available, using fallback');
    }
  }

  public destroy(): void {
    super.destroy();
  }
}

/**
 * Advanced enemy example with multiple attack patterns.
 * This enemy demonstrates melee, charge, and area-of-effect attacks.
 */
export class AdvancedEnemy extends Enemy {
  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    config: EnemyAIConfig = {},
  ) {
    super(scene, x, y, 'slime', {
      detectionRange: 350,
      attackRange: 200,
      patrolSpeed: 80,
      chaseSpeed: 120,
      ...config,
    });
    this.health = 10;
    this.maxHealth = this.health;
  }

  protected setupAttackPatterns(): void {
    // 1. Quick melee slash attack (primary attack, high priority)
    const meleeAttack: AttackConfig = {
      type: AttackPatternType.MELEE,
      damage: 2,
      range: 60,
      telegraphTime: 400,
      attackDuration: 200,
      cooldown: 1200,
      priority: 3,
    };

    // 2. Heavy charge attack (high damage, longer telegraph)
    const chargeAttack: AttackConfig = {
      type: AttackPatternType.CHARGE,
      damage: 4,
      range: 250,
      telegraphTime: 1200,
      attackDuration: 600,
      cooldown: 4000,
      priority: 1,
    };

    // 3. Area-of-effect shockwave (moderate damage, affects nearby area)
    const aoeAttack: AttackConfig = {
      type: AttackPatternType.AOE,
      damage: 3,
      range: 150,
      telegraphTime: 1500,
      attackDuration: 400,
      cooldown: 5000,
      priority: 1,
    };

    this.attackManager?.addAttack('melee_slash', meleeAttack);
    this.attackManager?.addAttack('charge', chargeAttack);
    this.attackManager?.addAttack('shockwave', aoeAttack);
  }

  /**
   * Override attack selection to vary attacks based on health.
   */
  protected updateAttack(_delta: number): void {
    if (!this.target) {
      this.setAIState('patrol');
      return;
    }

    const distance = Phaser.Math.Distance.Between(
      this.x,
      this.y,
      this.target.x,
      this.target.y,
    );

    // If target moved out of attack range, chase
    if (distance > this.aiConfig.attackRange!) {
      this.setAIState('chase');
      return;
    }

    // Use attack pattern manager
    if (this.useAttackPatterns && this.attackManager) {
      const activeAttack = this.attackManager.getActiveAttack();

      if (!activeAttack) {
        // When health is low, use more aggressive attacks
        if (this.health < this.maxHealth * 0.3 && Math.random() < 0.3) {
          // Prefer charge or shockwave when desperate
          const aggressiveAttacks = ['charge', 'shockwave'];
          const availableAggressive = aggressiveAttacks.filter((name) =>
            this.attackManager!.getAvailableAttacks().includes(name),
          );

          if (availableAggressive.length > 0) {
            const selected =
              availableAggressive[
                Math.floor(Math.random() * availableAggressive.length)
              ];
            this.attackManager.executeAttack(selected, this.target);
            return;
          }
        }

        // Normal attack selection
        const attackName = this.attackManager.selectBestAttack(this.target);
        if (attackName) {
          this.attackManager.executeAttack(attackName, this.target);
        }
      }
    } else {
      super.updateAttack(_delta);
    }
  }
}
