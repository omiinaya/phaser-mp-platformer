import { Enemy } from './Enemy';
import { Player } from './Player';

/**
 * Attack pattern types for enemies.
 */
export enum AttackPatternType {
  /** Basic melee swipe attack. */
  MELEE = 'melee',
  /** Charge rush attack. */
  CHARGE = 'charge',
  /** Projectile attack. */
  PROJECTILE = 'projectile',
  /** Area of effect attack. */
  AOE = 'aoe',
  /** Summon minions attack. */
  SUMMON = 'summon',
  /** Teleport attack. */
  TELEPORT = 'teleport',
}

/**
 * Attack configuration for an enemy.
 */
export interface AttackConfig {
  /** Attack pattern type. */
  type: AttackPatternType;
  /** Attack damage. */
  damage: number;
  /** Attack range (pixels). */
  range: number;
  /** Telegraph time before attack (ms). */
  telegraphTime: number;
  /** Attack duration (ms). */
  attackDuration: number;
  /** Cooldown time (ms). */
  cooldown: number;
  /** Priority (higher = more likely to use). */
  priority?: number;
  /** Whether attack requires facing target. */
  needsFaceTarget?: boolean;
  /** Custom attack function (optional). */
  customAttack?: (enemy: Enemy, target: Player) => void;
}

/**
 * Represents an active attack instance.
 */
export interface ActiveAttack {
  /** The attack configuration. */
  config: AttackConfig;
  /** Whether the attack is currently telegraphing (warning phase). */
  isTelegraphing: boolean;
  /** Whether the attack is executing. */
  isAttacking: boolean;
  /** Timer for the attack cycle. */
  timer: number;
  /** Whether this attack has triggered damage. */
  damageTriggered: boolean;
}

/**
 * Manages enemy attack patterns with telegraphing and timing.
 */
export class AttackPatternManager {
  /** The enemy that owns this attack manager. */
  private enemy: Enemy;

  /** Available attack patterns. */
  private attacks: Map<string, AttackConfig>;

  /** Attack cooldowns by name. */
  private cooldowns: Map<string, number>;

  /** Currently active attack. */
  private activeAttack?: ActiveAttack;

  /**
   * Creates an instance of AttackPatternManager.
   * @param enemy The enemy that owns this attack manager.
   */
  constructor(enemy: Enemy) {
    this.enemy = enemy;
    this.attacks = new Map();
    this.cooldowns = new Map();
  }

  /**
   * Add an attack pattern.
   * @param name Unique name for this attack.
   * @param config Attack configuration.
   */
  addAttack(name: string, config: AttackConfig): void {
    this.attacks.set(name, config);
  }

  /**
   * Remove an attack pattern.
   * @param name Name of the attack to remove.
   */
  removeAttack(name: string): void {
    this.attacks.delete(name);
    this.cooldowns.delete(name);
  }

  /**
   * Get an attack configuration by name.
   * @param name Name of the attack.
   * @returns The attack config, or undefined if not found.
   */
  getAttack(name: string): AttackConfig | undefined {
    return this.attacks.get(name);
  }

  /**
   * Get all available attacks.
   * @returns Array of attack names and their configs.
   */
  getAllAttacks(): Array<{ name: string; config: AttackConfig }> {
    const result: Array<{ name: string; config: AttackConfig }> = [];
    for (const [name, config] of this.attacks.entries()) {
      result.push({ name, config });
    }
    return result;
  }

  /**
   * Get available attacks that are off cooldown.
   * @returns Array of available attack names.
   */
  getAvailableAttacks(): string[] {
    const now = Date.now();
    const available: string[] = [];

    for (const [name] of this.attacks.entries()) {
      const cooldownUntil = this.cooldowns.get(name) ?? 0;
      if (now >= cooldownUntil) {
        available.push(name);
      }
    }

    return available;
  }

