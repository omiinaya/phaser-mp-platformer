import {
  LevelManager,
  LevelConfig,
  LEVEL_CONFIGS,
} from '../../../src/core/LevelManager';

// Mock logger
jest.mock('../../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('LevelManager', () => {
  let levelManager: LevelManager;
  let mockScene: any;

  beforeEach(() => {
    mockScene = {};
    levelManager = new LevelManager(mockScene as any);
  });

  describe('constructor', () => {
    it('should create a LevelManager instance', () => {
      expect(levelManager).toBeDefined();
    });
  });

  describe('loadLevel', () => {
    it('should load a level configuration', () => {
      const config: LevelConfig = {
        key: 'test',
        tilemap: 'test.json',
        targetScore: 100,
      };
      levelManager.loadLevel(config);
      expect(levelManager.getCurrentLevel()).toEqual(config);
    });

    it('should reset level state on load', () => {
      levelManager.addScore(50);
      const config: LevelConfig = { key: 'test', tilemap: 'test.json' };
      levelManager.loadLevel(config);
      const state = levelManager.getState();
      expect(state.score).toBe(0);
    });
  });

  describe('loadLevelByNumber', () => {
    it('should load level by number', () => {
      const result = levelManager.loadLevelByNumber(1);
      expect(result).toBe(true);
      expect(levelManager.getCurrentLevelNumber()).toBe(1);
    });

    it('should return false for invalid level', () => {
      const result = levelManager.loadLevelByNumber(999);
      expect(result).toBe(false);
    });
  });

  describe('LEVEL_CONFIGS', () => {
    it('should have predefined levels', () => {
      expect(LEVEL_CONFIGS[1]).toBeDefined();
      expect(LEVEL_CONFIGS[2]).toBeDefined();
      expect(LEVEL_CONFIGS[3]).toBeDefined();
    });
  });

  describe('getCurrentLevelNumber', () => {
    it('should return current level number', () => {
      levelManager.loadLevelByNumber(2);
      expect(levelManager.getCurrentLevelNumber()).toBe(2);
    });
  });

  describe('getTotalLevels', () => {
    it('should return total number of levels', () => {
      expect(levelManager.getTotalLevels()).toBe(3);
    });
  });

  describe('canAccessLevel', () => {
    it('should allow access to valid levels', () => {
      expect(levelManager.canAccessLevel(1)).toBe(true);
      expect(levelManager.canAccessLevel(2)).toBe(true);
      expect(levelManager.canAccessLevel(3)).toBe(true);
    });

    it('should deny access to invalid levels', () => {
      expect(levelManager.canAccessLevel(0)).toBe(false);
      expect(levelManager.canAccessLevel(4)).toBe(false);
      expect(levelManager.canAccessLevel(-1)).toBe(false);
    });
  });

  describe('addScore', () => {
    it('should add points to score', () => {
      levelManager.addScore(100);
      expect(levelManager.getState().score).toBe(100);
    });

    it('should trigger score callback', () => {
      const callback = jest.fn();
      levelManager.setScoreCallback(callback);
      levelManager.addScore(50);
      expect(callback).toHaveBeenCalledWith(50);
    });
  });

  describe('collectCoin', () => {
    it('should collect coin and add score', () => {
      levelManager.collectCoin();
      const state = levelManager.getState();
      expect(state.coins).toBe(1);
      expect(state.score).toBe(10);
    });
  });

  describe('defeatEnemy', () => {
    it('should defeat enemy and add score', () => {
      levelManager.defeatEnemy(50);
      const state = levelManager.getState();
      expect(state.enemiesDefeated).toBe(1);
      expect(state.score).toBe(50);
    });
  });

  describe('collectItem', () => {
    it('should collect item and add score', () => {
      levelManager.collectItem('key');
      const state = levelManager.getState();
      expect(state.itemsCollected).toContain('key');
      expect(state.score).toBe(5);
    });

    it('should not add duplicate items', () => {
      levelManager.collectItem('key');
      levelManager.collectItem('key');
      const state = levelManager.getState();
      expect(state.itemsCollected.length).toBe(1);
    });
  });

  describe('getTimeElapsed', () => {
    it('should return time elapsed', () => {
      const elapsed = levelManager.getTimeElapsed();
      expect(typeof elapsed).toBe('number');
    });
  });

  describe('checkTimeLimit', () => {
    it('should return true when no time limit', () => {
      expect(levelManager.checkTimeLimit()).toBe(true);
    });
  });

  describe('getState', () => {
    it('should return current level state', () => {
      levelManager.addScore(100);
      const state = levelManager.getState();
      expect(state.score).toBe(100);
    });
  });

  describe('getCurrentLevel', () => {
    it('should return undefined when no level loaded', () => {
      expect(levelManager.getCurrentLevel()).toBeUndefined();
    });

    it('should return current level config', () => {
      const config: LevelConfig = { key: 'test', tilemap: 'test.json' };
      levelManager.loadLevel(config);
      expect(levelManager.getCurrentLevel()).toEqual(config);
    });
  });

  describe('reset', () => {
    it('should reset level state', () => {
      levelManager.addScore(100);
      levelManager.reset();
      const state = levelManager.getState();
      expect(state.score).toBe(0);
      expect(state.coins).toBe(0);
    });
  });

  describe('callbacks', () => {
    it('should set level complete callback', () => {
      const callback = jest.fn();
      levelManager.setLevelCompleteCallback(callback);
    });

    it('should set game over callback', () => {
      const callback = jest.fn();
      levelManager.setGameOverCallback(callback);
    });

    it('should trigger game over callback', () => {
      const callback = jest.fn();
      levelManager.setGameOverCallback(callback);
      levelManager.triggerGameOver();
      expect(callback).toHaveBeenCalled();
    });
  });
});
