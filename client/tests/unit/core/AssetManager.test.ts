import { AssetManager, AssetConfig } from '../../../src/core/AssetManager';

// Mock Phaser modules
jest.mock('phaser', () => ({
  Scene: jest.fn(),
  Loader: {
    LoaderPlugin: jest.fn(),
  },
  Cache: {
    CacheManager: jest.fn(),
  },
  Textures: {
    TextureManager: jest.fn(),
  },
  Sound: {
    BaseSoundManager: jest.fn(),
  },
}));

describe('AssetManager', () => {
  let mockScene: any;
  let mockLoader: any;
  let mockCache: any;
  let mockTextureManager: any;
  let mockSoundManager: any;
  let assetManager: AssetManager;

  beforeEach(() => {
    mockLoader = {
      image: jest.fn(),
      audio: jest.fn(),
      spritesheet: jest.fn(),
      tilemapTiledJSON: jest.fn(),
      bitmapFont: jest.fn(),
      atlas: jest.fn(),
      json: jest.fn(),
      xml: jest.fn(),
      text: jest.fn(),
      script: jest.fn(),
      html: jest.fn(),
      binary: jest.fn(),
      on: jest.fn(),
      start: jest.fn(),
    };
    mockCache = {
      json: { get: jest.fn(), has: jest.fn(), remove: jest.fn() },
      xml: { get: jest.fn(), has: jest.fn(), remove: jest.fn() },
      text: { get: jest.fn(), has: jest.fn(), remove: jest.fn() },
      audioSprite: { get: jest.fn(), has: jest.fn(), remove: jest.fn() },
    };
    mockTextureManager = {
      get: jest.fn(),
      exists: jest.fn(),
      remove: jest.fn(),
      destroy: jest.fn(),
    };
    mockSoundManager = {
      get: jest.fn(),
      exists: jest.fn(),
      remove: jest.fn(),
      removeAll: jest.fn(),
    };
    mockScene = {
      load: mockLoader,
      cache: mockCache,
      textures: mockTextureManager,
      sound: mockSoundManager,
    };

    assetManager = new AssetManager(mockScene as any);
  });

  describe('constructor', () => {
    it('should initialize with scene references', () => {
      expect(assetManager).toBeInstanceOf(AssetManager);
      // Internal properties are private, but we can verify no errors
    });
  });

  describe('loadAsset', () => {
    it('should call loader.image for image type', () => {
      const config: AssetConfig = {
        key: 'test-image',
        type: 'image',
        url: 'assets/test.png',
      };
      assetManager.loadAsset(config);
      expect(mockLoader.image).toHaveBeenCalledWith(
        'test-image',
        'assets/test.png',
        undefined,
      );
    });

    it('should call loader.audio for audio type', () => {
      const config: AssetConfig = {
        key: 'test-audio',
        type: 'audio',
        url: 'assets/test.mp3',
      };
      assetManager.loadAsset(config);
      expect(mockLoader.audio).toHaveBeenCalledWith(
        'test-audio',
        'assets/test.mp3',
        undefined,
      );
    });

    it('should call loader.spritesheet for spritesheet type', () => {
      const frameConfig = { frameWidth: 32, frameHeight: 32 };
      const config: AssetConfig = {
        key: 'test-sprite',
        type: 'spritesheet',
        url: 'assets/spritesheet.png',
        frameConfig,
      };
      assetManager.loadAsset(config);
      expect(mockLoader.spritesheet).toHaveBeenCalledWith(
        'test-sprite',
        'assets/spritesheet.png',
        frameConfig,
        undefined,
      );
    });

    it('should increment totalAssets', () => {
      const config: AssetConfig = {
        key: 'test',
        type: 'image',
        url: 'assets/test.png',
      };
      assetManager.loadAsset(config);
      // totalAssets is private, but we can test via side effects? Not directly.
      // Instead we can verify that loader.image was called.
      expect(mockLoader.image).toHaveBeenCalledTimes(1);
    });
  });

  describe('loadAssets', () => {
    it('should load multiple assets', () => {
      const configs: AssetConfig[] = [
        { key: 'img1', type: 'image', url: 'assets/1.png' },
        { key: 'img2', type: 'image', url: 'assets/2.png' },
      ];
      assetManager.loadAssets(configs);
      expect(mockLoader.image).toHaveBeenCalledTimes(2);
    });
  });

  describe('registerLazyAsset and loadLazy', () => {
    it('should register lazy asset', () => {
      const config: AssetConfig = {
        key: 'lazy',
        type: 'image',
        url: 'assets/lazy.png',
      };
      assetManager.registerLazyAsset(config);
      // No direct way to verify; we'll test via loadLazy
    });

    it('should load lazy asset when not loaded', async () => {
      const config: AssetConfig = {
        key: 'lazy',
        type: 'image',
        url: 'assets/lazy.png',
      };
      assetManager.registerLazyAsset(config);
      mockLoader.start.mockImplementation((callback?: () => void) => {
        if (callback) callback();
      });
      mockLoader.on.mockImplementation((event: string, handler: Function) => {
        if (event === 'complete') {
          handler();
        }
      });
      // Mock isLoaded to return false
      jest.spyOn(assetManager as any, 'isLoaded').mockReturnValue(false);

      await assetManager.loadLazy('lazy');
      expect(mockLoader.image).toHaveBeenCalledWith(
        'lazy',
        'assets/lazy.png',
        undefined,
      );
    });

    it('should reject if lazy asset not registered', async () => {
      await expect(assetManager.loadLazy('unknown')).rejects.toThrow(
        'No lazy asset registered with key: unknown',
      );
    });
  });

  describe('startLoad', () => {
    it('should resolve when loading completes', async () => {
      mockLoader.on.mockImplementation((event: string, handler: Function) => {
        if (event === 'complete') {
          setTimeout(handler, 0);
        }
      });
      mockLoader.start.mockImplementation(() => {});

      const promise = assetManager.startLoad();
      // Simulate completion
      setTimeout(() => {
        mockLoader.on.mock.calls.forEach(
          ([event, handler]: [string, Function]) => {
            if (event === 'complete') handler();
          },
        );
      }, 0);
      await expect(promise).resolves.toBeUndefined();
    });

    it('should reject on load error', async () => {
      const handlers = new Map<string, Function>();
      mockLoader.on.mockImplementation((event: string, handler: Function) => {
        handlers.set(event, handler);
      });
      mockLoader.start.mockImplementation(() => {
        // Simulate loaderror after start
        const handler = handlers.get('loaderror');
        if (handler) handler({ key: 'test' });
      });

      const promise = assetManager.startLoad();
      await expect(promise).rejects.toThrow('Failed to load asset: test');
    });
  });

  describe('getTexture', () => {
    it('should return texture from textureManager', () => {
      const mockTexture = {};
      mockTextureManager.get.mockReturnValue(mockTexture);
      const result = assetManager.getTexture('test');
      expect(result).toBe(mockTexture);
      expect(mockTextureManager.get).toHaveBeenCalledWith('test');
    });
  });

  describe('isLoaded', () => {
    it('should check textureManager for image type', () => {
      mockTextureManager.exists.mockReturnValue(true);
      const result = assetManager.isLoaded('test', 'image');
      expect(result).toBe(true);
      expect(mockTextureManager.exists).toHaveBeenCalledWith('test');
    });

    it('should check soundManager for audio type', () => {
      mockSoundManager.exists.mockReturnValue(true);
      const result = assetManager.isLoaded('test', 'audio');
      expect(result).toBe(true);
      expect(mockSoundManager.exists).toHaveBeenCalledWith('test');
    });
  });

  describe('removeAsset', () => {
    it('should remove texture for image type', () => {
      assetManager.removeAsset('test', 'image');
      expect(mockTextureManager.remove).toHaveBeenCalledWith('test');
    });

    it('should remove sound for audio type', () => {
      assetManager.removeAsset('test', 'audio');
      expect(mockSoundManager.remove).toHaveBeenCalledWith('test');
    });
  });
});