  /**
   * Select the best available attack based on conditions.
   * @param target Current target player.
   * @returns Name of selected attack, or undefined if no attacks available.
   */
  selectBestAttack(target?: Player): string | undefined {
    const availableAttacks = this.getAvailableAttacks();
    if (availableAttacks.length === 0) {
      return undefined;
    }

    // Calculate attack priorities based on conditions
    const scoredAttacks = availableAttacks.map((name) => {
      const config = this.attacks.get(name)!;
      let score = config.priority ?? 1;

      // Adjust score based on distance to target
      if (target) {
        const distance = Phaser.Math.Distance.Between(
          this.enemy.x,
          this.enemy.y,
          target.x,
          target.y,
        );

        // Prefer attacks that are in range
        if (distance <= config.range) {
          score += 2;
        } else {
          score -= 1;
        }

        // For melee attacks, prefer when close
        if (config.type === AttackPatternType.MELEE && distance > 150) {
          score -= 2;
        }

        // For ranged attacks, prefer when farther
        if (config.type === AttackPatternType.PROJECTILE && distance > 100) {
          score += 1;
        }
      }

      return { name, score };
    });

    // Sort by score and pick the best
    scoredAttacks.sort((a, b) => b.score - a.score);
    return scoredAttacks[0]?.name;
  }

  /**
   * Start executing an attack.
   * @param name Name of the attack to execute.
   * @param target Target player.
   * @returns True if the attack was started successfully.
   */
  executeAttack(name: string, target?: Player): boolean {
    const config = this.attacks.get(name);
    if (!config) {
      return false;
    }

    // Check if attack is on cooldown
    const now = Date.now();
    const cooldownUntil = this.cooldowns.get(name) ?? 0;
    if (now < cooldownUntil) {
      return false;
    }

    // Check if we need to face target
    if (config.needsFaceTarget !== false && target) {
      const direction = target.x > this.enemy.x ? 1 : -1;
      this.enemy.setFacing(direction);
    }

    // Check range
    if (target) {
      const distance = Phaser.Math.Distance.Between(
        this.enemy.x,
        this.enemy.y,
        target.x,
        target.y,
      );
      if (distance > config.range) {
        return false;
      }
    }

    // Start telegraph phase
    this.activeAttack = {
      config,
      isTelegraphing: true,
      isAttacking: false,
      timer: 0,
      damageTriggered: false,
    };

    // Emit telegraph event for visual effects
    this.enemy.scene.events.emit('enemy:attack-telegraph', {
      enemy: this.enemy,
      target,
      config,
    });

    // Create visual telegraph effect
    this.createTelegraphEffect(config, target);

    return true;
  }

  /**
   * Create visual telegraph effect for an attack.
   * @param config Attack configuration.
   * @param target Target player.
   */
  private createTelegraphEffect(config: AttackConfig, _target?: Player): void {
    const scene = this.enemy.scene;

    // Color based on attack danger
    let telegraphColor = 0xff0000; // Red for lethal attacks
    let alpha = 0.5;

    switch (config.type) {
    case AttackPatternType.MELEE:
      telegraphColor = 0xff6600;
      break;
    case AttackPatternType.CHARGE:
      telegraphColor = 0xff3300;
      alpha = 0.6;
      break;
    case AttackPatternType.PROJECTILE:
      telegraphColor = 0xffff00;
      alpha = 0.4;
      break;
    case AttackPatternType.AOE:
      telegraphColor = 0xff0000;
      alpha = 0.7;
      break;
    case AttackPatternType.TELEPORT:
      telegraphColor = 0x9900ff;
      break;
    case AttackPatternType.SUMMON:
      telegraphColor = 0x00ff66;
      break;
    }

    // Create telegraphic indicator
    const indicator = scene.add.graphics();

    if (config.type === AttackPatternType.PROJECTILE) {
      // Line indicator for projectile direction
      const direction = this.enemy.facing;
      const length = config.range;

      indicator.lineStyle(2, telegraphColor, alpha);
      indicator.beginPath();
      indicator.moveTo(this.enemy.x, this.enemy.y);
      indicator.lineTo(this.enemy.x + length * direction, this.enemy.y);
      indicator.strokePath();
    } else {
      // Circle or arc for other attacks
      indicator.fillStyle(telegraphColor, alpha);
      indicator.fillCircle(this.enemy.x, this.enemy.y, 20);
    }

    // Fade out effect during telegraph
    scene.tweens.add({
      targets: indicator,
      alpha: 0,
      duration: config.telegraphTime,
      ease: 'Sine.easeOut',
      onComplete: () => {
        indicator.destroy();
      },
    });
  }

  /**
   * Update attack state.
   * @param delta Time delta in milliseconds.
   * @returns True if an attack is currently executing.
   */
  update(delta: number): boolean {
    // Update active attack
    if (this.activeAttack) {
      return this.updateActiveAttack(delta);
    }

    return false;
  }

