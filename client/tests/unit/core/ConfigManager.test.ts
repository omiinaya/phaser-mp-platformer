import { ConfigManager } from '../../../src/core/ConfigManager';

// Mock Phaser
jest.mock('phaser', () => ({
  Scene: jest.fn(),
  Math: {
    Vector2: jest.fn().mockImplementation((x = 0, y = 0) => ({ x, y })),
  },
}));

describe('ConfigManager', () => {
  let configManager: ConfigManager;
  let mockScene: any;

  beforeEach(() => {
    mockScene = {
      load: {
        json: jest.fn(),
        once: jest.fn(),
        start: jest.fn(),
      },
      cache: {
        json: {
          get: jest.fn(),
          remove: jest.fn(),
        },
      },
    };
    configManager = new ConfigManager(mockScene);
  });

  describe('constructor', () => {
    it('should initialize with empty configs', () => {
      expect(configManager.getKeys()).toEqual([]);
    });
  });

  describe('setConfig', () => {
    it('should set a configuration', () => {
      configManager.setConfig('game', { difficulty: 'hard' });
      expect(configManager.get('game')).toEqual({ difficulty: 'hard' });
    });

    it('should overwrite existing config', () => {
      configManager.setConfig('game', { difficulty: 'easy' });
      configManager.setConfig('game', { difficulty: 'hard' });
      expect(configManager.get('game')).toEqual({ difficulty: 'hard' });
    });
  });

  describe('get', () => {
    it('should return undefined for non-existent key', () => {
      expect(configManager.get('nonexistent')).toBeUndefined();
    });

    it('should return the full config when no path specified', () => {
      configManager.setConfig('game', { difficulty: 'hard', maxPlayers: 4 });
      expect(configManager.get('game')).toEqual({
        difficulty: 'hard',
        maxPlayers: 4,
      });
    });

    it('should return nested value with dot notation', () => {
      configManager.setConfig('game', {
        difficulty: 'hard',
        settings: {
          sound: { volume: 0.5 },
        },
      });
      expect(configManager.get('game', 'settings.sound.volume')).toBe(0.5);
    });

    it('should return undefined for non-existent path', () => {
      configManager.setConfig('game', { difficulty: 'hard' });
      expect(configManager.get('game', 'nonexistent.path')).toBeUndefined();
    });

    it('should return undefined for path on null value', () => {
      configManager.setConfig('game', { difficulty: null } as any);
      expect(configManager.get('game', 'difficulty.something')).toBeUndefined();
    });
  });

  describe('has', () => {
    it('should return false for non-existent config', () => {
      expect(configManager.has('nonexistent')).toBe(false);
    });

    it('should return true for existing config', () => {
      configManager.setConfig('game', { difficulty: 'hard' });
      expect(configManager.has('game')).toBe(true);
    });
  });

  describe('merge', () => {
    it('should merge data into existing config', () => {
      configManager.setConfig('game', { difficulty: 'easy' });
      configManager.merge('game', { maxPlayers: 4 });
      expect(configManager.get('game')).toEqual({
        difficulty: 'easy',
        maxPlayers: 4,
      });
    });

    it('should create new config if key does not exist', () => {
      configManager.merge('newConfig', { value: 123 });
      expect(configManager.get('newConfig')).toEqual({ value: 123 });
    });
  });

  describe('remove', () => {
    it('should remove a config', () => {
      configManager.setConfig('game', { difficulty: 'hard' });
      configManager.remove('game');
      expect(configManager.has('game')).toBe(false);
    });
  });

  describe('clear', () => {
    it('should remove all configs', () => {
      configManager.setConfig('game1', { value: 1 });
      configManager.setConfig('game2', { value: 2 });
      configManager.clear();
      expect(configManager.getKeys()).toEqual([]);
    });
  });

  describe('getKeys', () => {
    it('should return all config keys', () => {
      configManager.setConfig('game', {});
      configManager.setConfig('audio', {});
      configManager.setConfig('video', {});
      const keys = configManager.getKeys();
      expect(keys).toContain('game');
      expect(keys).toContain('audio');
      expect(keys).toContain('video');
      expect(keys).toHaveLength(3);
    });
  });

  describe('dump', () => {
    it('should return all configs as object', () => {
      configManager.setConfig('game', { difficulty: 'hard' });
      configManager.setConfig('audio', { volume: 50 });
      const dump = configManager.dump();
      expect(dump).toEqual({
        game: { difficulty: 'hard' },
        audio: { volume: 50 },
      });
    });

    it('should return empty object when no configs', () => {
      expect(configManager.dump()).toEqual({});
    });
  });

  describe('loadConfig', () => {
    it('should load config from JSON file', async () => {
      mockScene.cache.json.get.mockReturnValue({ difficulty: 'hard' });
      mockScene.load.once.mockImplementation(
        (event: string, callback: Function) => {
          if (event === 'complete') callback();
        },
      );

      await configManager.loadConfig('game', '/config/game.json');

      expect(mockScene.load.json).toHaveBeenCalledWith(
        'game',
        '/config/game.json',
      );
      expect(configManager.get('game')).toEqual({ difficulty: 'hard' });
    });

    it('should reject on load error', async () => {
      mockScene.load.once.mockImplementation(
        (event: string, callback: Function) => {
          if (event === 'loaderror') callback();
        },
      );

      await expect(
        configManager.loadConfig('game', '/config/game.json'),
      ).rejects.toThrow('Load error for config: game');
    });
  });

  describe('loadConfigs', () => {
    it('should load multiple configs', async () => {
      mockScene.cache.json.get.mockReturnValue({});
      mockScene.load.once.mockImplementation(
        (event: string, callback: Function) => {
          callback();
        },
      );

      await configManager.loadConfigs([
        { key: 'game', url: '/config/game.json' },
        { key: 'audio', url: '/config/audio.json' },
      ]);

      expect(configManager.has('game')).toBe(true);
      expect(configManager.has('audio')).toBe(true);
    });
  });

  describe('localStorage', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      Object.defineProperty(global, 'localStorage', {
        value: {
          setItem: jest.fn(),
          getItem: jest.fn(),
        },
        writable: true,
      });
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should save config to localStorage', () => {
      configManager.setConfig('game', { difficulty: 'hard' });
      configManager.saveToLocalStorage('game');
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'config_game',
        JSON.stringify({ difficulty: 'hard' }),
      );
    });

    it('should save config with custom localStorage key', () => {
      configManager.setConfig('game', { difficulty: 'hard' });
      configManager.saveToLocalStorage('game', 'myGameConfig');
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'myGameConfig',
        JSON.stringify({ difficulty: 'hard' }),
      );
    });

    it('should load config from localStorage', () => {
      (localStorage.getItem as jest.Mock).mockReturnValue(
        JSON.stringify({ difficulty: 'hard' }),
      );
      configManager.loadFromLocalStorage('game');
      expect(configManager.get('game')).toEqual({ difficulty: 'hard' });
    });

    it('should load config with custom localStorage key', () => {
      (localStorage.getItem as jest.Mock).mockReturnValue(
        JSON.stringify({ difficulty: 'hard' }),
      );
      configManager.loadFromLocalStorage('game', 'myGameConfig');
      expect(localStorage.getItem).toHaveBeenCalledWith('myGameConfig');
    });
  });
});
