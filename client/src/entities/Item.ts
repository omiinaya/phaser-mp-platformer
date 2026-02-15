import 'phaser';
import { GameObject } from './GameObject';
import { Character } from './Character';

/**
 * Item type classification.
 */
export enum ItemType {
  Consumable = 'consumable',
  PowerUp = 'powerup',
  Key = 'key',
  Coin = 'coin',
  Gem = 'gem',
  Weapon = 'weapon',
  Armor = 'armor',
  Miscellaneous = 'misc',
}

export type GemType = 'red' | 'blue' | 'green' | 'purple' | 'yellow';

/**
 * Configuration for an item.
 */
export interface ItemConfig {
  /** Item type. */
  type: ItemType;
  /** Display name. */
  name: string;
  /** Description (optional). */
  description?: string;
  /** Effect value (e.g., heal amount, damage boost). */
  value?: number;
  /** Duration of effect in milliseconds (if applicable). */
  duration?: number;
  /** Whether the item respawns after being collected. */
  respawns?: boolean;
  /** Respawn time in milliseconds (if respawns is true). */
  respawnTime?: number;
  /** Sound key to play when collected. */
  collectSound?: string;
  /** Visual effect key to play when collected. */
  collectEffect?: string;
}

/**
 * Abstract base class for collectible items.
 * Extends GameObject with pickup detection, effects, and respawn logic.
 */
export abstract class Item extends GameObject {
  /** Item configuration. */
  public config: ItemConfig;

  /** Whether the item is currently active (visible/collectible). */
  public active: boolean;

  /** Timer for respawn. */
  private respawnTimer: number;

  /** Whether the item has been collected. */
  private collected: boolean;

  /**
   * Creates an instance of Item.
   * @param scene The scene this item belongs to.
   * @param x The x position.
   * @param y The y position.
   * @param texture The texture key.
   * @param config Item configuration.
   * @param frame The frame index (optional).
   */
  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    texture: string,
    config: ItemConfig,
    frame?: string | number,
  ) {
    super(scene, x, y, texture, frame);
    this.config = {
      respawns: false,
      respawnTime: 5000,
      ...config,
    };
    this.active = true;
    this.collected = false;
    this.respawnTimer = 0;

    // Enable physics for collision detection
    this.enablePhysics(true); // static body by default
  }

  /**
   * Update item state each frame.
   * @param delta Time delta in milliseconds.
   */
  public update(delta: number): void {
    super.update(delta);

    // Respawn logic
    if (this.collected && this.config.respawns) {
      this.respawnTimer -= delta;
      if (this.respawnTimer <= 0) {
        this.respawn();
      }
    }
  }

  /**
   * Called when a character collides with this item.
   * @param character The character that collided.
   */
  public onCollide(character: Character): void {
    if (!this.active || this.collected) return;

    // Apply effect
    this.applyEffect(character);

    // Mark as collected
    this.collected = true;
    this.active = false;
    this.setVisible(false);
    this.disablePhysics();

    // Play sound
    if (this.config.collectSound) {
      this.scene.sound.play(this.config.collectSound);
    }

    // Play visual effect
    if (this.config.collectEffect) {
      // Emit event for effect creation
      this.scene.events.emit('item:collected', {
        item: this,
        character,
        effect: this.config.collectEffect,
      });
    }

    // Schedule respawn if configured
    if (this.config.respawns) {
      this.respawnTimer = this.config.respawnTime!;
    } else {
      // Otherwise destroy after a short delay
      this.scene.time.delayedCall(100, () => this.destroy());
    }
  }

  /**
   * Apply the item's effect to the character.
   * Override in subclasses for specific effects.
   * @param character The character receiving the effect.
   */
  protected abstract applyEffect(character: Character): void;

  /**
   * Respawn the item after timer expires.
   */
  protected respawn(): void {
    this.collected = false;
    this.active = true;
    this.setVisible(true);
    this.enablePhysics(true);
    // Optional respawn animation
  }

  /**
   * Get whether the item is collectible.
   */
  public isCollectible(): boolean {
    return this.active && !this.collected;
  }

  /**
   * Force collect (e.g., for debugging).
   */
  public collect(character: Character): void {
    this.onCollide(character);
  }
}

/**
 * Concrete item: Health Potion.
 */
export class HealthPotion extends Item {
  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    config?: Partial<ItemConfig>,
  ) {
    super(scene, x, y, 'health_potion', {
      type: ItemType.Consumable,
      name: 'Health Potion',
      description: 'Restores 20 health.',
      value: 20,
      ...config,
    });
  }

  protected applyEffect(character: Character): void {
    character.heal(this.config.value!);
  }
}

/**
 * Concrete item: Coin.
 */
export class Coin extends Item {
  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    config?: Partial<ItemConfig>,
  ) {
    super(scene, x, y, 'coin', {
      type: ItemType.Coin,
      name: 'Coin',
      description: 'Currency for purchasing items.',
      value: 1,
      respawns: false,
      ...config,
    });
  }

  protected applyEffect(character: Character): void {
    // Increase player's coin count (assuming character has inventory)
    // Emit event for currency increase
    this.scene.events.emit('currency:add', {
      amount: this.config.value,
      character,
    });
  }
}

/**
 * Concrete item: Speed Boost Power‑Up.
 */
