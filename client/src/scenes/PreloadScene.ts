import { logger } from '../utils/logger';
import { Scene } from 'phaser';
import { AssetManager, AssetConfig } from '../core/AssetManager';

export class PreloadScene extends Scene {
  private assetManager?: AssetManager;

  constructor() {
    super({ key: 'PreloadScene' });
  }

  preload() {
    // Create asset manager
    this.assetManager = new AssetManager(this);

    // Configure assets to load
    const assets: AssetConfig[] = [
      { key: 'logo', type: 'image', url: 'assets/sprites/logo.png' },
      { key: 'bgm', type: 'audio', url: 'assets/audio/background.mp3' },
      // Add more assets as needed
    ];

    // Register progress callback
    this.assetManager.onProgress(event => {
      const percent = Math.floor(event.progress * 100);
      logger.info(`Loading: ${percent}%`);
      // Could update a progress bar here
    });

    // Load assets
    this.assetManager.loadAssets(assets);

    // Start loading
    this.assetManager.startLoad().then(() => {
      // Loading complete, move to create (but create will be called automatically)
      logger.info('All assets loaded');
    }).catch(error => {
      logger.error('Failed to load assets:', error);
    });
  }

  create() {
    // Ensure assets are loaded (they should be)
    this.scene.start('MainMenuScene');
  }
}