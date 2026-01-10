import 'phaser';
import { Character } from './Character';
import { Player } from './Player';

/**
 * Enemy behavior state.
 */
export type EnemyState = 'idle' | 'patrol' | 'chase' | 'attack' | 'flee' | 'dead';

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
        frame?: string | number
    ) {
        super(scene, x, y, texture, frame);
        this.aiState = 'idle';
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
        this.patrolTimer = 0;
        this.patrolDirection = 1;
        this.stateTimer = 0;

        // Enemy-specific defaults
        this.moveSpeed = this.aiConfig.patrolSpeed!;
        this.health = 5;
        this.maxHealth = this.health;

        // Enable physics
        this.enablePhysics();
    }

    /**
     * Update enemy AI and state each frame.
     * @param delta Time delta in milliseconds.
     */
    public update(delta: number): void {
        super.update(delta);

        this.stateTimer += delta;

        // Find target if not already set
        if (!this.target) {
            this.findTarget();
        }

        // State machine
        switch (this.aiState) {
            case 'idle':
                this.updateIdle(delta);
                break;
            case 'patrol':
                this.updatePatrol(delta);
                break;
            case 'chase':
                this.updateChase(delta);
                break;
            case 'attack':
                this.updateAttack(delta);
                break;
            case 'flee':
                this.updateFlee(delta);
                break;
            case 'dead':
                // Do nothing
                break;
        }

        // Update animation based on state
        this.updateAnimation();
    }

    /**
     * Find a target (player) within detection range.
     */
    protected findTarget(): void {
        const players = this.scene.children.list.filter(
            child => child instanceof Player
        ) as Player[];
        if (players.length === 0) return;

        const detectionRange = this.aiConfig.detectionRange!;
        for (const player of players) {
            const distance = Phaser.Math.Distance.Between(
                this.x, this.y,
                player.x, player.y
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
    protected updateIdle(delta: number): void {
        // After a while, start patrolling
        if (this.stateTimer > 2000) {
            this.setState('patrol');
        }
    }

    /**
     * Update patrol state.
     * @param delta Time delta.
     */
    protected updatePatrol(delta: number): void {
        // Move in patrol direction
        this.move(this.patrolDirection);

        // Change direction periodically
        this.patrolTimer += delta;
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
    protected updateChase(delta: number): void {
        if (!this.target) {
            this.setAIState('patrol');
            return;
        }

        const distance = Phaser.Math.Distance.Between(
            this.x, this.y,
            this.target.x, this.target.y
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
    protected updateAttack(delta: number): void {
        if (!this.target) {
            this.setAIState('patrol');
            return;
        }

        const distance = Phaser.Math.Distance.Between(
            this.x, this.y,
            this.target.x, this.target.y
        );

        // If target moved out of attack range, chase
        if (distance > this.aiConfig.attackRange!) {
            this.setAIState('chase');
            return;
        }

        // Perform attack (override in subclasses)
        this.performAttack();
    }

    /**
     * Update flee state (e.g., when health is low).
     * @param delta Time delta.
     */
    protected updateFlee(delta: number): void {
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
        // Base implementation: set animation based on state and velocity
        let animName = '';
        if (this.aiState === 'dead') {
            animName = 'dead';
        } else if (this.aiState === 'attack') {
            animName = 'attack';
        } else if (!this.isOnGround) {
            animName = 'jump';
        } else if (Math.abs(this.velocity.x) > 10) {
            animName = 'walk';
        } else {
            animName = 'idle';
        }

        // Flip sprite based on facing direction
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
        config: EnemyAIConfig = {}
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
        config: EnemyAIConfig = {}
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

    public update(delta: number): void {
        // Override to ignore ground detection
        super.update(delta);
        // Flying enemies ignore ground collisions
        this.isOnGround = false;
    }

    protected updatePatrol(delta: number): void {
        // Flying patrol: move in a sine wave pattern
        this.velocity.x = this.patrolDirection * this.aiConfig.patrolSpeed!;
        this.velocity.y = Math.sin(this.stateTimer / 500) * 50;

        this.patrolTimer += delta;
        if (this.patrolTimer >= this.aiConfig.patrolChangeTime!) {
            this.patrolDirection *= -1;
            this.patrolTimer = 0;
        }
    }
}