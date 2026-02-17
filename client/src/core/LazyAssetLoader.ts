import { logger } from '../utils/logger';
import { Scene } from 'phaser';

export type AssetType =
  | 'image'
  | 'spritesheet'
  | 'audio'
  | 'tilemap'
  | 'svg'
  | 'tilesetimage';

export type AssetPriority = 'critical' | 'deferred' | 'optional' | 'ondemand';

export interface AssetConfig {
  key: string;
  type: AssetType;
  path: string;
  priority: AssetPriority;
  config?: any;
  loaded: boolean;
  loading: boolean;
  callbacks: ((success: boolean) => void)[];
}

export class LazyAssetLoader {
  private scene: Scene;
  private assets: Map<string, AssetConfig> = new Map();
  private loadedKeys: Set<string> = new Set();
  private loadingQueue: string[] = [];
  private isProcessingQueue: boolean = false;
  private maxConcurrentLoads: number = 3;
  private currentLoads: number = 0;

  constructor(scene: Scene) {
    this.scene = scene;
  }

  public registerAsset(
    key: string,
    type: AssetType,
    path: string,
    priority: AssetPriority = 'ondemand',
    config?: any,
  ): void {
    this.assets.set(key, {
      key,
      type,
      path,
      priority,
      config,
      loaded: false,
      loading: false,
      callbacks: [],
    });
  }

  public loadAsset(
    key: string,
    callback?: (success: boolean) => void,
  ): Promise<boolean> {
    return new Promise((resolve) => {
      const asset = this.assets.get(key);

      if (!asset) {
        logger.warn(`Asset ${key} not registered`);
        if (callback) callback(false);
        resolve(false);
        return;
      }

      if (asset.loaded) {
        if (callback) callback(true);
        resolve(true);
        return;
      }

      if (callback) {
        asset.callbacks.push(callback);
      }

      if (!asset.loading) {
        this.loadingQueue.push(key);
        asset.loading = true;
        this.processQueue();
      }

      if (callback) {
        resolve(true);
      } else {
        asset.callbacks.push(resolve as any);
      }
    });
  }

  public loadAssetsByPriority(
    priority: AssetPriority,
    callback?: (success: boolean) => void,
  ): Promise<boolean> {
    const keys = Array.from(this.assets.entries())
      .filter(([_, asset]) => asset.priority === priority && !asset.loaded)
      .map(([key]) => key);

    if (keys.length === 0) {
      if (callback) callback(true);
      return Promise.resolve(true);
    }

    let loadedCount = 0;
    let hasError = false;

    const promises = keys.map((key) =>
      this.loadAsset(key, (success) => {
        if (!success) hasError = true;
        loadedCount++;
        if (loadedCount === keys.length && callback) {
          callback(!hasError);
        }
      }),
    );

    return Promise.all(promises).then(() => !hasError);
  }

  public preloadCriticalAssets(): Promise<boolean> {
    return this.loadAssetsByPriority('critical');
  }

  public preloadDeferredAssets(): Promise<boolean> {
    return this.loadAssetsByPriority('deferred');
  }

  public isLoaded(key: string): boolean {
    return this.loadedKeys.has(key) || (this.assets.get(key)?.loaded ?? false);
  }

  public isLoading(key: string): boolean {
    return this.assets.get(key)?.loading ?? false;
  }

  public loadProgress(): number {
    if (this.assets.size === 0) return 1;
    let loaded = 0;
    for (const asset of this.assets.values()) {
      if (asset.loaded || (this.loadedKeys.has(asset.key) && !asset.loading)) {
        loaded++;
      }
    }
    return loaded / this.assets.size;
  }

  private async processQueue(): Promise<void> {
    if (
      this.isProcessingQueue ||
      this.currentLoads >= this.maxConcurrentLoads
    ) {
      return;
    }

    this.isProcessingQueue = true;

    while (
      this.loadingQueue.length > 0 &&
      this.currentLoads < this.maxConcurrentLoads
    ) {
      const key = this.loadingQueue.shift()!;
      await this.loadSingleAsset(key);
    }

    this.isProcessingQueue = false;
  }

  private async loadSingleAsset(key: string): Promise<void> {
    const asset = this.assets.get(key);
    if (!asset) return;

    this.currentLoads++;

    try {
      await this.performAssetLoad(asset);
      asset.loaded = true;
      this.loadedKeys.add(key);
      this.notifyCallbacks(key, true);
    } catch (error) {
      logger.error(`Failed to load asset ${key}:`, error);
      this.notifyCallbacks(key, false);
    } finally {
      asset.loading = false;
      this.currentLoads--;

      if (!this.isProcessingQueue) {
        this.processQueue();
      }
    }
  }

  private performAssetLoad(asset: AssetConfig): Promise<void> {
    return new Promise((resolve, reject) => {
      const { key, type, path, config } = asset;

      const onComplete = () => {
        resolve();
      };

      const onError = (_fileObject: any) => {
        reject(new Error(`Failed to load ${type}: ${path}`));
      };

      switch (type) {
      case 'image':
        this.scene.load.image(key, path);
        break;
      case 'spritesheet':
        this.scene.load.spritesheet(key, path, config);
        break;
      case 'audio':
        const audioConfig = config || {};
        this.scene.load.audio(key, path, audioConfig);
        break;
      case 'tilemap':
        const tilemapConfig = config || {};
        this.scene.load.tilemapTiledJSON(key, path, tilemapConfig);
        break;
      case 'svg':
        const svgConfig = config || {};
        this.scene.load.svg(key, path, svgConfig);
        break;
      case 'tilesetimage':
        this.scene.load.image(key, path);
        break;
      default:
        reject(new Error(`Unknown asset type: ${type}`));
        return;
      }

      this.scene.load.once(`filecomplete-${type}-${key}`, onComplete);
      this.scene.load.once('loaderror', onError);

      this.scene.load.start();
    });
  }

  private notifyCallbacks(key: string, success: boolean): void {
    const asset = this.assets.get(key);
    if (!asset) return;

    for (const callback of asset.callbacks) {
      try {
        callback(success);
      } catch (error) {
        logger.error(`Error in asset callback for ${key}:`, error);
      }
    }
    asset.callbacks = [];
  }

  public unregisterAsset(key: string): void {
    this.assets.delete(key);
    this.loadedKeys.delete(key);
  }

  public getLoadedAssets(): string[] {
    return Array.from(this.loadedKeys);
  }

  public getRegisteredAssets(): AssetConfig[] {
    return Array.from(this.assets.values());
  }
}

let globalLazyAssetLoader: LazyAssetLoader | null = null;

export function setGlobalLazyAssetLoader(loader: LazyAssetLoader): void {
  globalLazyAssetLoader = loader;
}

export function getGlobalLazyAssetLoader(): LazyAssetLoader | null {
  return globalLazyAssetLoader;
}
