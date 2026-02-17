import { logger } from '../utils/logger';
import 'phaser';
import { Character } from './Character';
import { InputManager } from '../core/InputManager';
import {
  AnimationManager,
  AnimationStateMachine,
} from '../core/AnimationManager';
import { Inventory } from './Inventory';
import { Item } from './Item';

/**
 * Player-specific configuration.
 */
export interface PlayerConfig {
  /** Player's session ID for multiplayer synchronization. */
  sessionId?: string;
  /** Player's display name. */
  name?: string;
  /** Initial health. */
  health?: number;
  /** Movement speed. */
  moveSpeed?: number;
  /** Jump force. */
  jumpForce?: number;
  /** Input actions mapping (optional). */
  inputActions?: Array<{ id: string; keys: string[] }>;
  /** Animation manager for sprite animations. */
  animationManager?: AnimationManager;
}

/**
 * Concrete player class.
 * Extends Character and adds input handling, animation states, and multiplayer sync.
 */
export class Player extends Character {
  /** Player's session ID (for multiplayer). */
  public sessionId: string;

  /** Player's display name. */
  public name: string;

  /** Reference to InputManager for handling controls. */
  private inputManager?: InputManager;

  /** Animation manager for sprite animations. */
  private animationManager?: AnimationManager;

  /** Animation state machine. */
  private animationStateMachine: AnimationStateMachine;

  /** Current animation state. */
  private animationState:
    | 'idle'
    | 'walking'
    | 'jumping'
    | 'falling'
    | 'attacking';

  /** Whether the player is currently attacking. */
  private isAttacking: boolean;

  /** Combo system */
  private comboCount: number = 0;
  private comboMultiplier: number = 1.0;
  private comboTimer: number = 0;
  private comboDecayTime: number = 2000;
  private maxComboMultiplier: number = 3.0;

  /** Parry/Block system */
  private isParrying: boolean = false;
  private parryWindow: number = 200;
  private parryCooldown: number = 1000;
  private parryCooldownTimer: number = 0;
  private parryStartTime: number = 0;
  private perfectParryWindow: number = 50;
  private wasPerfectParry: boolean = false;
  private shieldSprite?: Phaser.GameObjects.Sprite;

  /** Cooldown timer for attack (ms). */
  private attackCooldown: number;

  /** Time since last attack (ms). */
  private attackTimer: number;

  /** Inventory slot count (simplified). */
  public inventorySize: number;

  /** Equipped skill IDs. */
  public equippedSkills: string[];

  /** Whether animations are initialized. */
  private animationsInitialized: boolean = false;

  /** Player inventory for managing collected items. */
  public inventory: Inventory;

