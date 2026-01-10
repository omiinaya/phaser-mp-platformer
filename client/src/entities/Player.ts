import 'phaser';
import { Character } from './Character';
import { InputManager } from '../core/InputManager';

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

    /** Current animation state. */
    private animationState: 'idle' | 'walking' | 'jumping' | 'falling' | 'attacking';

    /** Whether the player is currently attacking. */
    private isAttacking: boolean;

    /** Cooldown timer for attack (ms). */
    private attackCooldown: number;

    /** Time since last attack (ms). */
    private attackTimer: number;

    /** Inventory slot count (simplified). */
    public inventorySize: number;

    /** Equipped skill IDs. */
    public equippedSkills: string[];

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
        frame?: string | number
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

        // Enable physics by default
        this.enablePhysics();
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

        // Update attack timer
        if (this.isAttacking) {
            this.attackTimer += delta;
            if (this.attackTimer >= this.attackCooldown) {
                this.isAttacking = false;
                this.animationState = 'idle';
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

        // Optional: other actions (crouch, dash, etc.)
    }

    /**
     * Perform an attack.
     */
    public attack(): void {
        if (this.isAttacking) return;
        this.isAttacking = true;
        this.attackTimer = 0;
        this.animationState = 'attacking';
        // Emit event or deal damage to nearby enemies
        // Override in subclasses for specific attack logic
    }

    /**
     * Update animation based on current state.
     */
    protected updateAnimation(): void {
        if (this.isAttacking) {
            // Attack animation takes precedence
            return;
        }

        let newState: 'idle' | 'walking' | 'jumping' | 'falling' = 'idle';
        if (!this.isOnGround) {
            newState = this.velocity.y < 0 ? 'jumping' : 'falling';
        } else if (Math.abs(this.velocity.x) > 10) {
            newState = 'walking';
        } else {
            newState = 'idle';
        }

        if (newState !== this.animationState) {
            this.animationState = newState;
            // Here you would play the corresponding animation
            // Example: this.anims.play(`player-${newState}-${this.getDirection()}`);
        }

        // Flip sprite based on facing direction
        this.flipX = this.facing === -1;
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
            console.warn(`Skill ${skillId} not equipped.`);
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
        // Additional sync fields as needed
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
        // Position reset should be handled by level logic
    }
}