  /**
   * Update the currently active attack.
   * @param delta Time delta in milliseconds.
   * @returns True if an attack is executing.
   */
  private updateActiveAttack(delta: number): boolean {
    this.activeAttack!.timer += delta;

    const { config, timer, isTelegraphing } = this.activeAttack!;

    if (isTelegraphing) {
      // Telegraph phase
      if (timer >= config.telegraphTime) {
        // Transition to attack phase
        this.activeAttack!.isTelegraphing = false;
        this.activeAttack!.isAttacking = true;
        this.activeAttack!.timer = 0;

        // Emit attack start event
        this.enemy.scene.events.emit('enemy:attack-start', {
          enemy: this.enemy,
          config,
        });
      }
    } else {
      // Attack phase
      if (
        !this.activeAttack!.damageTriggered &&
        timer >= config.attackDuration * 0.5
      ) {
        // Trigger damage at midpoint of attack
        this.triggerAttackDamage();
        this.activeAttack!.damageTriggered = true;
      }

      if (timer >= config.attackDuration) {
        // Attack complete
        const attackName = this.getAttackNameByConfig(config);
        if (attackName) {
          // Set cooldown
          const now = Date.now();
          this.cooldowns.set(attackName, now + config.cooldown);
        }

        this.activeAttack = undefined;
        return false;
      }
    }

    return true;
  }

  /**
   * Trigger the actual damage/effect of the attack.
   */
  private triggerAttackDamage(): void {
    const { config } = this.activeAttack!;

    // Use custom attack function if provided
    if (config.customAttack) {
      const target = this.enemy['target'] as Player | undefined;
      config.customAttack(this.enemy, target!);
      return;
    }

    // Default attack behavior based on type
    const target = this.enemy['target'] as Player | undefined;
    if (!target) return;

    const distance = Phaser.Math.Distance.Between(
      this.enemy.x,
      this.enemy.y,
      target.x,
      target.y,
    );

    switch (config.type) {
    case AttackPatternType.MELEE:
    case AttackPatternType.CHARGE:
    case AttackPatternType.AOE:
      if (distance <= config.range) {
        target.takeDamage(config.damage);
      }
      break;

    case AttackPatternType.PROJECTILE:
      // Emit event for projectile creation
      this.enemy.scene.events.emit('enemy:projectile-fired', {
        enemy: this.enemy,
        target,
        damage: config.damage,
      });
      break;

    case AttackPatternType.SUMMON:
      // Emit event for summoning minions
      this.enemy.scene.events.emit('enemy:summon', {
        enemy: this.enemy,
        target,
      });
      break;

    case AttackPatternType.TELEPORT:
      // Teleport to a random position near target
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const teleportDistance = Phaser.Math.Between(50, 150);
      const newX = target.x + Math.cos(angle) * teleportDistance;
      const newY = target.y + Math.sin(angle) * teleportDistance;

      // Teleport effect
      this.enemy.scene.tweens.add({
        targets: this.enemy,
        scaleX: 0.1,
        scaleY: 0.1,
        alpha: 0.5,
        duration: 200,
        yoyo: true,
        onYoyo: () => {
          this.enemy.x = newX;
          this.enemy.y = newY;
        },
      });

      // Teleport to and attack
      setTimeout(() => {
        if (distance <= config.range) {
          target.takeDamage(config.damage);
        }
      }, 200); // Attack after appearing
      break;
    }

    // Emit damage event
    this.enemy.scene.events.emit('enemy:attack-hit', {
      enemy: this.enemy,
      target,
      damage: config.damage,
    });
  }

  /**
   * Get attack name by config.
   */
  private getAttackNameByConfig(config: AttackConfig): string | undefined {
    for (const [name, attackConfig] of this.attacks.entries()) {
      if (attackConfig === config) {
        return name;
      }
    }
    return undefined;
  }

  /**
   * Get the currently active attack.
   */
  getActiveAttack(): ActiveAttack | undefined {
    return this.activeAttack;
  }

  /**
   * Cancel the current attack.
   */
  cancelAttack(): void {
    this.activeAttack = undefined;
  }

  /**
   * Reset all cooldowns.
   */
  resetCooldowns(): void {
    this.cooldowns.clear();
  }

  /**
   * Clear all attacks.
   */
  clear(): void {
    this.attacks.clear();
    this.cooldowns.clear();
    this.activeAttack = undefined;
  }
}
