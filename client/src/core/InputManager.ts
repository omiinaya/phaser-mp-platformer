import { logger } from '../utils/logger';
import 'phaser';

/**
 * Input action mapping.
 */
export interface InputAction {
  /** Unique identifier for the action. */
  id: string;
  /** Description of the action. */
  description?: string;
  /** Default keyboard keys (array of key codes). */
  keys?: string[];
  /** Default mouse buttons (array of button indices). */
  mouseButtons?: number[];
  /** Default gamepad buttons (array of button indices). */
  gamepadButtons?: number[];
  /** Whether the action is currently active. */
  active?: boolean;
}

/**
 * Configuration for InputManager.
 */
export interface InputConfig {
  actions: InputAction[];
  /** Enable keyboard input (default: true). */
  keyboard?: boolean;
  /** Enable mouse input (default: true). */
  mouse?: boolean;
  /** Enable gamepad input (default: false). */
  gamepad?: boolean;
  /** Gamepad index (default: 0). */
  gamepadIndex?: number;
}

/**
 * Event emitted when an input action changes state.
 */
export interface InputEvent {
  action: string;
  active: boolean;
  source: 'keyboard' | 'mouse' | 'gamepad';
  detail?: any;
}

/**
 * Abstraction for handling keyboard, mouse, and gamepad inputs
 * with configurable key bindings and event delegation.
 */
export class InputManager {
  private scene: Phaser.Scene;
  private config: InputConfig;
  private actions: Map<string, InputAction>;
  private keyboard?: Phaser.Input.Keyboard.KeyboardPlugin;
  private mouse?: Phaser.Input.Pointer;
  private gamepad?: Phaser.Input.Gamepad.GamepadPlugin;
  private gamepadIndex: number;
  private eventCallbacks: Array<(event: InputEvent) => void>;

  /**
   * Creates an instance of InputManager.
   * @param scene The Phaser scene.
   * @param config Input configuration.
   */
  constructor(scene: Phaser.Scene, config: InputConfig) {
    this.scene = scene;
    this.config = {
      keyboard: true,
      mouse: true,
      gamepad: false,
      gamepadIndex: 0,
      ...config,
    };
    this.actions = new Map();
    this.eventCallbacks = [];
    this.gamepadIndex = this.config.gamepadIndex!;

    this.init();
  }

  /**
   * Initialize input systems based on configuration.
   */
  private init(): void {
    // Keyboard
    if (this.config.keyboard) {
      this.keyboard = this.scene.input.keyboard!;
      if (!this.keyboard) {
        logger.warn('Keyboard plugin not available.');
      }
    }

    // Mouse
    if (this.config.mouse) {
      this.mouse = this.scene.input.activePointer;
    }

    // Gamepad
    if (this.config.gamepad) {
      this.gamepad = this.scene.input.gamepad!;
      if (!this.gamepad) {
        logger.warn('Gamepad plugin not available.');
      }
    }

    // Register actions
    this.config.actions.forEach((action) => this.registerAction(action));
  }

  /**
   * Register an input action.
   * @param action Input action definition.
   */
  public registerAction(action: InputAction): void {
    this.actions.set(action.id, { ...action, active: false });
  }

  /**
   * Update an existing action.
   * @param actionId Action ID.
   * @param updates Partial updates to the action.
   */
  public updateAction(actionId: string, updates: Partial<InputAction>): void {
    const action = this.actions.get(actionId);
    if (action) {
      Object.assign(action, updates);
    }
  }

  /**
   * Remove an action.
   * @param actionId Action ID.
   */
  public removeAction(actionId: string): void {
    this.actions.delete(actionId);
  }

  /**
   * Check if an action is currently active.
   * @param actionId Action ID.
   */
  public isActionActive(actionId: string): boolean {
    return this.actions.get(actionId)?.active || false;
  }

  /**
   * Get the current state of all actions.
   */
  public getActionStates(): Record<string, boolean> {
    const states: Record<string, boolean> = {};
    this.actions.forEach((action, id) => {
      states[id] = action.active || false;
    });
    return states;
  }

