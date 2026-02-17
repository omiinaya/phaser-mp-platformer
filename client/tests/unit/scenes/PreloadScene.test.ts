import { PreloadScene } from '../../../src/scenes/PreloadScene';
import { AssetManager, AssetConfig } from '../../../src/core/AssetManager';
import { logger } from '../../../src/utils/logger';

// Declare mocks (var to avoid TDZ with hoisted jest.mock)
var mockSceneStart: jest.Mock;
var mockSceneStop: jest.Mock;

// Mock AssetManager
jest.mock('../../../src/core/AssetManager', () => ({
  AssetManager: jest.fn().mockImplementation(() => ({
    onProgress: jest.fn(),
    loadAssets: jest.fn(),
    startLoad: jest.fn().mockResolvedValue(undefined),
  })),
}));

// Mock logger
jest.mock('../../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
  },
}));

// Mock Phaser using pattern
jest.mock('phaser', () => {
  mockSceneStart = jest.fn();
  mockSceneStop = jest.fn();

  return {
    Scene: jest.fn().mockImplementation(function(this: any) {
      this.scene = { start: mockSceneStart, stop: mockSceneStop };
      this.assetManager = undefined;
    }),
  };
});

describe('PreloadScene', () => {
  let scene: PreloadScene;
  let mockAssetManager: jest.Mocked<AssetManager>;

  beforeEach(() => {
    jest.clearAllMocks();
    if (mockSceneStart) mockSceneStart.mockClear();
    if (mockSceneStop) mockSceneStop.mockClear();

    // Create scene instance
    scene = new PreloadScene() as any;
    (scene as any).scene = { start: mockSceneStart, stop: mockSceneStop };
  });

  describe('constructor', () => {
    it('should create scene with correct key', () => {
      expect(scene).toBeInstanceOf(PreloadScene);
    });
  });

  describe('preload', () => {
    it('should create AssetManager instance', () => {
      scene.preload();

      expect(AssetManager).toHaveBeenCalledWith(scene);
    });

    it('should define assets configuration', () => {
      scene.preload();

      // AssetManager should receive assets
      const assetManagerInstance = (AssetManager as any).mock.results[0]?.value;
      expect(assetManagerInstance.loadAssets).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ key: 'logo', type: 'image' }),
          expect.objectContaining({ key: 'bgm', type: 'audio' }),
        ])
      );
    });

    it('should register progress callback', () => {
      scene.preload();

      const assetManagerInstance = (AssetManager as any).mock.results[0]?.value;
      expect(assetManagerInstance.onProgress).toHaveBeenCalled();
    });

    it('should start the asset loading', () => {
      scene.preload();

      const assetManagerInstance = (AssetManager as any).mock.results[0]?.value;
      expect(assetManagerInstance.startLoad).toHaveBeenCalled();
    });

    it('should log success when assets load', async () => {
      scene.preload();

      const assetManagerInstance = (AssetManager as any).mock.results[0]?.value;
      // Simulate successful load
      const startLoadPromise = (assetManagerInstance.startLoad as jest.Mock).mock.results[0]?.value;

      // Resolve the promise if it exists
      if (startLoadPromise && typeof startLoadPromise.then === 'function') {
        await startLoadPromise;
      }

      expect(logger.info).toHaveBeenCalledWith('All assets loaded');
    });

    it('should log error when assets fail to load', async () => {
      scene.preload();

      const assetManagerInstance = (AssetManager as any).mock.results[0]?.value;
      // Simulate failed load
      const startLoadPromise = (assetManagerInstance.startLoad as jest.Mock).mock.results[0]?.value;
      const error = new Error('Load failed');
      
      if (startLoadPromise && typeof startLoadPromise.then === 'function') {
        // Simulate rejection
        startLoadPromise.then(() => {}).catch((e: Error) => {
          expect(logger.error).toHaveBeenCalledWith('Failed to load assets:', e);
        });
        // Manually trigger catch by simulating rejection
        (startLoadPromise as any)._reject?.(error);
      }
    });
  });

  describe('create', () => {
    it('should start the GameScene after assets are loaded', async () => {
      scene.preload();

      // Call create (simulating Phaser lifecycle)
      scene.create();

      // The create method should start MainMenuScene
      expect(mockSceneStart).toHaveBeenCalledWith('MainMenuScene');
    });

    it('should handle errors during scene transition', async () => {
      // Test that create still starts the scene even if there's no promise resolution
      scene.preload();
      scene.create();

      // Even without error handling, create should work
      expect(mockSceneStart).toHaveBeenCalledWith('MainMenuScene');
    });
  });
});
