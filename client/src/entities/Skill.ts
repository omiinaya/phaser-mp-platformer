import 'phaser';
import { Character } from './Character';

/**
 * Skill targeting mode.
 */
export enum SkillTarget {
    Self = 'self',
    Directional = 'directional',
    Target = 'target',
    Area = 'area',
    Projectile = 'projectile',
}

/**
 * Skill configuration.
 */
export interface SkillConfig {
    /** Unique identifier. */
    id: string;
    /** Display name. */
    name: string;
    /** Description. */
    description?: string;
    /** Icon texture key. */
    icon?: string;
    /** Cooldown duration in milliseconds. */
    cooldown: number;
    /** Mana/energy cost (if any). */
    cost?: number;
    /** Cast time in milliseconds (0 for instant). */
    castTime?: number;
    /** Range in pixels (0 for melee). */
    range?: number;
    /** Targeting mode. */
    target: SkillTarget;
    /** Visual effect key to play on cast. */
    castEffect?: string;
    /** Sound key to play on cast. */
    castSound?: string;
    /** Damage amount (if dealing damage). */
    damage?: number;
    /** Healing amount (if healing). */
    heal?: number;
    /** Buff/debuff effect ID. */
    effect?: string;
}

/**
 * Abstract base class for skills.
 * Provides cooldown management, activation, and visual/audio effects.
 */
export abstract class Skill {
    /** Skill configuration. */
    public config: SkillConfig;

    /** Current cooldown remaining (ms). */
    protected cooldownRemaining: number;

    /** Whether the skill is currently on cooldown. */
    public isOnCooldown: boolean;

    /** Whether the skill is currently being cast. */
    public isCasting: boolean;

    /** Reference to the owner character. */
    protected owner?: Character;

    /**
     * Creates an instance of Skill.
     * @param config Skill configuration.
     */
    constructor(config: SkillConfig) {
        this.config = {
            cost: 0,
            castTime: 0,
            range: 0,
            ...config,
        };
        this.cooldownRemaining = 0;
        this.isOnCooldown = false;
        this.isCasting = false;
    }

    /**
     * Assign an owner character to this skill.
     * @param character The character that owns this skill.
     */
    public setOwner(character: Character): void {
        this.owner = character;
    }

    /**
     * Update skill state each frame.
     * @param delta Time delta in milliseconds.
     */
    public update(delta: number): void {
        if (this.isOnCooldown) {
            this.cooldownRemaining -= delta;
            if (this.cooldownRemaining <= 0) {
                this.isOnCooldown = false;
                this.cooldownRemaining = 0;
            }
        }
    }

    /**
     * Attempt to activate the skill.
     * @param target Optional target character or position.
     * @returns True if activation succeeded.
     */
    public activate(target?: any): boolean {
        if (!this.canActivate()) {
            return false;
        }

        // Start casting if there is a cast time
        if (this.config.castTime! > 0) {
            this.startCast(target);
            return true;
        }

        // Instant activation
        return this.execute(target);
    }

    /**
     * Check if the skill can be activated.
     */
    public canActivate(): boolean {
        if (!this.owner) {
            console.warn('Skill has no owner.');
            return false;
        }
        if (this.isOnCooldown) {
            return false;
        }
        if (this.isCasting) {
            return false;
        }
        // Check resource cost (e.g., mana)
        // This is a placeholder; subclasses can override.
        return true;
    }

    /**
     * Start the casting process.
     * @param target Optional target.
     */
    protected startCast(target?: any): void {
        this.isCasting = true;
        // Play cast animation/effect
        if (this.config.castEffect && this.owner) {
            this.owner.scene.events.emit('skill:cast-start', {
                skill: this,
                owner: this.owner,
                target,
            });
        }

        // Schedule execution after cast time
        this.owner!.scene.time.delayedCall(this.config.castTime!, () => {
            this.isCasting = false;
            this.execute(target);
        });
    }