  /**
   * Subscribe to input events.
   * @param callback Function to call when an input event occurs.
   */
  public onInputEvent(callback: (event: InputEvent) => void): void {
    this.eventCallbacks.push(callback);
  }

  /**
   * Update input state. Should be called in the scene's update loop.
   */
  public update(): void {
    this.actions.forEach((action) => {
      const previousActive = action.active;
      let active = false;
      let source: 'keyboard' | 'mouse' | 'gamepad' | undefined;

      // Check keyboard
      if (this.keyboard && action.keys) {
        const keys = action.keys.map((key) => this.keyboard!.addKey(key));
        if (keys.some((key) => key.isDown)) {
          active = true;
          source = 'keyboard';
        }
      }

      // Check mouse buttons
      if (!active && this.mouse && action.mouseButtons) {
        if (this.isMouseButtonDown(action.mouseButtons)) {
          active = true;
          source = 'mouse';
        }
      }

      // Check gamepad buttons
      if (!active && this.gamepad && action.gamepadButtons) {
        const pad = this.gamepad.getPad(this.gamepadIndex);
        if (pad) {
          if (action.gamepadButtons.some((btn) => pad.buttons[btn].pressed)) {
            active = true;
            source = 'gamepad';
          }
        }
      }

      action.active = active;

      // Emit event if state changed
      if (previousActive !== active && source) {
        this.emitEvent({
          action: action.id,
          active,
          source,
        });
      }
    });
  }

  /**
   * Check if any of the specified mouse buttons are down.
   * @param buttons Array of button indices (0=left,1=right,2=middle).
   */
  private isMouseButtonDown(buttons: number[]): boolean {
    if (!this.mouse) return false;
    for (const btn of buttons) {
      switch (btn) {
      case 0:
        if (this.mouse.leftButtonDown()) return true;
        break;
      case 1:
        if (this.mouse.rightButtonDown()) return true;
        break;
      case 2:
        if (this.mouse.middleButtonDown()) return true;
        break;
      default:
        // Additional buttons (3-4) may be supported via `this.mouse.buttons` bitmask
        // Check if the corresponding bit is set
        if (this.mouse.buttons & (1 << btn)) return true;
        break;
      }
    }
    return false;
  }

  /**
   * Emit an input event to all subscribers.
   * @param event Input event.
   */
  private emitEvent(event: InputEvent): void {
    this.eventCallbacks.forEach((callback) => callback(event));
  }

  /**
   * Enable or disable keyboard input.
   * @param enabled True to enable.
   */
  public setKeyboardEnabled(enabled: boolean): void {
    this.config.keyboard = enabled;
    if (enabled && !this.keyboard) {
      this.keyboard = this.scene.input.keyboard!;
    }
  }

  /**
   * Enable or disable mouse input.
   * @param enabled True to enable.
   */
  public setMouseEnabled(enabled: boolean): void {
    this.config.mouse = enabled;
    if (enabled && !this.mouse) {
      this.mouse = this.scene.input.activePointer;
    }
  }

  /**
   * Enable or disable gamepad input.
   * @param enabled True to enable.
   */
  public setGamepadEnabled(enabled: boolean): void {
    this.config.gamepad = enabled;
    if (enabled && !this.gamepad) {
      this.gamepad = this.scene.input.gamepad!;
    }
  }

  /**
   * Set the gamepad index to use.
   * @param index Gamepad index.
   */
  public setGamepadIndex(index: number): void {
    this.gamepadIndex = index;
  }

  /**
   * Get the current keyboard plugin (if enabled).
   */
  public getKeyboard(): Phaser.Input.Keyboard.KeyboardPlugin | undefined {
    return this.keyboard;
  }

  /**
   * Get the current mouse pointer (if enabled).
   */
  public getMouse(): Phaser.Input.Pointer | undefined {
    return this.mouse;
  }

  /**
   * Get the current gamepad plugin (if enabled).
   */
  public getGamepad(): Phaser.Input.Gamepad.GamepadPlugin | undefined {
    return this.gamepad;
  }
}
