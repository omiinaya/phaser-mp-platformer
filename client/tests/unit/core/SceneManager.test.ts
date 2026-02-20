// Mock Phaser
const mockSceneManager = {
  getScenes: jest.fn().mockReturnValue([]),
  getScene: jest.fn(),
  start: jest.fn(),
  stop: jest.fn(),
  sleep: jest.fn(),
  wake: jest.fn(),
  add: jest.fn(),
  remove: jest.fn(),
};

const mockGame = {
  scene: mockSceneManager,
};

jest.mock('phaser', () => ({
  Scene: jest.fn(),
}));

import {
  SceneService,
  SceneTransitionConfig,
} from '../../../src/core/SceneManager';

describe('SceneService', () => {
  let sceneService: SceneService;

  beforeEach(() => {
    jest.clearAllMocks();
    sceneService = new SceneService(mockGame as any);
  });

  describe('constructor', () => {
    it('should create a SceneService instance', () => {
      expect(sceneService).toBeInstanceOf(SceneService);
    });
  });

  describe('startScene', () => {
    it('should start a scene', () => {
      const config: SceneTransitionConfig = {
        target: 'GameScene',
      };
      sceneService.startScene(config);
      expect(mockSceneManager.start).toHaveBeenCalledWith(
        'GameScene',
        undefined,
      );
    });

    it('should pass data to target scene', () => {
      const config: SceneTransitionConfig = {
        target: 'GameScene',
        data: { level: 1 },
      };
      sceneService.startScene(config);
      expect(mockSceneManager.start).toHaveBeenCalledWith('GameScene', {
        level: 1,
      });
    });

    it('should stop current scene when stopCurrent is true', () => {
      mockSceneManager.getScenes.mockReturnValue([
        {
          scene: { key: 'MenuScene', isActive: () => true },
        },
      ]);

      const config: SceneTransitionConfig = {
        target: 'GameScene',
        stopCurrent: true,
      };
      sceneService.startScene(config);
      expect(mockSceneManager.stop).toHaveBeenCalledWith('MenuScene');
    });

    it('should sleep current scene when sleepCurrent is true', () => {
      mockSceneManager.getScenes.mockReturnValue([
        {
          scene: { key: 'MenuScene', isActive: () => true },
        },
      ]);

      const config: SceneTransitionConfig = {
        target: 'GameScene',
        sleepCurrent: true,
      };
      sceneService.startScene(config);
      expect(mockSceneManager.sleep).toHaveBeenCalledWith('MenuScene');
    });
  });

  describe('switchToScene', () => {
    it('should sleep current and start new scene', () => {
      mockSceneManager.getScenes.mockReturnValue([
        {
          scene: { key: 'MenuScene', isActive: () => true },
        },
      ]);

      sceneService.switchToScene('GameScene');
      expect(mockSceneManager.sleep).toHaveBeenCalledWith('MenuScene');
      expect(mockSceneManager.start).toHaveBeenCalledWith(
        'GameScene',
        undefined,
      );
    });

    it('should pass data to new scene', () => {
      mockSceneManager.getScenes.mockReturnValue([
        {
          scene: { key: 'MenuScene', isActive: () => true },
        },
      ]);

      sceneService.switchToScene('GameScene', { level: 5 });
      expect(mockSceneManager.start).toHaveBeenCalledWith('GameScene', {
        level: 5,
      });
    });
  });

  describe('resumeScene', () => {
    it('should wake a sleeping scene', () => {
      sceneService.resumeScene('PausedScene');
      expect(mockSceneManager.wake).toHaveBeenCalledWith(
        'PausedScene',
        undefined,
      );
    });

    it('should pass data when resuming', () => {
      sceneService.resumeScene('PausedScene', { score: 100 });
      expect(mockSceneManager.wake).toHaveBeenCalledWith('PausedScene', {
        score: 100,
      });
    });
  });

  describe('stopScene', () => {
    it('should stop a scene', () => {
      sceneService.stopScene('GameScene');
      expect(mockSceneManager.stop).toHaveBeenCalledWith('GameScene');
    });
  });

  describe('pauseScene', () => {
    it('should sleep a scene', () => {
      sceneService.pauseScene('GameScene');
      expect(mockSceneManager.sleep).toHaveBeenCalledWith('GameScene');
    });
  });

  describe('isSceneActive', () => {
    it('should return false for inactive scene', () => {
      mockSceneManager.getScene.mockReturnValue(null);
      expect(sceneService.isSceneActive('GameScene')).toBe(false);
    });

    it('should return true for active scene', () => {
      mockSceneManager.getScene.mockReturnValue({
        scene: { isActive: () => true },
      });
      expect(sceneService.isSceneActive('GameScene')).toBe(true);
    });
  });

  describe('isSceneSleeping', () => {
    it('should return false for non-sleeping scene', () => {
      mockSceneManager.getScene.mockReturnValue(null);
      expect(sceneService.isSceneSleeping('GameScene')).toBe(false);
    });

    it('should return true for sleeping scene', () => {
      mockSceneManager.getScene.mockReturnValue({
        scene: { isSleeping: () => true },
      });
      expect(sceneService.isSceneSleeping('GameScene')).toBe(true);
    });
  });

  describe('getActiveScene', () => {
    it('should return null when no active scene', () => {
      mockSceneManager.getScenes.mockReturnValue([]);
      expect(sceneService.getActiveScene()).toBeNull();
    });

    it('should return active scene', () => {
      const mockScene = { scene: { isActive: () => true } };
      mockSceneManager.getScenes.mockReturnValue([mockScene]);
      expect(sceneService.getActiveScene()).toEqual(mockScene);
    });
  });

  describe('scene data', () => {
    it('should set and get scene data', () => {
      sceneService.setSceneData('GameScene', { score: 100 });
      expect(sceneService.getSceneData('GameScene')).toEqual({ score: 100 });
    });

    it('should get specific key from scene data', () => {
      sceneService.setSceneData('GameScene', { score: 100, lives: 3 });
      expect(sceneService.getSceneData('GameScene', 'score')).toBe(100);
    });

    it('should return undefined for non-existent scene data', () => {
      expect(sceneService.getSceneData('NonExistent')).toBeUndefined();
    });

    it('should clear all scene data', () => {
      sceneService.setSceneData('GameScene', { score: 100 });
      sceneService.clearSceneData('GameScene');
      expect(sceneService.getSceneData('GameScene')).toBeUndefined();
    });

    it('should clear specific key from scene data', () => {
      sceneService.setSceneData('GameScene', { score: 100, lives: 3 });
      sceneService.clearSceneData('GameScene', 'score');
      expect(sceneService.getSceneData('GameScene')).toEqual({ lives: 3 });
    });
  });

  describe('addScene', () => {
    it('should add a scene', () => {
      const mockSceneClass = jest.fn();
      sceneService.addScene('TestScene', mockSceneClass as any);
      expect(mockSceneManager.add).toHaveBeenCalledWith(
        'TestScene',
        mockSceneClass,
        false,
      );
    });

    it('should auto-start scene when specified', () => {
      const mockSceneClass = jest.fn();
      sceneService.addScene('TestScene', mockSceneClass as any, true);
      expect(mockSceneManager.add).toHaveBeenCalledWith(
        'TestScene',
        mockSceneClass,
        true,
      );
    });
  });

  describe('removeScene', () => {
    it('should remove a scene', () => {
      sceneService.removeScene('TestScene');
      expect(mockSceneManager.remove).toHaveBeenCalledWith('TestScene');
    });
  });

  describe('getSceneCount', () => {
    it('should return number of scenes', () => {
      mockSceneManager.getScenes.mockReturnValue([{}, {}, {}]);
      expect(sceneService.getSceneCount()).toBe(3);
    });
  });
});
