// Mock Phaser
jest.mock('phaser', () => ({
  Scene: jest.fn().mockImplementation(() => ({
    load: {
      image: jest.fn(),
      spritesheet: jest.fn(),
      audio: jest.fn(),
      tilemapTiledJSON: jest.fn(),
      svg: jest.fn(),
      once: jest.fn(),
      start: jest.fn(),
    },
    make: {
      tilemap: jest.fn().mockReturnValue({
        tilesets: [],
        layers: [],
        objects: [],
        addTilesetImage: jest.fn(),
        createLayer: jest.fn(),
      }),
    },
  })),
}));

import { LazyAssetLoader } from '../../../src/core/LazyAssetLoader';

describe('LazyAssetLoader', () => {
  let mockScene: any;
  let loader: LazyAssetLoader;

  beforeEach(() => {
    mockScene = {
      load: {
        image: jest.fn(),
        spritesheet: jest.fn(),
        audio: jest.fn(),
        tilemapTiledJSON: jest.fn(),
        svg: jest.fn(),
        once: jest.fn(),
        start: jest.fn(),
      },
      make: {
        tilemap: jest.fn().mockReturnValue({
          tilesets: [],
          layers: [],
          objects: [],
          addTilesetImage: jest.fn().mockReturnValue({}),
          createLayer: jest.fn().mockReturnValue({}),
        }),
      },
    };
    loader = new LazyAssetLoader(mockScene);
  });

  describe('constructor', () => {
    it('should create a LazyAssetLoader instance', () => {
      expect(loader).toBeInstanceOf(LazyAssetLoader);
    });
  });

  describe('registerAsset', () => {
    it('should register an image asset', () => {
      loader.registerAsset('player', 'image', 'assets/player.png', 'critical');
      expect(loader.isLoaded('player')).toBe(false);
    });

    it('should register a spritesheet asset', () => {
      loader.registerAsset(
        'enemy',
        'spritesheet',
        'assets/enemy.png',
        'deferred',
        {
          frameWidth: 32,
          frameHeight: 32,
        },
      );
      expect(loader.isLoaded('enemy')).toBe(false);
    });

    it('should register an audio asset', () => {
      loader.registerAsset('jump', 'audio', 'assets/jump.mp3', 'critical');
      expect(loader.isLoaded('jump')).toBe(false);
    });

    it('should register a tilemap asset', () => {
      loader.registerAsset(
        'level1',
        'tilemap',
        'assets/level1.json',
        'critical',
      );
      expect(loader.isLoaded('level1')).toBe(false);
    });

    it('should register assets with default priority', () => {
      loader.registerAsset('test', 'image', 'test.png');
      const assets = loader.getRegisteredAssets();
      expect(assets[0].priority).toBe('ondemand');
    });
  });

  describe('isLoaded', () => {
    it('should return false for unregistered asset', () => {
      expect(loader.isLoaded('nonexistent')).toBe(false);
    });

    it('should return false for registered but not loaded asset', () => {
      loader.registerAsset('test', 'image', 'test.png');
      expect(loader.isLoaded('test')).toBe(false);
    });
  });

  describe('isLoading', () => {
    it('should return false for unregistered asset', () => {
      expect(loader.isLoading('nonexistent')).toBe(false);
    });

    it('should return false for registered but not loading asset', () => {
      loader.registerAsset('test', 'image', 'test.png');
      expect(loader.isLoading('test')).toBe(false);
    });
  });

  describe('loadProgress', () => {
    it('should return 1 when no assets registered', () => {
      expect(loader.loadProgress()).toBe(1);
    });

    it('should return 0 when assets registered but none loaded', () => {
      loader.registerAsset('test1', 'image', 'test1.png');
      loader.registerAsset('test2', 'image', 'test2.png');
      expect(loader.loadProgress()).toBe(0);
    });
  });

  describe('unregisterAsset', () => {
    it('should unregister an asset', () => {
      loader.registerAsset('test', 'image', 'test.png');
      loader.unregisterAsset('test');
      expect(loader.isLoaded('test')).toBe(false);
    });
  });

  describe('getLoadedAssets', () => {
    it('should return empty array when no assets loaded', () => {
      expect(loader.getLoadedAssets()).toEqual([]);
    });
  });

  describe('getRegisteredAssets', () => {
    it('should return empty array when no assets registered', () => {
      expect(loader.getRegisteredAssets()).toEqual([]);
    });

    it('should return registered assets', () => {
      loader.registerAsset('test', 'image', 'test.png', 'critical');
      const assets = loader.getRegisteredAssets();
      expect(assets).toHaveLength(1);
      expect(assets[0].key).toBe('test');
    });
  });

  describe('loadAsset', () => {
    it('should return false for unregistered asset', async () => {
      const result = await loader.loadAsset('nonexistent');
      expect(result).toBe(false);
    });
  });

  describe('loadAssetsByPriority', () => {
    it('should return true when no assets with priority exist', async () => {
      const result = await loader.loadAssetsByPriority('critical');
      expect(result).toBe(true);
    });
  });

  describe('preloadCriticalAssets', () => {
    it('should return true when no critical assets exist', async () => {
      const result = await loader.preloadCriticalAssets();
      expect(result).toBe(true);
    });
  });

  describe('preloadDeferredAssets', () => {
    it('should return true when no deferred assets exist', async () => {
      const result = await loader.preloadDeferredAssets();
      expect(result).toBe(true);
    });
  });
});
