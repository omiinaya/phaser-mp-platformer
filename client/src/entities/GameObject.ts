import 'phaser';

/**
 * Base abstract class for all game objects.
 * Extends Phaser.GameObjects.Sprite and provides common properties,
 * lifecycle methods, and optional physics body attachment.
 */
export abstract class GameObject extends Phaser.GameObjects.Sprite {
    /** Unique identifier for the object. */
    public id: string;

    /** Health points (optional). */
    public health: number;

    /** Maximum health. */
    public maxHealth: number;

    /** Velocity vector (pixels per second). */
    public velocity: Phaser.Math.Vector2;

    /** Whether the object is active and should be updated. */
    public active: boolean;

    /**
     * Creates an instance of GameObject.
     * @param scene The scene this object belongs to.
     * @param x The x position.
     * @param y The y position.
     * @param texture The texture key.
     * @param frame The frame index (optional).
     */
    constructor(
        scene: Phaser.Scene,
        x: number,
        y: number,
        texture: string,
        frame?: string | number
    ) {
        super(scene, x, y, texture, frame);
        this.id = Phaser.Utils.String.UUID();
        this.health = 1;
        this.maxHealth = 1;
        this.velocity = new Phaser.Math.Vector2();
        this.active = true;
    }

    /**
     * Enable physics body for this object.
     * @param staticBody Whether the body should be static (default false).
     * @param physicsManager Optional physics manager; if not provided, uses scene physics.
     */
    public enablePhysics(staticBody = false, physicsManager?: any): void {
        if (physicsManager && physicsManager.enableBody) {
            physicsManager.enableBody(this, staticBody);
        } else {
            this.scene.physics.add.existing(this, staticBody);
        }
        // After enabling, this.body will be set by Phaser
    }

    /**
     * Disable physics body.
     */
    public disablePhysics(): void {
        const body = this.body as Phaser.Physics.Arcade.Body;
        if (body && body.enable) {
            body.enable = false;
        }
    }

    /**
     * Update lifecycle method called each frame.
     * @param delta Time delta in milliseconds.
     */
    public update(delta: number): void {
        // Base implementation updates position based on velocity
        const body = this.body as Phaser.Physics.Arcade.Body;
        if (body) {
            body.velocity.x = this.velocity.x;
            body.velocity.y = this.velocity.y;
        } else {
            this.x += this.velocity.x * (delta / 1000);
            this.y += this.velocity.y * (delta / 1000);
        }
    }

    /**
     * Take damage and reduce health.
     * @param amount Damage amount.
     * @returns True if the object is still alive after damage.
     */
    public takeDamage(amount: number): boolean {
        this.health = Math.max(0, this.health - amount);
        if (this.health <= 0) {
            this.die();
            return false;
        }
        return true;
    }

    /**
     * Heal the object.
     * @param amount Heal amount.
     */
    public heal(amount: number): void {
        this.health = Math.min(this.maxHealth, this.health + amount);
    }

    /**
     * Called when health reaches zero. Override for custom death behavior.
     */
    protected die(): void {
        this.destroy();
    }

    /**
     * Destroy this object, cleaning up any resources.
     */
    public destroy(fromScene?: boolean): void {
        const body = this.body as Phaser.Physics.Arcade.Body;
        if (body) {
            body.destroy();
        }
        super.destroy(fromScene);
    }

    /**
     * Set the velocity vector.
     * @param x X component (pixels per second).
     * @param y Y component (pixels per second).
     */
    public setVelocity(x: number, y: number): void {
        this.velocity.set(x, y);
    }

    /**
     * Get the current position as a vector.
     */
    public getPosition(): Phaser.Math.Vector2 {
        return new Phaser.Math.Vector2(this.x, this.y);
    }

    /**
     * Check if this object is within the camera viewport.
     * @param padding Extra padding outside viewport (default 0).
     */
    public isInViewport(padding = 0): boolean {
        const camera = this.scene.cameras.main;
        return (
            this.x >= camera.worldView.x - padding &&
            this.x <= camera.worldView.x + camera.worldView.width + padding &&
            this.y >= camera.worldView.y - padding &&
            this.y <= camera.worldView.y + camera.worldView.height + padding
        );
    }
}