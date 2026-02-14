import { logger } from '../utils/logger';
import { Scene } from "phaser";

export interface AnimationConfig {
  key: string;
  frames: Array<{
    key: string;
    frame?: number | string;
  }>;
  frameRate?: number;
  repeat?: number;
  yoyo?: boolean;
  delay?: number;
  hideOnComplete?: boolean;
}

export interface SpriteAnimationState {
  current: string;
  previous: string;
  isPlaying: boolean;
  frameRate: number;
}

/**
 * Manages sprite animations for game entities.
 * Handles animation loading, playback, and state transitions.
 */
export class AnimationManager {
  private scene: Scene;
  private animations: Map<string, string> = new Map();
  private animationStates: Map<string, SpriteAnimationState> = new Map();
  private spriteConfigs: Map<
    string,
    { key: string; frameWidth: number; frameHeight: number }
  > = new Map();

  constructor(scene: Scene) {
    this.scene = scene;
  }

  /**
   * Load a sprite sheet for animation.
   */
  public loadSpriteSheet(
    key: string,
    url: string,
    frameWidth: number,
    frameHeight: number,
  ): void {
    this.spriteConfigs.set(key, { key, frameWidth, frameHeight });
    this.scene.load.spritesheet(key, url, {
      frameWidth,
      frameHeight,
    });
  }

  /**
   * Create an animation from config.
   */
  public createAnimation(config: AnimationConfig): void {
    if (!this.scene.anims.exists(config.key)) {
      this.scene.anims.create({
        key: config.key,
        frames: config.frames,
        frameRate: config.frameRate ?? 10,
        repeat: config.repeat ?? -1,
        yoyo: config.yoyo ?? false,
        delay: config.delay ?? 0,
        hideOnComplete: config.hideOnComplete ?? false,
      });
    }
  }

  /**
   * Create animations from a sprite sheet.
   */
  public createAnimationsFromSheet(
    baseKey: string,
    configs: Array<{
      name: string;
      start: number;
      end: number;
      frameRate?: number;
      repeat?: number;
      yoyo?: boolean;
    }>,
  ): void {
    configs.forEach((config) => {
      const animationKey = `${baseKey}_${config.name}`;
      if (!this.scene.anims.exists(animationKey)) {
        const frames = [];
        for (let i = config.start; i <= config.end; i++) {
          frames.push({ key: baseKey, frame: i });
        }

        this.scene.anims.create({
          key: animationKey,
          frames,
          frameRate: config.frameRate ?? 10,
          repeat: config.repeat ?? -1,
          yoyo: config.yoyo ?? false,
        });

        this.animations.set(`${baseKey}:${config.name}`, animationKey);
      }
    });
  }

  /**
   * Play an animation on a sprite.
   */
  public play(
    sprite: Phaser.GameObjects.Sprite,
    animationKey: string,
    ignoreIfPlaying: boolean = true,
  ): boolean {
    const spriteKey = this.getSpriteKey(sprite);

    // Get or create animation state
    let state = this.animationStates.get(spriteKey);
    if (!state) {
      state = {
        current: "",
        previous: "",
        isPlaying: false,
        frameRate: 10,
      };
      this.animationStates.set(spriteKey, state);
    }

    // Check if we should play
    if (ignoreIfPlaying && state.current === animationKey && state.isPlaying) {
      return false;
    }

    // Update state
    state.previous = state.current;
    state.current = animationKey;
    state.isPlaying = true;

    // Play animation
    sprite.play(animationKey, ignoreIfPlaying);

    // Listen for animation completion
    sprite.once("animationcomplete", () => {
      state!.isPlaying = false;
    });

    return true;
  }

  /**
   * Stop the current animation.
   */
  public stop(sprite: Phaser.GameObjects.Sprite): void {
    sprite.stop();
    const spriteKey = this.getSpriteKey(sprite);
    const state = this.animationStates.get(spriteKey);
    if (state) {
      state.isPlaying = false;
    }
  }

  /**
   * Pause the current animation.
   */
  public pause(sprite: Phaser.GameObjects.Sprite): void {
    sprite.anims.pause();
    const spriteKey = this.getSpriteKey(sprite);
    const state = this.animationStates.get(spriteKey);
    if (state) {
      state.isPlaying = false;
    }
  }

  /**
   * Resume a paused animation.
   */
  public resume(sprite: Phaser.GameObjects.Sprite): void {
    sprite.anims.resume();
    const spriteKey = this.getSpriteKey(sprite);
    const state = this.animationStates.get(spriteKey);
    if (state) {
      state.isPlaying = true;
    }
  }

  /**
   * Check if an animation is currently playing.
   */
  public isPlaying(
    sprite: Phaser.GameObjects.Sprite,
    animationKey?: string,
  ): boolean {
    const spriteKey = this.getSpriteKey(sprite);
    const state = this.animationStates.get(spriteKey);

    if (!state) return false;

    if (animationKey) {
      return state.current === animationKey && state.isPlaying;
    }

    return state.isPlaying;
  }

