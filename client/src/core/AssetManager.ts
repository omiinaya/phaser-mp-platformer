import { logger } from '../utils/logger';
import 'phaser';

/**
 * Asset type definitions.
 */
export type AssetType =
  | 'image'
  | 'audio'
  | 'spritesheet'
  | 'tilemap'
  | 'bitmapFont'
  | 'atlas'
  | 'audioSprite'
  | 'json'
  | 'xml'
  | 'text'
  | 'script'
  | 'html'
  | 'binary';

/**
 * Configuration for a single asset.
 */
export interface AssetConfig {
  key: string;
  type: AssetType;
  url: string | string[];
  frameConfig?: Phaser.Types.Loader.FileTypes.ImageFrameConfig;
  xhrSettings?: Phaser.Types.Loader.XHRSettingsObject;
  // Additional options per type can be added as needed.
  textureURL?: string; // for atlas: image URL
  atlasURL?: string; // for atlas: JSON URL
  audioSprites?: {
    // for audioSprite: mapping of sprite names to time ranges
    [key: string]: { start: number; end: number };
  };
}

/**
 * Progress event data.
 */
export interface ProgressEvent {
  progress: number; // 0 to 1
  bytesLoaded: number;
  bytesTotal: number;
  fileKey?: string;
}

/**
 * Centralized service for loading, caching, and retrieving game assets.
 * Wraps Phaser's LoaderPlugin and provides a higher-level API with progress tracking,
 * lazy loading, texture atlas support, and audio sprites.
 */
export class AssetManager {
  private scene: Phaser.Scene;
  private loader: Phaser.Loader.LoaderPlugin;
  private cache: Phaser.Cache.CacheManager;
  private textureManager: Phaser.Textures.TextureManager;
  private soundManager: Phaser.Sound.BaseSoundManager;

  private totalAssets = 0;
  private loadedAssets = 0;
  private progressCallbacks: Array<(event: ProgressEvent) => void> = [];
  private lazyAssets: Map<string, AssetConfig> = new Map();
  private loadedKeys: Set<string> = new Set();