export class SpeedBoost extends Item {
  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    config?: Partial<ItemConfig>,
  ) {
    super(scene, x, y, 'speed_boost', {
      type: ItemType.PowerUp,
      name: 'Speed Boost',
      description: 'Increases movement speed for 10 seconds.',
      value: 1.5, // multiplier
      duration: 10000,
      respawns: true,
      respawnTime: 30000,
      ...config,
    });
  }

  protected applyEffect(character: Character): void {
    const originalSpeed = character.moveSpeed;
    const boostedSpeed = originalSpeed * this.config.value!;
    character.moveSpeed = boostedSpeed;

    // Schedule revert after duration
    this.scene.time.delayedCall(this.config.duration!, () => {
      character.moveSpeed = originalSpeed;
    });
  }
}

/**
 * Concrete item: Key.
 */
export class Key extends Item {
  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    config?: Partial<ItemConfig>,
  ) {
    super(scene, x, y, 'key', {
      type: ItemType.Key,
      name: 'Key',
      description: 'Unlocks doors.',
      respawns: false,
      ...config,
    });
  }

  protected applyEffect(character: Character): void {
    // Add key to character's inventory
    this.scene.events.emit('key:collected', {
      character,
      keyId: this.config.name,
    });
  }
}

/**
 * Base class for gems - valuable collectibles with different colors and rarities.
 */
export abstract class Gem extends Item {
  protected gemType: GemType;
  protected rarity: number;
  protected isSecret: boolean;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    gemType: GemType,
    texture: string,
    config?: Partial<ItemConfig> & { isSecret?: boolean },
  ) {
    const baseValue = getGemBaseValue(gemType);
    const rarity = getGemRarity(gemType);

    super(scene, x, y, texture, {
      type: ItemType.Gem,
      name: `${gemType.charAt(0).toUpperCase() + gemType.slice(1)} Gem`,
      description: `A precious gem worth ${baseValue} points.`,
      value: baseValue,
      respawns: false,
      ...config,
    });

    this.gemType = gemType;
    this.rarity = rarity;
    this.isSecret = config?.isSecret ?? false;

    if (this.isSecret) {
      this.config.description += ' (Secret!)';
      this.alpha = 0.6;
    }

    this.setupGemAnimation();
  }

  protected setupGemAnimation(): void {
    // Floating animation
    this.scene.tweens.add({
      targets: this,
      y: this.y - 5,
      duration: 1200 - this.rarity * 200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Rotation animation
    this.scene.tweens.add({
      targets: this,
      angle: 360,
      duration: 4000 - this.rarity * 500,
      repeat: -1,
      ease: 'Linear',
    });

    // Pulsing glow for secret gems
    if (this.isSecret) {
      this.scene.tweens.add({
        targets: this,
        alpha: 0.4,
        duration: 800,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
  }

  protected applyEffect(character: Character): void {
    // Calculate total value including rarity multiplier
    const totalValue = this.config.value! * (1 + this.rarity * 0.5);

    this.scene.events.emit('gem:collected', {
      gemType: this.gemType,
      rarity: this.rarity,
      value: totalValue,
      isSecret: this.isSecret,
      character,
    });

    if (this.isSecret) {
      this.scene.events.emit('gem:secret-discovered', {
        gemType: this.gemType,
        character,
      });
    }
  }
}

/**
 * Red Gem - Common rarity, medium value.
 */
export class RedGem extends Gem {
  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    config?: Partial<ItemConfig> & { isSecret?: boolean },
  ) {
    super(scene, x, y, 'red', 'gem_red', config);
  }
}

/**
 * Blue Gem - Uncommon rarity, higher value.
 */
export class BlueGem extends Gem {
  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    config?: Partial<ItemConfig> & { isSecret?: boolean },
  ) {
    super(scene, x, y, 'blue', 'gem_blue', config);
  }
}

/**
 * Green Gem - Rare rarity, high value.
 */
export class GreenGem extends Gem {
  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    config?: Partial<ItemConfig> & { isSecret?: boolean },
  ) {
    super(scene, x, y, 'green', 'gem_green', config);
  }
}

/**
 * Purple Gem - Epic rarity, very high value.
 */
export class PurpleGem extends Gem {
  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    config?: Partial<ItemConfig> & { isSecret?: boolean },
  ) {
    super(scene, x, y, 'purple', 'gem_purple', config);
  }
}

/**
 * Yellow Gem - Legendary rarity, maximum value.
 */
export class YellowGem extends Gem {
  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    config?: Partial<ItemConfig> & { isSecret?: boolean },
  ) {
    super(scene, x, y, 'yellow', 'gem_yellow', config);
  }
}

/**
 * Helper function to get base value for a gem type.
 */
function getGemBaseValue(gemType: GemType): number {
  switch (gemType) {
  case 'red':
    return 50;
  case 'blue':
    return 100;
  case 'green':
    return 200;
  case 'purple':
    return 500;
  case 'yellow':
    return 1000;
  default:
    return 50;
  }
}

/**
 * Helper function to get rarity value for a gem type (0-4).
 */
function getGemRarity(gemType: GemType): number {
  switch (gemType) {
  case 'red':
    return 0;
  case 'blue':
    return 1;
  case 'green':
    return 2;
  case 'purple':
    return 3;
  case 'yellow':
    return 4;
  default:
    return 0;
  }
}
