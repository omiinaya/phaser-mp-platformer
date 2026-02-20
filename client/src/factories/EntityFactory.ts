import 'phaser';
import { GameObject } from '../entities/GameObject';
import { Player, PlayerConfig } from '../entities/Player';
import {
  Enemy,
  EnemyAIConfig,
  Slime,
  FlyingEnemy,
  Archer,
} from '../entities/Enemy';
import {
  ItemConfig,
  HealthPotion,
  Coin,
  SpeedBoost,
  Key,
  Gem,
  RedGem,
  BlueGem,
  GreenGem,
  PurpleGem,
  YellowGem,
  GemType,
} from '../entities/Item';
import {
  Skill,
  SkillConfig,
  DashSkill,
  FireballSkill,
  HealSkill,
} from '../entities/Skill';
import {
  Platform,
  PlatformConfig,
  PlatformMovement,
} from '../entities/Platform';
import {
  PowerUpManager,
  DoubleJumpPowerUp,
  ShieldPowerUp,
  SpeedBoostPowerUp,
  HealthBoostPowerUp,
  DamageBoostPowerUp,
} from '../entities/PowerUp';

/**
 * Factory configuration for creating game entities.
 */
export interface EntityFactoryConfig {
  /** Default texture keys for each entity type. */
  textures?: {
    player?: string;
    slime?: string;
    flying?: string;
    archer?: string;
    healthPotion?: string;
    coin?: string;
    speedBoost?: string;
    key?: string;
    platform?: string;
  };
  /** Default physics manager (optional). */
  physicsManager?: any;
}

/**
 * Centralized factory for creating game entities.
 * Simplifies instantiation and configuration.
 */
export class EntityFactory {
  private scene: Phaser.Scene;
  private config: EntityFactoryConfig;

  /**
   * Creates an instance of EntityFactory.
   * @param scene The scene where entities will be added.
   * @param config Factory configuration.
   */
  constructor(scene: Phaser.Scene, config: EntityFactoryConfig = {}) {
    this.scene = scene;
    this.config = {
      textures: {
        player: 'player',
        slime: 'slime',
        flying: 'flying',
        archer: 'archer',
        healthPotion: 'health_potion',
        coin: 'coin',
        speedBoost: 'speed_boost',
        key: 'key',
        platform: 'platform',
      },
      ...config,
    };
  }

  /**
   * Create a player.
   * @param x X position.
   * @param y Y position.
   * @param config Player configuration.
   * @returns The created player instance.
   */
  public createPlayer(
    x: number,
    y: number,
    config?: Partial<PlayerConfig>,
  ): Player {
    const texture = this.config.textures!.player!;
    const player = new Player(this.scene, x, y, texture, config);
    this.scene.add.existing(player);
    return player;
  }

  /**
   * Create a slime enemy.
   * @param x X position.
   * @param y Y position.
   * @param config Enemy AI configuration.
   * @returns The created slime instance.
   */
  public createSlime(x: number, y: number, config?: EnemyAIConfig): Slime {
    const slime = new Slime(this.scene, x, y, config);
    this.scene.add.existing(slime);
    return slime;
  }

  /**
   * Create a flying enemy.
   * @param x X position.
   * @param y Y position.
   * @param config Enemy AI configuration.
   * @returns The created flying enemy instance.
   */
  public createFlyingEnemy(
    x: number,
    y: number,
    config?: EnemyAIConfig,
  ): FlyingEnemy {
    const enemy = new FlyingEnemy(this.scene, x, y, config);
    this.scene.add.existing(enemy);
    return enemy;
  }

  /**
   * Create an archer enemy.
   * @param x X position.
   * @param y Y position.
   * @param config Enemy AI configuration.
   * @returns The created archer instance.
   */
  public createArcher(x: number, y: number, config?: EnemyAIConfig): Archer {
    const archer = new Archer(this.scene, x, y, config);
    this.scene.add.existing(archer);
    return archer;
  }

  /**
   * Create a generic enemy (defaults to slime).
   * @param type Enemy type ('slime' | 'flying' | 'archer').
   * @param x X position.
   * @param y Y position.
   * @param config Enemy AI configuration.
   */
  public createEnemy(
    type: 'slime' | 'flying' | 'archer',
    x: number,
    y: number,
    config?: EnemyAIConfig,
  ): Enemy {
    switch (type) {
    case 'slime':
      return this.createSlime(x, y, config);
    case 'flying':
      return this.createFlyingEnemy(x, y, config);
    case 'archer':
      return this.createArcher(x, y, config);
    default:
      return this.createSlime(x, y, config);
    }
  }

  /**
   * Create a health potion item.
   * @param x X position.
   * @param y Y position.
   * @param config Item configuration overrides.
   * @returns The created health potion.
   */
  public createHealthPotion(
    x: number,
    y: number,
    config?: Partial<ItemConfig>,
  ): HealthPotion {
    const texture = this.config.textures!.healthPotion!;
    const potion = new HealthPotion(this.scene, x, y, {
      ...config,
    });
    potion.setTexture(texture);
    this.scene.add.existing(potion);
    return potion;
  }