  /**
   * Creates an instance of Player.
   * @param scene The scene this player belongs to.
   * @param x The x position.
   * @param y The y position.
   * @param texture The texture key.
   * @param config Player configuration.
   * @param frame The frame index (optional).
   */
  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    texture: string,
    config: PlayerConfig = {},
    frame?: string | number,
  ) {
    super(scene, x, y, texture, frame);
    this.sessionId = config.sessionId || 'local';
    this.name = config.name || 'Player';
    this.health = config.health ?? 10;
    this.maxHealth = this.health;
    this.moveSpeed = config.moveSpeed ?? 250;
    this.jumpForce = config.jumpForce ?? 450;
    this.animationState = 'idle';
    this.isAttacking = false;
    this.attackCooldown = 500; // half second
    this.attackTimer = 0;
    this.inventorySize = 10;
    this.equippedSkills = [];
    this.animationManager = config.animationManager;

    // Initialize combo system
    this.comboCount = 0;
    this.comboMultiplier = 1.0;
    this.comboTimer = 0;
    this.maxComboMultiplier = 3.0;

    // Initialize parry system
    this.isParrying = false;
    this.parryCooldownTimer = 0;
    this.wasPerfectParry = false;

    // Initialize animation state machine
    this.animationStateMachine = new AnimationStateMachine();
    this.setupAnimationStates();

    // Initialize inventory
    this.inventory = new Inventory(scene, this.inventorySize);

    // Enable physics by default
    this.enablePhysics();
  }

  /**
   * Setup animation states and transitions.
   */
  private setupAnimationStates(): void {
    // Define all animation states
    this.animationStateMachine.addState(
      'idle',
      'player_idle',
      ['walk', 'jump', 'fall', 'attack'],
      () => this.onAnimationEnter('idle'),
      () => this.onAnimationExit('idle'),
    );

    this.animationStateMachine.addState(
      'walk',
      'player_walk',
      ['idle', 'jump', 'fall', 'attack'],
      () => this.onAnimationEnter('walk'),
      () => this.onAnimationExit('walk'),
    );

    this.animationStateMachine.addState(
      'jump',
      'player_jump',
      ['fall', 'idle', 'walk'],
      () => this.onAnimationEnter('jump'),
      () => this.onAnimationExit('jump'),
    );

    this.animationStateMachine.addState(
      'fall',
      'player_fall',
      ['idle', 'walk', 'jump'],
      () => this.onAnimationEnter('fall'),
      () => this.onAnimationExit('fall'),
    );

    this.animationStateMachine.addState(
      'attack',
      'player_attack',
      ['idle', 'walk'],
      () => this.onAnimationEnter('attack'),
      () => this.onAnimationExit('attack'),
    );
  }

  /**
   * Initialize animations (call once after sprite sheet is loaded).
   */
  public initializeAnimations(): void {
    if (this.animationsInitialized) return;

    // Create animations from player sprite sheet
    if (this.animationManager) {
      this.animationManager.createAnimationsFromSheet('player', [
        { name: 'idle', start: 0, end: 7, frameRate: 8, repeat: -1 },
        { name: 'walk', start: 8, end: 15, frameRate: 12, repeat: -1 },
        { name: 'jump', start: 16, end: 19, frameRate: 10, repeat: 0 },
        { name: 'attack', start: 20, end: 25, frameRate: 15, repeat: 0 },
      ]);
    }

    this.animationsInitialized = true;
  }

  /**
   * Callback when entering an animation state.
   */
  private onAnimationEnter(state: string): void {
    // Could trigger effects, sounds, etc.
    if (state === 'jump') {
      // Play jump sound
      this.scene.events.emit('player:jump', { player: this });
    }
  }

  /**
   * Callback when exiting an animation state.
   */
  private onAnimationExit(_state: string): void {
    // Cleanup if needed
  }

  /**
   * Bind an InputManager to this player for control.
   * @param inputManager The InputManager instance.
   */
  public bindInputManager(inputManager: InputManager): void {
    this.inputManager = inputManager;
  }

  /**
   * Update player state each frame.
   * @param delta Time delta in milliseconds.
   */
  public update(delta: number): void {
    super.update(delta);

    // Initialize animations on first update
    if (!this.animationsInitialized) {
      this.initializeAnimations();
    }

    // Update attack timer
    if (this.isAttacking) {
      this.attackTimer += delta;
      if (this.attackTimer >= this.attackCooldown) {
        this.isAttacking = false;
      }
    }

    // Update combo decay timer
    this.updateCombo(delta);

    // Update parry cooldown timer
    if (this.parryCooldownTimer > 0) {
      this.parryCooldownTimer -= delta;
    }

    // Check parry window expiration
    if (this.isParrying) {
      const now = Date.now();
      if (now - this.parryStartTime > this.parryWindow) {
        this.endParry();
      }
    }

    // Handle input if InputManager is bound
    if (this.inputManager) {
      this.handleInput();
    }

    // Update animation based on state
    this.updateAnimation();
  }

  /**
   * Handle player input.
   */
  private handleInput(): void {
    if (!this.inputManager) return;

    // Horizontal movement
    let direction = 0;
    if (this.inputManager.isActionActive('left')) {
      direction -= 1;
    }
    if (this.inputManager.isActionActive('right')) {
      direction += 1;
    }
    this.move(direction);

    // Jump
    if (this.inputManager.isActionActive('jump')) {
      this.jump();
    }

    // Attack
    if (this.inputManager.isActionActive('attack') && !this.isAttacking) {
      this.attack();
    }

    // Parry
    if (this.inputManager.isActionActive('parry') && !this.isParrying) {
      this.parry();
    }

    // Optional: other actions (crouch, dash, etc.)
  }

  /**
   * Perform a jump.
   */
  public jump(): void {
    if (this.isOnGround) {
      super.jump();
      // Transition to jump animation
      this.animationStateMachine.transition('jump');
    }
  }

  /**
   * Perform a parry/block action.
   * Creates a temporary shield effect and reduces incoming damage.
   */
  public parry(): void {
    if (this.isParrying || this.parryCooldownTimer > 0) return;

    this.isParrying = true;
    this.parryStartTime = Date.now();
    this.parryCooldownTimer = this.parryCooldown;
    this.wasPerfectParry = false;

    // Create visual shield effect
    this.createShieldEffect();

    // Emit parry event
    this.scene.events.emit('player:parry', { player: this });

    // Schedule parry end
    this.scene.time.delayedCall(this.parryWindow, () => {
      this.endParry();
    });
  }

  /**
   * Create visual shield effect during parry.
   */
  private createShieldEffect(): void {
    if (this.shieldSprite) return;

    this.shieldSprite = this.scene.add.sprite(
      this.x,
      this.y,
      'shield',
    ) as Phaser.GameObjects.Sprite;
    this.shieldSprite.setTint(0x4caf50);
    this.shieldSprite.setAlpha(0.6);

    // Animate shield scale and rotation
    this.scene.tweens.add({
      targets: this.shieldSprite,
      scaleX: 1.2,
      scaleY: 1.2,
      angle: 360,
      duration: this.parryWindow,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        if (this.shieldSprite) {
          this.shieldSprite.destroy();
          this.shieldSprite = undefined;
        }
      },
    });
  }

  /**
   * End parry window and cleanup.
   */
  private endParry(): void {
    this.isParrying = false;

    if (this.shieldSprite) {
      this.shieldSprite.destroy();
      this.shieldSprite = undefined;
    }

    // Emit parry end event
    this.scene.events.emit('player:parry-end', { player: this });
  }

  /**
   * Check if player successfully perfect parried an attack.
   * @returns True if the parry was within the perfect window.
   */
  public checkPerfectParry(): boolean {
    if (!this.isParrying) return false;

    const timeSinceParryStart = Date.now() - this.parryStartTime;
    if (timeSinceParryStart <= this.perfectParryWindow) {
      this.wasPerfectParry = true;

      // Perfect parry bonus effects
      this.scene.events.emit('player:perfect-parry', { player: this });

      // Visual feedback
      this.scene.tweens.add({
        targets: this,
        tint: 0xffff00,
        duration: 100,
        yoyo: true,
        hold: 100,
        onYoyo: () => {
          this.clearTint();
        },
      });

      return true;
    }
    return false;
  }

  /**
   * Get current parry state.
   */
  public isParryActive(): boolean {
    return this.isParrying;
  }

  /**
   * Get remaining parry cooldown time (ms).
   */
  public getParryCooldownRemaining(): number {
    return Math.max(0, this.parryCooldownTimer);
  }

  /**
   * Perform an attack.
   */
  public attack(): void {
    if (this.isAttacking) return;
    this.isAttacking = true;
    this.attackTimer = 0;

    // Transition to attack animation
    const result = this.animationStateMachine.transition('attack');
    if (result.success && this.animationManager) {
      this.animationManager.playOnce(
        this as unknown as Phaser.GameObjects.Sprite,
        result.animation,
        () => {
          this.isAttacking = false;
          // Return to idle after attack
          this.animationStateMachine.transition('idle');
        },
      );
    }

    // Emit attack event with combo data
    this.scene.events.emit('player:attack', {
      player: this,
      comboCount: this.comboCount,
      comboMultiplier: this.comboMultiplier,
      attackDamage: this.getAttackDamage(),
    });
  }

  /**
   * Update animation based on current state.
   */
  protected updateAnimation(): void {
    // Don't interrupt attack animation
    if (this.isAttacking) return;

    let newState: 'idle' | 'walking' | 'jumping' | 'falling' = 'idle';

    if (!this.isOnGround) {
      newState = this.velocity.y < 0 ? 'jumping' : 'falling';
    } else if (Math.abs(this.velocity.x) > 10) {
      newState = 'walking';
    } else {
      newState = 'idle';
    }

    // Only transition if state changed
    if (newState !== this.animationState) {
      this.animationState = newState;

      // Map state names to animation state machine states
      const stateMap: Record<string, string> = {
        idle: 'idle',
        walking: 'walk',
        jumping: 'jump',
        falling: 'fall',
      };

      const targetState = stateMap[newState];
      if (targetState) {
        const result = this.animationStateMachine.transition(targetState);
        if (result.success && this.animationManager) {
          this.animationManager.play(
            this as unknown as Phaser.GameObjects.Sprite,
            result.animation,
            true, // Don't restart if already playing
          );
        }
      }
    }

    // Flip sprite based on facing direction
    this.flipX = this.facing === -1;
  }

  /**
   * Play a specific animation.
   */
  public playAnimation(
    animationKey: string,
    ignoreIfPlaying: boolean = true,
  ): boolean {
    if (!this.animationManager) return false;

    return this.animationManager.play(
      this as unknown as Phaser.GameObjects.Sprite,
      animationKey,
      ignoreIfPlaying,
    );
  }

  /**
   * Check if an animation is currently playing.
   */
  public isAnimationPlaying(animationKey?: string): boolean {
    if (!this.animationManager) return false;

    return this.animationManager.isPlaying(
      this as unknown as Phaser.GameObjects.Sprite,
      animationKey,
    );
  }

  /**
   * Increment combo counter on successful hit/kill
   * @param hits Number of enemies hit in this attack
   */
  public incrementCombo(hits: number = 1): void {
    this.comboCount += hits;
    this.comboTimer = 0;
    this.recalculateMultiplier();
  }

  /**
   * Reset combo (on getting hit or missing)
   */
  public resetCombo(): void {
    this.comboCount = 0;
    this.comboMultiplier = 1.0;
    this.comboTimer = 0;
  }

  /**
   * Recalculate combo multiplier based on combo count
   */
  private recalculateMultiplier(): void {
    if (this.comboCount > 0) {
      this.comboMultiplier = Math.min(
        1.0 + this.comboCount * 0.2,
        this.maxComboMultiplier,
      );
    } else {
      this.comboMultiplier = 1.0;
    }
  }

  /**
   * Get current combo multiplier
   */
  public getComboMultiplier(): number {
    return this.comboMultiplier;
  }

  /**
   * Get current combo count
   */
  public getComboCount(): number {
    return this.comboCount;
  }

  /**
   * Update combo decay timer
   */
  public updateCombo(delta: number): void {
    if (this.comboCount > 0) {
      this.comboTimer += delta;

      if (this.comboTimer >= this.comboDecayTime) {
        this.resetCombo();
      }
    }
  }

  /**
   * Deal attack damage with combo multiplier applied
   * @param baseDamage Base damage value
   * @returns Total damage with combo applied
   */
  public getAttackDamage(baseDamage: number = 1): number {
    return Math.ceil(baseDamage * this.comboMultiplier);
  }

  /**
   * Called when enemy is successfully hit by player attack
   * Increments combo and emits combo event
   */
  public onEnemyHit(): void {
    const prevCount = this.comboCount;
    this.incrementCombo(1);
    this.scene.events.emit('player:combo-changed', {
      player: this,
      comboCount: this.comboCount,
      comboMultiplier: this.comboMultiplier,
      wasNewCombo:
        this.comboCount === 1 || (prevCount > 0 && this.comboCount > prevCount),
    });
  }

  /**
   * Equip a skill.
   * @param skillId Skill identifier.
   */
  public equipSkill(skillId: string): void {
    if (!this.equippedSkills.includes(skillId)) {
      this.equippedSkills.push(skillId);
    }
  }

  /**
   * Take damage and reset combo on hit.
   * Also handles parry timing checks if parrying.
   * @param amount Damage amount.
   * @returns True if still alive.
   */
  public takeDamage(amount: number): boolean {
    let actualDamage = amount;

    // Check for parry
    if (this.isParrying) {
      const isPerfectParry = this.checkPerfectParry();

      if (isPerfectParry) {
        // Perfect parry: nullify damage completely and trigger bonus
        actualDamage = 0;

        // End parry early on successful parry
        this.endParry();

        // Perfect parry counter-attack bonus (combo multiplier boost)
        this.incrementCombo(2);
        this.scene.events.emit('player:parry-successful', {
          player: this,
          perfectParry: true,
        });
      } else {
        // Regular parry: reduce damage by 75-90%
        actualDamage = Math.ceil(amount * 0.2);
        this.scene.events.emit('player:parry-successful', {
          player: this,
          perfectParry: false,
        });
      }
    }

    // Reset combo when taking damage (only if damage > 0)
    if (actualDamage > 0) {
      this.resetCombo();
      this.scene.events.emit('player:combo-reset', {
        player: this,
        reason: 'damage',
      });
    }

    return super.takeDamage(actualDamage);
  }

  /**
   * Pick up an item and add it to inventory.
   * @param item The item to pick up.
   * @param quantity The quantity to pick up (defaults to 1).
   * @returns True if the item was successfully picked up.
   */
  public pickupItem(item: Item, quantity: number = 1): boolean {
    const success = this.inventory.addItem(item, quantity);
    if (success) {
      this.scene.events.emit('player:item-picked-up', {
        player: this,
        item,
        quantity,
      });
    }
    return success;
  }

  /**
   * Use an item from inventory.
   * @param itemId The ID of the item to use.
   * @returns True if the item was successfully used.
   */
  public useItem(itemId: string): boolean {
    const slotIndex = this.inventory
      .getAllInventoryData()
      .findIndex((slot) => slot.item?.id === itemId);

    if (slotIndex === -1) {
      this.scene.events.emit('player:item-use-failed', {
        player: this,
        itemId,
        reason: 'not_found',
      });
      return false;
    }

    const slot = this.inventory.getSlot(slotIndex);
    if (!slot?.item) {
      return false;
    }

    // Apply item effects based on type
    let itemUsed = false;

    switch (slot.item.config.type) {
    case 'consumable':
      // Handle consumable items (health potions, etc.)
      if (slot.item.config.value) {
        if (slot.item.config.name.toLowerCase().includes('health')) {
          const healAmount = Math.min(
            slot.item.config.value,
            this.maxHealth - this.health,
          );
          if (healAmount > 0) {
            this.health = Math.min(this.maxHealth, this.health + healAmount);
            this.scene.events.emit('player:healed', {
              player: this,
              amount: healAmount,
            });
            itemUsed = true;
          }
        }
      }
      break;

    case 'powerup':
      // Handle power-up items
      this.scene.events.emit('player:powerup-used', {
        player: this,
        item: slot.item,
      });
      itemUsed = true;
      break;

    default:
      break;
    }

    if (itemUsed) {
      // Remove one from inventory
      this.inventory.removeItem(itemId, 1);
      this.scene.events.emit('player:item-used', {
        player: this,
        itemId,
        item: slot.item,
      });
    }

    return itemUsed;
  }

  /**
   * Drop an item from inventory at current position.
   * @param slotIndex The slot index to drop from.
   * @param quantity The quantity to drop (defaults to all).
   * @returns The dropped item data, or undefined if failed.
   */
  public dropItem(slotIndex: number, quantity?: number) {
    const position = { x: this.x, y: this.y };
    return this.inventory.dropItem(slotIndex, position, quantity);
  }

  /**
   * Get player's inventory.
   * @returns The player's inventory object.
   */
  public getInventory(): Inventory {
    return this.inventory;
  }

  /**
   * Get player progress data for saving.
   * @returns Serializable player progress data.
   */
  public getProgressData(): {
    health: number;
    maxHealth: number;
    inventory: any[];
    } {
    return {
      health: this.health,
      maxHealth: this.maxHealth,
      inventory: this.inventory.serialize(),
    };
  }

  /**
   * Apply saved progress data to player.
   * @param progressData The progress data to apply.
   * @param getItemById Function to retrieve items by ID for inventory deserialization.
   */
  public applyProgressData(
    progressData: {
      health: number;
      maxHealth: number;
      inventory: any[];
    },
    getItemById: (id: string) => any,
  ): void {
    this.health = Math.min(progressData.health, progressData.maxHealth);
    this.maxHealth = progressData.maxHealth;
    this.inventory.deserialize(progressData.inventory, getItemById);
  }

  /**
   * Unequip a skill.
   * @param skillId Skill identifier.
   */
  public unequipSkill(skillId: string): void {
    const index = this.equippedSkills.indexOf(skillId);
    if (index >= 0) {
      this.equippedSkills.splice(index, 1);
    }
  }

  /**
   * Use a skill by its ID.
   * @param skillId Skill identifier.
   * @param target Optional target character.
   */
  public useSkill(skillId: string, target?: Character): void {
    if (!this.equippedSkills.includes(skillId)) {
      logger.warn(`Skill ${skillId} not equipped.`);
      return;
    }
    // Skill logic would be implemented elsewhere (SkillManager)
    // For now, just emit an event
    this.scene.events.emit('player:skill-used', {
      player: this,
      skillId,
      target,
    });
  }

  /**
   * Synchronize player state with server (for multiplayer).
   * @param data Server state data.
   */
  public sync(data: any): void {
    if (data.position) {
      this.x = data.position.x;
      this.y = data.position.y;
    }
    if (data.velocity) {
      this.velocity.set(data.velocity.x, data.velocity.y);
    }
    if (data.health !== undefined) {
      this.health = data.health;
    }
    if (data.facing !== undefined) {
      this.facing = data.facing;
    }
    if (data.animationState) {
      this.animationState = data.animationState;
      // Update animation to match server state
      const result = this.animationStateMachine.transition(data.animationState);
      if (result.success && this.animationManager) {
        this.animationManager.play(
          this as unknown as Phaser.GameObjects.Sprite,
          result.animation,
          true,
        );
      }
    }
    // Sync inventory data (less critical, send this separately or on less frequent interval)
    if (data.inventory) {
      // Implementation would need items by ID - currently just logging
      logger.info('Inventory sync data received from server');
    }
  }

  /**
   * Get player data for synchronization.
   */
  public getSyncData(): any {
    return {
      sessionId: this.sessionId,
      position: { x: this.x, y: this.y },
      velocity: { x: this.velocity.x, y: this.velocity.y },
      health: this.health,
      facing: this.facing,
      animationState: this.animationState,
      // Inventory is serialized separately for bandwidth efficiency
    };
  }

  /**
   * Reset player to initial state (e.g., after death).
   */
  public respawn(): void {
    this.health = this.maxHealth;
    this.invulnerable = false;
    this.isAttacking = false;
    this.animationState = 'idle';

    // Reset to idle animation
    this.animationStateMachine.forceSetState('idle');
    if (this.animationManager) {
      const result = this.animationStateMachine.transition('idle');
      if (result.success) {
        this.animationManager.play(
          this as unknown as Phaser.GameObjects.Sprite,
          result.animation,
          false,
        );
      }
    }

    // Position reset should be handled by level logic
  }
}
