import { LevelSelectScene, LevelSelectSceneData } from '../../../src/scenes/LevelSelectScene';
import { InputManager, InputConfig } from '../../../src/core/InputManager';
import { SceneService } from '../../../src/core/SceneManager';
import { LEVEL_CONFIGS } from '../../../src/core/LevelManager';

// Mock dependencies
jest.mock('../../../src/core/InputManager', () => ({
  InputManager: jest.fn().mockImplementation(() => ({
    onInputEvent: jest.fn(),
    update: jest.fn(),
  })),
  InputConfig: {},
}));

jest.mock('../../../src/core/SceneManager', () => ({
  SceneService: jest.fn().mockImplementation(() => ({
    startScene: jest.fn(),
  })),
}));

// Mock LEVEL_CONFIGS
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

// Mock logger
jest.mock('../../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
  },
}));

// Declare mocks
var mockSceneStart: jest.Mock;
var mockAddRect: jest.Mock;
var mockAddText: jest.Mock;
var mockAddContainer: jest.Mock;

// Mock Phaser
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
    first: { setFillStyle: jest.fn(), setStrokeStyle: jest.fn(), setScale: jest.fn(), setColor: jest.fn() },
  });

  return {
    Scene: jest.fn().mockImplementation(function(this: any) {
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
    if (mockSceneStart) mockSceneStart.mockClear();
    if (mockAddRect) mockAddRect.mockClear();
    if (mockAddText) mockAddText.mockClear();
    if (mockAddContainer) mockAddContainer.mockClear();

    mockInputManager = {
      onInputEvent: jest.fn(),
      update: jest.fn(),
    } as any;

    mockSceneService = {
      startScene: jest.fn(),
    } as any;

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
    (scene as any).cache = { audio: { exists: jest.fn().mockReturnValue(false) } };
    (scene as any).sound = { play: jest.fn() };
  });

  describe('create', () => {
    it('should create background', () => {
      scene.create();

      expect(mockAddRect).toHaveBeenCalledWith(
        0,
        0,
        800,
        600,
        0x1a1a2e,
        expect.any(Object)
      );
    });

    it('should create title', () => {
      scene.create();

      expect(mockAddText).toHaveBeenCalledWith(
        400,
        80,
        'SELECT LEVEL',
        expect.objectContaining({
          fontSize: '48px',
          color: '#fff',
        })
      );
    });

    it('should initialize unlocked levels from SaveManager', () => {
      scene.create();

      expect((scene as any).unlockedLevels).toEqual(expect.arrayContaining([1, 2, 3, 4, 5]));
    });

    it('should set initial selected level to first unlocked', () => {
      scene.create();

      expect((scene as any).selectedLevel).toBe(1);
    });

    it('should update level display', () => {
      scene.create();

      // Check that setText was called on some text objects to show level info
      const textCalls = mockAddText.mock.calls;
      const levelTextCalls = textCalls.filter(call => 
        call[1] && typeof call[1] === 'string' && call[1].includes('Level')
      );
      expect(levelTextCalls.length).toBeGreaterThan(0);
    });

    it('should highlight selected level', () => {
      scene.create();

      // Check that setColor was called with highlight color for selected level
      const returnedTexts = mockAddText.mock.results.map(r => r.value);
      const setColorCalls = returnedTexts.flatMap(text => 
        text?.setColor ? [text.setColor] : []
      );
      // Check that at least one setColor call used the highlight color
      expect(setColorCalls.some((call) => call.mock.calls.some((args: any) => args[0] === '#ffd700'))).toBeTruthy();
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

    it('should navigate to next unlocked level', () => {
      (scene as any).unlockedLevels = [1, 2, 3, 5];
      (scene as any).selectedLevel = 1;

      (scene as any).navigateLevel(1);

      expect((scene as any).selectedLevel).toBe(2);
    });

    it('should skip locked levels when navigating', () => {
      (scene as any).unlockedLevels = [1, 2, 3, 5];
      (scene as any).selectedLevel = 3;

      (scene as any).navigateLevel(1);

      expect((scene as any).selectedLevel).toBe(5); // Skips 4
    });

    it('should navigate to previous unlocked level', () => {
      (scene as any).unlockedLevels = [1, 2, 3, 5];
      (scene as any).selectedLevel = 3;

      (scene as any).navigateLevel(-1);

      expect((scene as any).selectedLevel).toBe(2);
    });

    it('should wrap to last unlocked level when going past first', () => {
      (scene as any).unlockedLevels = [1, 2, 3, 5];
      (scene as any).selectedLevel = 1;

      (scene as any).navigateLevel(-1);

      expect((scene as any).selectedLevel).toBe(5); // Wraps to last unlocked
    });

    it('should wrap to first unlocked level when going past last', () => {
      (scene as any).unlockedLevels = [1, 2, 3, 5];
      (scene as any).selectedLevel = 5;

      (scene as any).navigateLevel(1);

      expect((scene as any).selectedLevel).toBe(1);
    });

    it('should not navigate if only one unlocked level', () => {
      (scene as any).unlockedLevels = [3];
      (scene as any).selectedLevel = 3;

      (scene as any).navigateLevel(1);

      expect((scene as any).selectedLevel).toBe(3); // Still same
    });
  });

  describe('input handling', () => {
    beforeEach(() => {
      scene.create();
      mockInputManager.onInputEvent.mockClear();
    });

    it('should select level on select action', () => {
      const inputCallback = mockInputManager.onInputEvent.mock.calls[0][0];
      (scene as any).selectedLevel = 2;

      inputCallback({ action: 'select', active: true, source: 'keyboard' });

      expect(mockSceneService.startScene).toHaveBeenCalledWith({
        target: 'GameScene',
        stopCurrent: true,
        data: { level: 2 },
      });
    });

    it('should not start locked level', () => {
      const inputCallback = mockInputManager.onInputEvent.mock.calls[0][0];
      (scene as any).unlockedLevels = [1, 2, 3];
      (scene as any).selectedLevel = 5; // locked

      inputCallback({ action: 'select', active: true, source: 'keyboard' });

      expect(mockSceneService.startScene).not.toHaveBeenCalled();
    });

    it('should go back on back action', () => {
      const inputCallback = mockInputManager.onInputEvent.mock.calls[0][0];

      inputCallback({ action: 'back', active: true, source: 'keyboard' });

      expect(mockSceneStart).toHaveBeenCalledWith('MainMenuScene');
    });

    it('should navigate left', () => {
      const inputCallback = mockInputManager.onInputEvent.mock.calls[0][0];
      (scene as any).selectedLevel = 3;

      inputCallback({ action: 'left', active: true, source: 'keyboard' });

      expect((scene as any).selectedLevel).toBe(2);
    });

    it('should navigate right', () => {
      const inputCallback = mockInputManager.onInputEvent.mock.calls[0][0];
      (scene as any).selectedLevel = 1;

      inputCallback({ action: 'right', active: true, source: 'keyboard' });

      expect((scene as any).selectedLevel).toBe(2);
    });
  });

  describe('startLevel', () => {
    it('should prevent starting locked level', () => {
      scene.create();
      (scene as any).unlockedLevels = [1, 2, 3];
      (scene as any).selectedLevel = 5;

      (scene as any).startLevel();

      expect(mockSceneService.startScene).not.toHaveBeenCalled();
    });

    it('should start unlocked level', () => {
      scene.create();
      (scene as any).selectedLevel = 2;

      (scene as any).startLevel();

      expect(mockSceneService.startScene).toHaveBeenCalledWith({
        target: 'GameScene',
        stopCurrent: true,
        data: { level: 2 },
      });
    });
  });
});