    /**
     * Execute the skill's effect.
     * Override in subclasses.
     * @param target Optional target.
     * @returns True if execution succeeded.
     */
    protected execute(target?: any): boolean {
        // Apply cooldown
        this.isOnCooldown = true;
        this.cooldownRemaining = this.config.cooldown;

        // Play sound
        if (this.config.castSound && this.owner) {
            this.owner.scene.sound.play(this.config.castSound);
        }

        // Emit event for visual effect
        if (this.owner) {
            this.owner.scene.events.emit('skill:cast', {
                skill: this,
                owner: this.owner,
                target,
            });
        }

        // Subclasses should implement actual effect logic
        return true;
    }

    /**
     * Get the cooldown progress as a ratio (0 to 1).
     */
    public getCooldownProgress(): number {
        if (!this.isOnCooldown) return 0;
        return 1 - this.cooldownRemaining / this.config.cooldown;
    }

    /**
     * Reset cooldown (e.g., after death).
     */
    public resetCooldown(): void {
        this.isOnCooldown = false;
        this.cooldownRemaining = 0;
    }

    /**
     * Cancel casting (if applicable).
     */
    public cancelCast(): void {
        if (this.isCasting) {
            this.isCasting = false;
            // Emit cancellation event
            if (this.owner) {
                this.owner.scene.events.emit('skill:cast-cancel', {
                    skill: this,
                    owner: this.owner,
                });
            }
        }
    }
}

/**
 * Concrete skill: Dash.
 */
export class DashSkill extends Skill {
    constructor(config?: Partial<SkillConfig>) {
        super({
            id: 'dash',
            name: 'Dash',
            description: 'Quickly dash forward.',
            cooldown: 2000,
            cost: 10,
            castTime: 0,
            range: 150,
            target: SkillTarget.Directional,
            ...config,
        });
    }

    protected execute(target?: any): boolean {
        const success = super.execute(target);
        if (!success || !this.owner) return false;

        // Determine dash direction (default to facing direction)
        const direction = target?.direction ?? this.owner.facing;
        const dashDistance = this.config.range!;

        // Move owner instantly
        this.owner.x += direction * dashDistance;

        // Optional: invulnerability during dash
        this.owner.invulnerable = true;
        this.owner.scene.time.delayedCall(200, () => {
            this.owner!.invulnerable = false;
        });

        return true;
    }
}

/**
 * Concrete skill: Fireball.
 */
export class FireballSkill extends Skill {
    constructor(config?: Partial<SkillConfig>) {
        super({
            id: 'fireball',
            name: 'Fireball',
            description: 'Launch a fireball projectile.',
            cooldown: 3000,
            cost: 20,
            castTime: 500,
            range: 400,
            target: SkillTarget.Projectile,
            damage: 15,
            ...config,
        });
    }

    protected execute(target?: any): boolean {
        const success = super.execute(target);
        if (!success || !this.owner) return false;

        // Create a projectile (simplified)
        // In a real implementation, you'd create a Fireball GameObject
        this.owner.scene.events.emit('skill:fireball-created', {
            skill: this,
            owner: this.owner,
            target,
            damage: this.config.damage,
        });

        return true;
    }
}

/**
 * Concrete skill: Heal.
 */
export class HealSkill extends Skill {
    constructor(config?: Partial<SkillConfig>) {
        super({
            id: 'heal',
            name: 'Heal',
            description: 'Restore health to yourself or an ally.',
            cooldown: 5000,
            cost: 30,
            castTime: 1000,
            range: 100,
            target: SkillTarget.Target,
            heal: 25,
            ...config,
        });
    }

    protected execute(target?: any): boolean {
        const success = super.execute(target);
        if (!success || !this.owner) return false;

        const healAmount = this.config.heal!;
        const recipient = target || this.owner;
        if (recipient instanceof Character) {
            recipient.heal(healAmount);
        }

        return true;
    }
}