  /**
   * Create a coin item.
   * @param x X position.
   * @param y Y position.
   * @param config Item configuration overrides.
   * @returns The created coin.
   */
  public createCoin(x: number, y: number, config?: Partial<ItemConfig>): Coin {
    const texture = this.config.textures!.coin!;
    const coin = new Coin(this.scene, x, y, {
      ...config,
    });
    coin.setTexture(texture);
    this.scene.add.existing(coin);
    return coin;
  }

  /**
   * Create a speed boost item.
   * @param x X position.
   * @param y Y position.
   * @param config Item configuration overrides.
   * @returns The created speed boost.
   */
  public createSpeedBoost(
    x: number,
    y: number,
    config?: Partial<ItemConfig>,
  ): SpeedBoost {
    const texture = this.config.textures!.speedBoost!;
    const boost = new SpeedBoost(this.scene, x, y, {
      ...config,
    });
    boost.setTexture(texture);
    this.scene.add.existing(boost);
    return boost;
  }

  /**
   * Create a key item.
   * @param x X position.
   * @param y Y position.
   * @param config Item configuration overrides.
   * @returns The created key.
   */
  public createKey(x: number, y: number, config?: Partial<ItemConfig>): Key {
    const texture = this.config.textures!.key!;
    const key = new Key(this.scene, x, y, {
      ...config,
    });
    key.setTexture(texture);
    this.scene.add.existing(key);
    return key;
  }

  /**
   * Create a platform.
   * @param x X position.
   * @param y Y position.
   * @param config Platform configuration.
   * @returns The created platform.
   */
  public createPlatform(
    x: number,
    y: number,
    config?: PlatformConfig,
  ): Platform {
    const texture = this.config.textures!.platform!;
    const platform = new Platform(this.scene, x, y, texture, config);
    this.scene.add.existing(platform);
    return platform;
  }

  /**
   * Create a moving horizontal platform.
   * @param x X position.
   * @param y Y position.
   * @param distance Travel distance.
   * @param speed Movement speed.
   * @param config Additional platform configuration.
   */
  public createMovingHorizontalPlatform(
    x: number,
    y: number,
    distance: number,
    speed: number,
    config?: PlatformConfig,
  ): Platform {
    return this.createPlatform(x, y, {
      movement: PlatformMovement.Horizontal,
      travelDistance: distance,
      speed,
      ...config,
    });
  }

  /**
   * Create a moving vertical platform.
   * @param x X position.
   * @param y Y position.
   * @param distance Travel distance.
   * @param speed Movement speed.
   * @param config Additional platform configuration.
   */
  public createMovingVerticalPlatform(
    x: number,
    y: number,
    distance: number,
    speed: number,
    config?: PlatformConfig,
  ): Platform {
    return this.createPlatform(x, y, {
      movement: PlatformMovement.Vertical,
      travelDistance: distance,
      speed,
      ...config,
    });
  }

  /**
   * Create a skill instance.
   * @param skillId Predefined skill ID ('dash', 'fireball', 'heal') or custom config.
   * @param config Override configuration.
   */
  public createSkill(
    skillId: 'dash' | 'fireball' | 'heal' | SkillConfig,
    config?: Partial<SkillConfig>,
  ): Skill {
    let skillConfig: SkillConfig;
    if (typeof skillId === 'string') {
      const base = this.getBaseSkillConfig(skillId);
      skillConfig = { ...base, ...config };
    } else {
      skillConfig = skillId;
    }
    switch (skillConfig.id) {
    case 'dash':
      return new DashSkill(skillConfig);
    case 'fireball':
      return new FireballSkill(skillConfig);
    case 'heal':
      return new HealSkill(skillConfig);
    default:
      throw new Error(`Unknown skill ID: ${skillConfig.id}`);
    }
  }

  /**
   * Get base configuration for a predefined skill.
   * @param skillId Skill identifier.
   */
  private getBaseSkillConfig(skillId: string): SkillConfig {
    switch (skillId) {
    case 'dash':
      return {
        id: 'dash',
        name: 'Dash',
        cooldown: 2000,
        cost: 10,
        target: 'directional' as any,
      };
    case 'fireball':
      return {
        id: 'fireball',
        name: 'Fireball',
        cooldown: 3000,
        cost: 20,
        target: 'projectile' as any,
      };
    case 'heal':
      return {
        id: 'heal',
        name: 'Heal',
        cooldown: 5000,
        cost: 30,
        target: 'target' as any,
      };
    default:
      throw new Error(`Unknown skill ID: ${skillId}`);
    }
  }

  /**
   * Create a group of entities (e.g., a coin cluster).
   * @param count Number of entities.
   * @param creator Function that creates an entity given an index.
   * @returns Array of created entities.
   */
  public createGroup<T extends GameObject>(
    count: number,
    creator: (index: number) => T,
  ): T[] {
    const group: T[] = [];
    for (let i = 0; i < count; i++) {
      group.push(creator(i));
    }
    return group;
  }