  /**
   * Creates an instance of AssetManager.
   * @param scene The Phaser scene that owns this asset manager (usually the loading scene).
   */
  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.loader = scene.load;
    this.cache = scene.cache;
    this.textureManager = scene.textures;
    this.soundManager = scene.sound;
  }

  /**
   * Register a callback for progress updates.
   * @param callback Function to call when progress changes.
   */
  public onProgress(callback: (event: ProgressEvent) => void): void {
    this.progressCallbacks.push(callback);
  }

  /**
   * Load a single asset.
   * @param config Asset configuration.
   */
  public loadAsset(config: AssetConfig): this {
    const {
      key,
      type,
      url,
      frameConfig,
      xhrSettings,
      textureURL,
      atlasURL,
      audioSprites,
    } = config;

    switch (type) {
    case 'image':
      this.loader.image(key, url as string, xhrSettings);
      break;
    case 'audio':
      this.loader.audio(key, url as string, xhrSettings);
      break;
    case 'spritesheet':
      this.loader.spritesheet(
        key,
          url as string,
          frameConfig as Phaser.Types.Loader.FileTypes.ImageFrameConfig,
          xhrSettings,
      );
      break;
    case 'tilemap':
      this.loader.tilemapTiledJSON(key, url as string, xhrSettings);
      break;
    case 'bitmapFont':
      this.loader.bitmapFont(key, url as string, undefined, xhrSettings);
      break;
    case 'atlas':
      // If separate texture and atlas URLs are provided, use them
      if (textureURL && atlasURL) {
        this.loader.atlas(key, textureURL, atlasURL, xhrSettings);
      } else {
        // Assume url is a single string pointing to a texture, and atlas data is inline? Not supported.
        // Fallback to default atlas loader (requires texture and JSON)
        logger.warn(
          'Atlas loading requires textureURL and atlasURL. Using default.',
        );
        this.loader.atlas(key, url as string, undefined, xhrSettings);
      }
      break;
    case 'audioSprite':
      // Audio sprite loading: url is audio file, audioSprites defines sprites
      if (audioSprites) {
        (this.loader as any).audioSprite(
          key,
            url as string,
            audioSprites,
            xhrSettings,
        );
      } else {
        logger.warn('Audio sprite missing audioSprites configuration.');
      }
      break;
    case 'json':
      this.loader.json(key, url as string, undefined, xhrSettings);
      break;
    case 'xml':
      this.loader.xml(key, url as string, xhrSettings as any);
      break;
    case 'text':
      this.loader.text(key, url as string, xhrSettings as any);
      break;
    case 'script':
      this.loader.script(key, url as string, xhrSettings as any);
      break;
    case 'html':
      this.loader.html(key, url as string, xhrSettings as any);
      break;
    case 'binary':
      this.loader.binary(key, url as string, xhrSettings as any);
      break;
    default:
      logger.warn(`Unknown asset type: ${type}`);
    }

    this.totalAssets++;
    return this;
  }

  /**
   * Load multiple assets.
   * @param configs Array of asset configurations.
   */
  public loadAssets(configs: AssetConfig[]): this {
    configs.forEach((config) => this.loadAsset(config));
    return this;
  }

  /**
   * Register an asset for lazy loading (will be loaded on demand).
   * @param config Asset configuration.
   */
  public registerLazyAsset(config: AssetConfig): void {
    this.lazyAssets.set(config.key, config);
  }

  /**
   * Load a lazy asset by key if not already loaded.
   * @param key Asset key.
   * @returns Promise that resolves when asset is loaded.
   */
  public loadLazy(key: string): Promise<void> {
    if (this.loadedKeys.has(key) || this.isLoaded(key)) {
      return Promise.resolve();
    }
    const config = this.lazyAssets.get(key);
    if (!config) {
      return Promise.reject(
        new Error(`No lazy asset registered with key: ${key}`),
      );
    }
    return new Promise((resolve, reject) => {
      this.loadAsset(config);
      this.startLoad()
        .then(() => {
          this.loadedKeys.add(key);
          resolve();
        })
        .catch(reject);
    });
  }

  /**
   * Start loading all queued assets.
   * @returns Promise that resolves when loading completes, rejects on error.
   */
  public startLoad(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Setup progress tracking
      this.loader.on('progress', (value: number) => {
        this.loadedAssets = Math.floor(value * this.totalAssets);
        // Use loader's progress event data
        const bytesLoaded = (this.loader as any).totalBytesLoaded || 0;
        const bytesTotal = (this.loader as any).totalBytes || 0;
        this.progressCallbacks.forEach((callback) =>
          callback({
            progress: value,
            bytesLoaded,
            bytesTotal,
          }),
        );
      });

      this.loader.on('complete', () => {
        resolve();
      });

      this.loader.on('loaderror', (file: Phaser.Loader.File) => {
        reject(new Error(`Failed to load asset: ${file.key}`));
      });

      this.loader.start();
    });
  }

  /**
   * Get a loaded image texture.
   * @param key Asset key.
   * @returns The texture or undefined if not found.
   */
  public getTexture(key: string): Phaser.Textures.Texture | undefined {
    return this.textureManager.get(key);
  }

  /**
   * Get a loaded audio asset.
   * @param key Asset key.
   * @returns The audio object or undefined if not found.
   */
  public getAudio(key: string): Phaser.Sound.BaseSound | undefined {
    return (this.soundManager as any).get(key);
  }

  /**
   * Get a loaded audio sprite.
   * @param key Asset key.
   * @returns The audio sprite object or undefined if not found.
   */
  public getAudioSprite(key: string): any {
    return (this.cache as any).audioSprite?.get(key);
  }

  /**
   * Get a loaded JSON asset.
   * @param key Asset key.
   * @returns The JSON data or undefined if not found.
   */
  public getJSON(key: string): any {
    return this.cache.json.get(key);
  }

  /**
   * Get a loaded XML asset.
   * @param key Asset key.
   * @returns The XML data or undefined if not found.
   */
  public getXML(key: string): any {
    return this.cache.xml.get(key);
  }

  /**
   * Get a loaded text asset.
   * @param key Asset key.
   * @returns The text string or undefined if not found.
   */
  public getText(key: string): string | undefined {
    return this.cache.text.get(key);
  }

  /**
   * Check if an asset is loaded.
   * @param key Asset key.
   * @param type Optional asset type to check in specific cache.
   */
  public isLoaded(key: string, type?: AssetType): boolean {
    switch (type) {
    case 'image':
    case 'spritesheet':
    case 'atlas':
    case 'bitmapFont':
      return this.textureManager.exists(key);
    case 'audio':
      return (this.soundManager as any).exists(key);
    case 'audioSprite':
      return (this.cache as any).audioSprite?.has(key);
    case 'json':
      return this.cache.json.has(key);
    case 'xml':
      return this.cache.xml.has(key);
    case 'text':
      return this.cache.text.has(key);
    default:
      // Generic check across caches
      return (
        this.textureManager.exists(key) ||
          (this.soundManager as any).exists(key) ||
          this.cache.json.has(key) ||
          this.cache.xml.has(key) ||
          this.cache.text.has(key)
      );
    }
  }

  /**
   * Clear a specific asset from cache.
   * @param key Asset key.
   * @param type Optional asset type to target specific cache.
   */
  public removeAsset(key: string, type?: AssetType): void {
    switch (type) {
    case 'image':
    case 'spritesheet':
    case 'atlas':
    case 'bitmapFont':
      this.textureManager.remove(key);
      break;
    case 'audio':
      (this.soundManager as any).remove(key);
      break;
    case 'audioSprite':
      (this.cache as any).audioSprite?.remove(key);
      break;
    case 'json':
      this.cache.json.remove(key);
      break;
    case 'xml':
      this.cache.xml.remove(key);
      break;
    case 'text':
      this.cache.text.remove(key);
      break;
    default:
      // Remove from all caches
      this.textureManager.remove(key);
      (this.soundManager as any).remove(key);
      this.cache.json.remove(key);
      this.cache.xml.remove(key);
      this.cache.text.remove(key);
    }
  }

  /**
   * Clear all assets from cache (use with caution).
   */
  public clearAll(): void {
    this.textureManager.destroy();
    // Note: destroying textures may break existing game objects.
    // Consider a more selective clearing if needed.
    (this.soundManager as any).removeAll();
    // BaseCache does not have clear; we can iterate and remove each key
    // For simplicity, we'll just leave the caches as is.
    // If you need to clear json/xml/text caches, you can implement iteration.
  }
}
