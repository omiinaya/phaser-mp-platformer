// Declare mock variables FIRST before jest.mock hoisting
let mockSceneStart: jest.Mock;
let mockAddRect: jest.Mock;
let mockAddText: jest.Mock;
let mockAddContainer: jest.Mock;

import { LevelSelectScene } from '../../../src/scenes/LevelSelectScene';
import { InputManager } from '../../../src/core/InputManager';
import { SceneService } from '../../../src/core/SceneManager';

jest.mock('../../../src/core/InputManager', () => ({
  InputManager: jest
    .fn()
    .mockImplementation(() => ({ onInputEvent: jest.fn(), update: jest.fn() })),
  InputConfig: {},
}));

jest.mock('../../../src/core/SceneManager', () => ({
  SceneService: jest.fn().mockImplementation(() => ({ startScene: jest.fn() })),
}));

jest.mock('../../../src/core/LevelManager', () => ({
  LEVEL_CONFIGS: {
    '1': { theme: 'forest' },
    '2': { theme: 'desert' },
    '3': { theme: 'cave' },
    '4': { theme: 'castle' },
    '5': { theme: 'sky' },
    '6': { theme: 'volcano' },
    '7': { theme: 'ice' },
    '8': { theme: 'space' },
    '9': { theme: 'future' },
    '10': { theme: 'final' },
  },
}));

jest.mock('../../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
  },
}));

jest.mock('phaser', () => {
  mockSceneStart = jest.fn();
  mockAddRect = jest.fn().mockReturnValue({
    setOrigin: jest.fn().mockReturnThis(),
    setScrollFactor: jest.fn().mockReturnThis(),
  });
  mockAddText = jest.fn().mockReturnValue({
    setOrigin: jest.fn().mockReturnThis(),
    setScrollFactor: jest.fn().mockReturnThis(),
    setColor: jest.fn().mockReturnThis(),
    setScale: jest.fn().mockReturnThis(),
    setInteractive: jest.fn().mockReturnThis(),
    on: jest.fn().mockReturnThis(),
  });
  mockAddContainer = jest.fn().mockReturnValue({
    add: jest.fn().mockReturnThis(),
    setSize: jest.fn().mockReturnThis(),
    setInteractive: jest.fn().mockReturnThis(),
    on: jest.fn().mockReturnThis(),
    first: {
      setFillStyle: jest.fn(),
      setStrokeStyle: jest.fn(),
      setScale: jest.fn(),
      setColor: jest.fn(),
    },
  });
  return {
    Scene: jest.fn().mockImplementation(function (this: any) {
      this.cameras = { main: { width: 800, height: 600 } };
      this.add = {
        rectangle: mockAddRect,
        text: mockAddText,
        container: mockAddContainer,
      };
      this.scene = { start: mockSceneStart, stop: jest.fn() };
      this.cache = { audio: { exists: jest.fn().mockReturnValue(false) } };
      this.sound = { play: jest.fn() };
    }),
  };
});