  /**
   * Create a double jump power-up.
   * @param powerUpManager PowerUpManager instance.
   * @param x X position.
   * @param y Y position.
   * @param duration Effect duration in milliseconds.
   * @returns The created power-up.
   */
  public createDoubleJumpPowerUp(
    powerUpManager: PowerUpManager,
    x: number,
    y: number,
    duration: number = 10000,
  ): DoubleJumpPowerUp {
    const powerUp = new DoubleJumpPowerUp(
      this.scene,
      x,
      y,
      powerUpManager,
      duration,
    );
    return powerUp;
  }

  /**
   * Create a shield power-up.
   * @param powerUpManager PowerUpManager instance.
   * @param x X position.
   * @param y Y position.
   * @param duration Effect duration in milliseconds.
   * @returns The created power-up.
   */
  public createShieldPowerUp(
    powerUpManager: PowerUpManager,
    x: number,
    y: number,
    duration: number = 8000,
  ): ShieldPowerUp {
    const powerUp = new ShieldPowerUp(
      this.scene,
      x,
      y,
      powerUpManager,
      duration,
    );
    return powerUp;
  }

  /**
   * Create a speed boost power-up.
   * @param powerUpManager PowerUpManager instance.
   * @param x X position.
   * @param y Y position.
   * @param duration Effect duration in milliseconds.
   * @param multiplier Speed multiplier.
   * @returns The created power-up.
   */
  public createSpeedBoostPowerUp(
    powerUpManager: PowerUpManager,
    x: number,
    y: number,
    duration: number = 6000,
    multiplier: number = 1.5,
  ): SpeedBoostPowerUp {
    const powerUp = new SpeedBoostPowerUp(
      this.scene,
      x,
      y,
      powerUpManager,
      duration,
      multiplier,
    );
    return powerUp;
  }

  /**
   * Create a health boost power-up (instant heal).
   * @param powerUpManager PowerUpManager instance.
   * @param x X position.
   * @param y Y position.
   * @param healAmount Amount of health to restore.
   * @returns The created power-up.
   */
  public createHealthBoostPowerUp(
    powerUpManager: PowerUpManager,
    x: number,
    y: number,
    healAmount: number = 5,
  ): HealthBoostPowerUp {
    const powerUp = new HealthBoostPowerUp(
      this.scene,
      x,
      y,
      powerUpManager,
      healAmount,
    );
    return powerUp;
  }

  /**
   * Create a damage boost power-up.
   * @param powerUpManager PowerUpManager instance.
   * @param x X position.
   * @param y Y position.
   * @param duration Effect duration in milliseconds.
   * @param multiplier Damage multiplier.
   * @returns The created power-up.
   */
  public createDamageBoostPowerUp(
    powerUpManager: PowerUpManager,
    x: number,
    y: number,
    duration: number = 10000,
    multiplier: number = 2,
  ): DamageBoostPowerUp {
    const powerUp = new DamageBoostPowerUp(
      this.scene,
      x,
      y,
      powerUpManager,
      duration,
      multiplier,
    );
    return powerUp;
  }

  /**
   * Create a gem by type.
   * @param gemType Type of gem to create.
   * @param x X position.
   * @param y Y position.
   * @param config Additional item configuration.
   * @returns The created gem.
   */
  public createGem(
    gemType: GemType,
    x: number,
    y: number,
    config?: Partial<ItemConfig> & { isSecret?: boolean },
  ): Gem {
    switch (gemType) {
    case 'red':
      return new RedGem(this.scene, x, y, config);
    case 'blue':
      return new BlueGem(this.scene, x, y, config);
    case 'green':
      return new GreenGem(this.scene, x, y, config);
    case 'purple':
      return new PurpleGem(this.scene, x, y, config);
    case 'yellow':
      return new YellowGem(this.scene, x, y, config);
    default:
      return new RedGem(this.scene, x, y, config);
    }
  }

  /**
   * Create a red gem (common rarity).
   */
  public createRedGem(
    x: number,
    y: number,
    config?: Partial<ItemConfig> & { isSecret?: boolean },
  ): RedGem {
    return new RedGem(this.scene, x, y, config);
  }

  /**
   * Create a blue gem (uncommon rarity).
   */
  public createBlueGem(
    x: number,
    y: number,
    config?: Partial<ItemConfig> & { isSecret?: boolean },
  ): BlueGem {
    return new BlueGem(this.scene, x, y, config);
  }

  /**
   * Create a green gem (rare rarity).
   */
  public createGreenGem(
    x: number,
    y: number,
    config?: Partial<ItemConfig> & { isSecret?: boolean },
  ): GreenGem {
    return new GreenGem(this.scene, x, y, config);
  }

  /**
   * Create a purple gem (epic rarity).
   */
  public createPurpleGem(
    x: number,
    y: number,
    config?: Partial<ItemConfig> & { isSecret?: boolean },
  ): PurpleGem {
    return new PurpleGem(this.scene, x, y, config);
  }

  /**
   * Create a yellow gem (legendary rarity).
   */
  public createYellowGem(
    x: number,
    y: number,
    config?: Partial<ItemConfig> & { isSecret?: boolean },
  ): YellowGem {
    return new YellowGem(this.scene, x, y, config);
  }
}