  /**
   * Get current animation key.
   */
  public getCurrentAnimation(sprite: Phaser.GameObjects.Sprite): string {
    const spriteKey = this.getSpriteKey(sprite);
    const state = this.animationStates.get(spriteKey);
    return state?.current ?? "";
  }

  /**
   * Set animation frame rate.
   */
  public setFrameRate(
    sprite: Phaser.GameObjects.Sprite,
    frameRate: number,
  ): void {
    if (sprite.anims.currentAnim) {
      sprite.anims.msPerFrame = 1000 / frameRate;
    }
    const spriteKey = this.getSpriteKey(sprite);
    const state = this.animationStates.get(spriteKey);
    if (state) {
      state.frameRate = frameRate;
    }
  }

  /**
   * Create a one-shot animation (plays once then stops).
   */
  public playOnce(
    sprite: Phaser.GameObjects.Sprite,
    animationKey: string,
    onComplete?: () => void,
  ): void {
    this.play(sprite, animationKey, false);

    if (onComplete) {
      sprite.once("animationcomplete", () => {
        onComplete();
      });
    }
  }

  /**
   * Create smooth transition between animations.
   */
  public transition(
    sprite: Phaser.GameObjects.Sprite,
    fromAnimation: string,
    toAnimation: string,
    transitionDuration: number = 100,
  ): void {
    const currentAnim = this.getCurrentAnimation(sprite);

    if (currentAnim === fromAnimation || currentAnim === "") {
      // Fade out current if needed
      this.scene.tweens.add({
        targets: sprite,
        alpha: 0.5,
        duration: transitionDuration / 2,
        onComplete: () => {
          this.play(sprite, toAnimation, false);
          this.scene.tweens.add({
            targets: sprite,
            alpha: 1,
            duration: transitionDuration / 2,
          });
        },
      });
    } else {
      this.play(sprite, toAnimation, false);
    }
  }

  /**
   * Preload all configured sprite sheets.
   */
  public preloadAll(): void {
    this.spriteConfigs.forEach((config) => {
      this.scene.load.spritesheet(
        config.key,
        `assets/sprites/${config.key}.png`,
        {
          frameWidth: config.frameWidth,
          frameHeight: config.frameHeight,
        },
      );
    });
  }

  /**
   * Generate a unique key for a sprite.
   */
  private getSpriteKey(sprite: Phaser.GameObjects.Sprite): string {
    return `${sprite.texture.key}_${sprite.name || "unnamed"}_${sprite.x}_${sprite.y}`;
  }

  /**
   * Destroy and clean up.
   */
  public destroy(): void {
    this.animations.clear();
    this.animationStates.clear();
    this.spriteConfigs.clear();
  }
}

/**
 * Animation state machine for character entities.
 */
export class AnimationStateMachine {
  private currentState: string = "idle";
  private states: Map<
    string,
    {
      animation: string;
      canTransitionTo: string[];
      onEnter?: () => void;
      onExit?: () => void;
    }
  > = new Map();
  private transitions: Map<string, (from: string, to: string) => boolean> =
    new Map();

  /**
   * Add a state to the machine.
   */
  public addState(
    name: string,
    animation: string,
    canTransitionTo: string[],
    onEnter?: () => void,
    onExit?: () => void,
  ): void {
    this.states.set(name, {
      animation,
      canTransitionTo,
      onEnter,
      onExit,
    });
  }

  /**
   * Add a custom transition validator.
   */
  public addTransitionValidator(
    fromState: string,
    validator: (from: string, to: string) => boolean,
  ): void {
    this.transitions.set(fromState, validator);
  }

  /**
   * Attempt to transition to a new state.
   */
  public transition(toState: string): { success: boolean; animation: string } {
    const currentStateConfig = this.states.get(this.currentState);
    const targetStateConfig = this.states.get(toState);

    if (!targetStateConfig) {
      logger.warn(`Unknown state: ${toState}`);
      return { success: false, animation: "" };
    }

    // Check if transition is allowed
    if (
      currentStateConfig &&
      !currentStateConfig.canTransitionTo.includes(toState)
    ) {
      // Check custom validator
      const validator = this.transitions.get(this.currentState);
      if (!validator || !validator(this.currentState, toState)) {
        return { success: false, animation: "" };
      }
    }

    // Execute exit callback
    if (currentStateConfig?.onExit) {
      currentStateConfig.onExit();
    }

    // Transition
    this.currentState = toState;

    // Execute enter callback
    if (targetStateConfig.onEnter) {
      targetStateConfig.onEnter();
    }

    return { success: true, animation: targetStateConfig.animation };
  }

  /**
   * Get current state.
   */
  public getCurrentState(): string {
    return this.currentState;
  }

  /**
   * Get current animation key.
   */
  public getCurrentAnimation(): string {
    const state = this.states.get(this.currentState);
    return state?.animation ?? "";
  }

  /**
   * Force set state (bypass validation).
   */
  public forceSetState(state: string): void {
    if (this.states.has(state)) {
      this.currentState = state;
    }
  }

  /**
   * Check if can transition to a state.
   */
  public canTransition(toState: string): boolean {
    const currentStateConfig = this.states.get(this.currentState);
    return currentStateConfig?.canTransitionTo.includes(toState) ?? false;
  }
}
