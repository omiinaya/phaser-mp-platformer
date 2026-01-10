import 'phaser';

/**
 * Configuration for a scene transition.
 */
export interface SceneTransitionConfig {
  /** Target scene key. */
  target: string;
  /** Optional data to pass to the target scene. */
  data?: any;
  /** Whether to stop the current scene (default: false). */
  stopCurrent?: boolean;
  /** Whether to sleep the current scene (default: false). */
  sleepCurrent?: boolean;
  /** Transition duration in milliseconds (if supported). */
  duration?: number;
  /** Callback after transition completes. */
  onComplete?: () => void;
}

/**
 * Scene persistence data store.
 */
interface SceneDataStore {
  [sceneKey: string]: any;
}

/**
 * Wrapper around Phaser's scene system to handle scene transitions,
 * persistence, and scene-specific data.
 */
export class SceneService {
  private game: Phaser.Game;
  private sceneManager: Phaser.Scenes.SceneManager;
  private dataStore: SceneDataStore = {};

  /**
   * Creates an instance of SceneService.
   * @param game The Phaser Game instance.
   */
  constructor(game: Phaser.Game) {
    this.game = game;
    this.sceneManager = game.scene;
  }

  /**
   * Start a scene, optionally stopping/sleeping the current scene.
   * @param config Transition configuration.
   */
  public startScene(config: SceneTransitionConfig): void {
    const { target, data, stopCurrent, sleepCurrent, duration, onComplete } = config;

    // Handle current scene
    const currentScene = this.sceneManager.getScenes(true).find(s => s.scene.isActive());
    if (currentScene && stopCurrent) {
      this.sceneManager.stop(currentScene.scene.key);
    } else if (currentScene && sleepCurrent) {
      this.sceneManager.sleep(currentScene.scene.key);
    }

    // Start the target scene
    if (duration && duration > 0) {
      // Simple timeout-based transition (could be enhanced with tweens)
      setTimeout(() => {
        this.sceneManager.start(target, data);
        onComplete?.();
      }, duration);
    } else {
      this.sceneManager.start(target, data);
      onComplete?.();
    }
  }

  /**
   * Switch to a scene, pausing the current scene and starting the new one.
   * @param target Scene key.
   * @param data Optional data to pass.
   */
  public switchToScene(target: string, data?: any): void {
    const currentScene = this.sceneManager.getScenes(true).find(s => s.scene.isActive());
    if (currentScene) {
      this.sceneManager.sleep(currentScene.scene.key);
    }
    this.sceneManager.start(target, data);
  }

  /**
   * Resume a previously paused scene.
   * @param target Scene key.
   * @param data Optional data to pass.
   */
  public resumeScene(target: string, data?: any): void {
    this.sceneManager.wake(target, data);
  }

  /**
   * Stop a scene and remove it from the scene manager.
   * @param target Scene key.
   */
  public stopScene(target: string): void {
    this.sceneManager.stop(target);
  }

  /**
   * Pause a scene (sleep).
   * @param target Scene key.
   */
  public pauseScene(target: string): void {
    this.sceneManager.sleep(target);
  }

  /**
   * Check if a scene is currently active.
   * @param target Scene key.
   */
  public isSceneActive(target: string): boolean {
    const scene = this.sceneManager.getScene(target);
    return scene?.scene.isActive() || false;
  }

  /**
   * Check if a scene is sleeping.
   * @param target Scene key.
   */
  public isSceneSleeping(target: string): boolean {
    const scene = this.sceneManager.getScene(target);
    return scene?.scene.isSleeping() || false;
  }

  /**
   * Get the currently active scene.
   * @returns The active scene instance or null.
   */
  public getActiveScene(): Phaser.Scene | null {
    const scenes = this.sceneManager.getScenes(true);
    return scenes.find(s => s.scene.isActive()) || null;
  }

  /**
   * Store data associated with a scene (persistence across transitions).
   * @param sceneKey Scene key.
   * @param data Any data to store.
   */
  public setSceneData(sceneKey: string, data: any): void {
    if (!this.dataStore[sceneKey]) {
      this.dataStore[sceneKey] = {};
    }
    Object.assign(this.dataStore[sceneKey], data);
  }

  /**
   * Retrieve stored data for a scene.
   * @param sceneKey Scene key.
   * @param key Optional specific key within the stored data.
   */
  public getSceneData(sceneKey: string, key?: string): any {
    const store = this.dataStore[sceneKey];
    if (!store) return undefined;
    return key ? store[key] : store;
  }

  /**
   * Clear stored data for a scene.
   * @param sceneKey Scene key.
   * @param key Optional specific key to clear (clears all if omitted).
   */
  public clearSceneData(sceneKey: string, key?: string): void {
    if (!this.dataStore[sceneKey]) return;
    if (key) {
      delete this.dataStore[sceneKey][key];
    } else {
      delete this.dataStore[sceneKey];
    }
  }

  /**
   * Add a new scene to the scene manager.
   * @param sceneKey Unique key for the scene.
   * @param sceneClass The scene class (constructor).
   * @param autoStart Whether to start the scene immediately (default: false).
   */
  public addScene(sceneKey: string, sceneClass: typeof Phaser.Scene, autoStart = false): void {
    this.sceneManager.add(sceneKey, sceneClass, autoStart);
  }

  /**
   * Remove a scene from the scene manager.
   * @param sceneKey Scene key.
   */
  public removeScene(sceneKey: string): void {
    this.sceneManager.remove(sceneKey);
  }

  /**
   * Get the total number of scenes currently managed.
   */
  public getSceneCount(): number {
    return this.sceneManager.getScenes(false).length;
  }
}