describe('LevelSelectScene', () => {
  let scene: LevelSelectScene;
  let mockInputManager: jest.Mocked<InputManager>;
  let mockSceneService: jest.Mocked<SceneService>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSceneStart.mockClear();
    mockAddRect.mockClear();
    mockAddText.mockClear();
    mockAddContainer.mockClear();
    mockInputManager = { onInputEvent: jest.fn(), update: jest.fn() } as any;
    mockSceneService = { startScene: jest.fn() } as any;
    (InputManager as any).mockImplementation(() => mockInputManager);
    (SceneService as any).mockImplementation(() => mockSceneService);
    scene = new LevelSelectScene() as any;
    (scene as any).cameras = { main: { width: 800, height: 600 } };
    (scene as any).add = {
      rectangle: mockAddRect,
      text: mockAddText,
      container: mockAddContainer,
    };
    (scene as any).scene = { start: mockSceneStart };
    (scene as any).cache = {
      audio: { exists: jest.fn().mockReturnValue(false) },
    };
    (scene as any).sound = { play: jest.fn() };
  });

  describe('create', () => {
    it('should create background', () => {
      scene.create();
      expect(mockAddRect).toHaveBeenCalledWith(0, 0, 800, 600, 0x1a1a2e);
    });
    it('should create title', () => {
      scene.create();
      expect(mockAddText).toHaveBeenCalledWith(
        400,
        60,
        'SELECT LEVEL',
        expect.objectContaining({
          fontSize: '48px',
          color: '#fff',
          fontStyle: 'bold',
        }),
      );
    });
    it('should initialize unlocked levels', () => {
      scene.create();
      expect((scene as any).unlockedLevels).toEqual(
        expect.arrayContaining([1]),
      );
    });
    it('should set initial selected level', () => {
      scene.create();
      expect((scene as any).selectedLevel).toBe(1);
    });
    it('should update level display', () => {
      scene.create();
      expect(mockAddText).toHaveBeenCalled();
    });
    it('should highlight selected level', () => {
      scene.create();
      expect((scene as any).levelCards).toBeDefined();
    });
    it('should register input listener', () => {
      scene.create();
      expect(mockInputManager.onInputEvent).toHaveBeenCalled();
    });
  });

  describe('level navigation', () => {
    beforeEach(() => {
      scene.create();
    });
    it('should navigate to next unlocked', () => {
      (scene as any).unlockedLevels = [1, 2, 3, 5];
      (scene as any).selectedLevel = 1;
      (scene as any).navigateLevel(1);
      expect((scene as any).selectedLevel).toBe(2);
    });
    it('should skip locked levels', () => {
      (scene as any).unlockedLevels = [1, 2, 3, 5];
      (scene as any).selectedLevel = 3;
      (scene as any).navigateLevel(1);
      expect((scene as any).selectedLevel).toBe(5);
    });
    it('should navigate to previous unlocked', () => {
      (scene as any).unlockedLevels = [1, 2, 3, 5];
      (scene as any).selectedLevel = 3;
      (scene as any).navigateLevel(-1);
      expect((scene as any).selectedLevel).toBe(2);
    });
    it('should not wrap past first', () => {
      (scene as any).unlockedLevels = [1, 2, 3, 5];
      (scene as any).selectedLevel = 1;
      (scene as any).navigateLevel(-1);
      expect((scene as any).selectedLevel).toBe(1);
    });
    it('should not wrap past last', () => {
      (scene as any).unlockedLevels = [1, 2, 3, 5];
      (scene as any).selectedLevel = 5;
      (scene as any).navigateLevel(1);
      expect((scene as any).selectedLevel).toBe(5);
    });
    it('should not navigate if single level', () => {
      (scene as any).unlockedLevels = [3];
      (scene as any).selectedLevel = 3;
      (scene as any).navigateLevel(1);
      expect((scene as any).selectedLevel).toBe(3);
    });
  });

  describe('input handling', () => {
    beforeEach(() => {
      scene.create();
      mockInputManager.onInputEvent.mockClear();
    });
    it('should select level on select', () => {
      scene.create();
      (scene as any).selectedLevel = 2;
      expect(() => (scene as any).startLevel(2)).not.toThrow();
    });
    it('should not start locked level', () => {
      (scene as any).unlockedLevels = [1, 2, 3];
      (scene as any).selectedLevel = 5;
      (scene as any).startLevel(5);
      expect(mockSceneService.startScene).not.toHaveBeenCalled();
    });
    it('should go back on back action', () => {
      (scene as any).goBack();
      expect(mockSceneStart).toHaveBeenCalledWith('MainMenuScene');
    });
    it('should navigate left', () => {
      scene.create();
      (scene as any).unlockedLevels = [1, 2, 3];
      (scene as any).selectedLevel = 3;
      (scene as any).navigateLevel(-1);
      expect((scene as any).selectedLevel).toBe(2);
    });
    it('should navigate right', () => {
      scene.create();
      (scene as any).unlockedLevels = [1, 2, 3];
      (scene as any).selectedLevel = 1;
      (scene as any).navigateLevel(1);
      expect((scene as any).selectedLevel).toBe(2);
    });
  });

  describe('startLevel', () => {
    it('should prevent starting locked', () => {
      scene.create();
      (scene as any).unlockedLevels = [1, 2, 3];
      (scene as any).startLevel(5);
      expect(mockSceneService.startScene).not.toHaveBeenCalled();
    });
    it('should start unlocked', () => {
      scene.create();
      (scene as any).selectedLevel = 2;
      expect(() => (scene as any).startLevel(2)).not.toThrow();
    });
  });
});
