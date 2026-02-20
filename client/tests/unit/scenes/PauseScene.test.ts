import { PauseScene, PauseSceneData } from '../../../src/scenes/PauseScene';
import { InputManager, InputConfig } from '../../../src/core/InputManager';
import { SceneService } from '../../../src/core/SceneManager';
import { eventBus } from '../../../src/core/EventBus';
import { logger } from '../../../src/utils/logger';

// Declare mocks (using var to avoid TDZ with hoisted jest.mock)
var mockSceneStart: jest.Mock;
var mockSceneStop: jest.Mock;
var mockAddRectangle: jest.Mock;
var mockAddText: jest.Mock;

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
    resumeScene: jest.fn(),
  })),
}));

jest.mock('../../../src/core/EventBus', () => ({
  eventBus: {
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
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

// Mock Phaser
jest.mock('phaser', () => {
  mockSceneStart = jest.fn();
  mockSceneStop = jest.fn();
  mockAddRectangle = jest.fn().mockReturnValue({
    setOrigin: jest.fn().mockReturnThis(),
    setScrollFactor: jest.fn().mockReturnThis(),
    setAlpha: jest.fn().mockReturnThis(),
  });
  mockAddText = jest.fn().mockReturnValue({
    setOrigin: jest.fn().mockReturnThis(),
    setScrollFactor: jest.fn().mockReturnThis(),
    setColor: jest.fn().mockReturnThis(),
    setScale: jest.fn().mockReturnThis(),
    setInteractive: jest.fn().mockReturnThis(),
    on: jest.fn().mockReturnThis(),
  });

  return {
    Scene: jest.fn().mockImplementation(function (this: any) {
      this.cameras = { main: { width: 800, height: 600 } };
      this.add = { rectangle: mockAddRectangle, text: mockAddText };
      this.scene = { start: mockSceneStart, stop: mockSceneStop };
    }),
  };
});

describe('PauseScene', () => {
  let scene: PauseScene;
  let mockInputManager: jest.Mocked<InputManager>;
  let mockSceneService: jest.Mocked<SceneService>;

  beforeEach(() => {
    jest.clearAllMocks();
    (eventBus.on as jest.Mock).mockClear();
    (eventBus.off as jest.Mock).mockClear();
    (eventBus.emit as jest.Mock).mockClear();
    if (mockSceneStart) mockSceneStart.mockClear();
    if (mockSceneStop) mockSceneStop.mockClear();
    if (mockAddRectangle) mockAddRectangle.mockClear();
    if (mockAddText) mockAddText.mockClear();

    mockInputManager = {
      onInputEvent: jest.fn(),
      update: jest.fn(),
    } as any;

    mockSceneService = {
      startScene: jest.fn(),
      resumeScene: jest.fn(),
    } as any;

    (InputManager as any).mockImplementation(() => mockInputManager);
    (SceneService as any).mockImplementation(() => mockSceneService);

    scene = new PauseScene() as any;
    (scene as any).cameras = { main: { width: 800, height: 600 } };
    (scene as any).add = { rectangle: mockAddRectangle, text: mockAddText };
    (scene as any).scene = { start: mockSceneStart, stop: mockSceneStop };
    (scene as any).eventBus = eventBus;
    (scene as any).selectedIndex = 0;
    (scene as any).menuItems = [
      {
        text: { setColor: jest.fn(), setScale: jest.fn() },
        action: () => mockSceneService.resumeScene('GameScene'),
      },
      {
        text: { setColor: jest.fn(), setScale: jest.fn() },
        action: () =>
          mockSceneService.startScene({
            target: 'GameScene',
            stopCurrent: false,
          }),
      },
      {
        text: { setColor: jest.fn(), setScale: jest.fn() },
        action: () => process.exit(0),
      },
    ];
  });

  describe('create', () => {
    it('should create semi-transparent overlay', () => {
      scene.create();

      expect(mockAddRectangle).toHaveBeenCalledWith(
        0,
        0,
        800,
        600,
        expect.any(Number),
        0.7,
      );
    });

    it('should create pause title', () => {
      scene.create();

      expect(mockAddText).toHaveBeenCalledWith(
        400,
        150,
        'PAUSED',
        expect.objectContaining({
          fontSize: '64px',
          color: '#fff',
        }),
      );
    });

    it('should create menu items', () => {
      scene.create();

      // Should have called add.text at least 3 times for menu items
      const calls = mockAddText.mock.calls;
      const menuCalls = calls.filter(
        (call) =>
          call[2] &&
          ['Resume', 'Restart Level', 'Main Menu'].includes(call[2] as string),
      );
      expect(menuCalls.length).toBe(3);
    });

    it('should register input callback', () => {
      scene.create();

      expect(mockInputManager.onInputEvent).toHaveBeenCalled();
    });
  });

  describe('input handling', () => {
    beforeEach(() => {
      // Create the scene which registers the input callback
      scene.create();
    });

    it('should navigate up on up action', () => {
      const inputCallback = mockInputManager.onInputEvent.mock.calls[0][0];
      (scene as any).selectedIndex = 1;

      inputCallback({ action: 'up', active: true, source: 'keyboard' });

      expect((scene as any).selectedIndex).toBe(0);
    });

    it('should navigate down on down action', () => {
      const inputCallback = mockInputManager.onInputEvent.mock.calls[0][0];
      (scene as any).selectedIndex = 0;

      inputCallback({ action: 'down', active: true, source: 'keyboard' });

      expect((scene as any).selectedIndex).toBe(1);
    });

    it('should select menu item on select action', () => {
      const mockAction = jest.fn();
      (scene as any).menuItems[1].action = mockAction;
      (scene as any).selectedIndex = 1;

      const inputCallback = mockInputManager.onInputEvent.mock.calls[0][0];
      inputCallback({ action: 'select', active: true, source: 'keyboard' });

      expect(mockAction).toHaveBeenCalled();
    });

    it('should resume game on back action', () => {
      (scene as any).pauseData = { fromScene: 'GameScene' };
      const inputCallback = mockInputManager.onInputEvent.mock.calls[0][0];

      inputCallback({ action: 'back', active: true, source: 'keyboard' });

      expect(eventBus.emit).toHaveBeenCalledWith('game:resume');
    });

    it('should ignore inactive input events', () => {
      const inputCallback = mockInputManager.onInputEvent.mock.calls[0][0];
      inputCallback({ action: 'up', active: false, source: 'keyboard' });

      expect((scene as any).selectedIndex).toBe(0); // unchanged
    });
  });

  describe('destroy', () => {
    it('should unsubscribe from eventBus', () => {
      scene.destroy();
      expect(eventBus.off).toHaveBeenCalled();
    });
  });
});
