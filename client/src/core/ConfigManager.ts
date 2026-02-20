import 'phaser';
import { logger } from '../utils/logger';

/**
 * Configuration schema definition.
 */
export interface ConfigSchema {
  [key: string]: any;
}

/**
 * Configuration manager that loads and manages game configuration
 * from JSON files or inline objects.
 */
export class ConfigManager {
  private configs: Map<string, ConfigSchema>;
  private scene: Phaser.Scene;

  /**
   * Creates an instance of ConfigManager.
   * @param scene The Phaser scene (used for loading files).
   */
  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.configs = new Map();
  }

  /**
   * Load a configuration from a JSON file.
   * @param key Unique identifier for this configuration.
   * @param url URL of the JSON file.
   * @returns Promise that resolves when the config is loaded.
   */
  public loadConfig(key: string, url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.scene.load.json(key, url);
      this.scene.load.once('complete', () => {
        const data = this.scene.cache.json.get(key);
        if (data) {
          this.configs.set(key, data);
          resolve();
        } else {
          reject(new Error(`Failed to load config: ${key}`));
        }
      });
      this.scene.load.once('loaderror', () => {
        reject(new Error(`Load error for config: ${key}`));
      });
      this.scene.load.start();
    });
  }

  /**
   * Load multiple configurations.
   * @param configs Array of {key, url} objects.
   * @returns Promise that resolves when all configs are loaded.
   */
  public loadConfigs(
    configs: Array<{ key: string; url: string }>,
  ): Promise<void[]> {
    return Promise.all(configs.map((c) => this.loadConfig(c.key, c.url)));
  }

  /**
   * Set a configuration inline.
   * @param key Unique identifier.
   * @param data Configuration data.
   */
  public setConfig(key: string, data: ConfigSchema): void {
    this.configs.set(key, data);
  }

  /**
   * Get a configuration value.
   * @param key Configuration key.
   * @param path Optional dot‑notation path to a nested property.
   * @returns The configuration value, or undefined if not found.
   */
  public get<T = any>(key: string, path?: string): T | undefined {
    const config = this.configs.get(key);
    if (!config) return undefined;

    if (!path) return config as T;

    // Resolve dot‑notation path
    const parts = path.split('.');
    let current: any = config;
    for (const part of parts) {
      if (current === undefined || current === null) return undefined;
      current = current[part];
    }
    return current as T;
  }

  /**
   * Check if a configuration exists.
   * @param key Configuration key.
   */
  public has(key: string): boolean {
    return this.configs.has(key);
  }

  /**
   * Merge additional data into an existing configuration.
   * @param key Configuration key.
   * @param data Data to merge (shallow merge).
   */
  public merge(key: string, data: ConfigSchema): void {
    const existing = this.configs.get(key);
    if (existing) {
      Object.assign(existing, data);
    } else {
      this.configs.set(key, { ...data });
    }
  }

  /**
   * Remove a configuration.
   * @param key Configuration key.
   */
  public remove(key: string): void {
    this.configs.delete(key);
    // Also remove from cache if it was loaded via JSON
    this.scene.cache.json.remove(key);
  }

  /**
   * Clear all configurations.
   */
  public clear(): void {
    this.configs.forEach((_, key) => {
      this.scene.cache.json.remove(key);
    });
    this.configs.clear();
  }

  /**
   * Get all configuration keys.
   */
  public getKeys(): string[] {
    return Array.from(this.configs.keys());
  }

  /**
   * Dump the entire configuration as an object (for debugging).
   */
  public dump(): Record<string, ConfigSchema> {
    const obj: Record<string, ConfigSchema> = {};
    this.configs.forEach((value, key) => {
      obj[key] = value;
    });
    return obj;
  }

  /**
   * Save configuration to localStorage (client‑side only).
   * @param key Configuration key.
   * @param localStorageKey Key in localStorage (defaults to `config_${key}`).
   */
  public saveToLocalStorage(key: string, localStorageKey?: string): void {
    const config = this.configs.get(key);
    if (!config) return;

    const storageKey = localStorageKey || `config_${key}`;
    try {
      localStorage.setItem(storageKey, JSON.stringify(config));
    } catch (e) {
      logger.warn('Failed to save config to localStorage:', e);
    }
  }

  /**
   * Load configuration from localStorage.
   * @param key Configuration key to assign.
   * @param localStorageKey Key in localStorage (defaults to `config_${key}`).
   */
  public loadFromLocalStorage(key: string, localStorageKey?: string): void {
    const storageKey = localStorageKey || `config_${key}`;
    try {
      const data = localStorage.getItem(storageKey);
      if (data) {
        this.configs.set(key, JSON.parse(data));
      }
    } catch (e) {
      logger.warn('Failed to load config from localStorage:', e);
    }
  }
}
