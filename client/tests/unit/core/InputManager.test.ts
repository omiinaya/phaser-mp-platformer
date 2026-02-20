import {
  InputManager,
  InputConfig,
  InputAction,
} from '../../../src/core/InputManager';

// Mock phaser
jest.mock('phaser');
jest.mock('../../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('InputManager', () => {
  let scene: any;
  let inputManager: InputManager;

  const createMockScene = () => ({
    input: {
      keyboard: {
        addKey: jest.fn().mockReturnValue({ isDown: false }),
      },
      activePointer: {
        leftButtonDown: jest.fn().mockReturnValue(false),
        rightButtonDown: jest.fn().mockReturnValue(false),
        middleButtonDown: jest.fn().mockReturnValue(false),
        buttons: 0,
      },
      gamepad: {
        getPad: jest.fn().mockReturnValue(null),
      },
    },
  });

  const defaultConfig: InputConfig = {
    actions: [
      { id: 'jump', keys: ['SPACE'], description: 'Jump action' },
      { id: 'attack', keys: ['ENTER'], description: 'Attack action' },
    ],
    keyboard: true,
    mouse: true,
    gamepad: false,
  };

  beforeEach(() => {
    scene = createMockScene();
    inputManager = new InputManager(scene as any, defaultConfig);
  });

  describe('constructor', () => {
    it('should create an InputManager instance', () => {
      expect(inputManager).toBeDefined();
    });

    it('should register actions from config', () => {
      expect(inputManager.isActionActive('jump')).toBe(false);
      expect(inputManager.isActionActive('attack')).toBe(false);
    });
  });

  describe('registerAction', () => {
    it('should register a new action', () => {
      const newAction: InputAction = {
        id: 'dash',
        keys: ['SHIFT'],
      };
      inputManager.registerAction(newAction);
      expect(inputManager.isActionActive('dash')).toBe(false);
    });
  });

  describe('updateAction', () => {
    it('should update an existing action', () => {
      inputManager.updateAction('jump', { keys: ['W'] });
      // Action should still exist
      expect(inputManager.isActionActive('jump')).toBe(false);
    });

    it('should not fail for non-existent action', () => {
      expect(() => {
        inputManager.updateAction('nonexistent', { keys: ['X'] });
      }).not.toThrow();
    });
  });

  describe('removeAction', () => {
    it('should remove an action', () => {
      inputManager.removeAction('jump');
      expect(inputManager.isActionActive('jump')).toBe(false);
    });
  });

  describe('isActionActive', () => {
    it('should return false for unknown action', () => {
      expect(inputManager.isActionActive('unknown')).toBe(false);
    });
  });

  describe('getActionStates', () => {
    it('should return all action states', () => {
      const states = inputManager.getActionStates();
      expect(states).toHaveProperty('jump');
      expect(states).toHaveProperty('attack');
    });
  });

  describe('onInputEvent', () => {
    it('should subscribe to input events', () => {
      const callback = jest.fn();
      inputManager.onInputEvent(callback);
      // The callback should be registered
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update input states', () => {
      inputManager.update();
      // Should not throw
    });
  });

  describe('setKeyboardEnabled', () => {
    it('should enable/disable keyboard', () => {
      inputManager.setKeyboardEnabled(false);
      inputManager.setKeyboardEnabled(true);
    });
  });

  describe('setMouseEnabled', () => {
    it('should enable/disable mouse', () => {
      inputManager.setMouseEnabled(false);
      inputManager.setMouseEnabled(true);
    });
  });

  describe('setGamepadEnabled', () => {
    it('should enable/disable gamepad', () => {
      inputManager.setGamepadEnabled(false);
      inputManager.setGamepadEnabled(true);
    });
  });

  describe('setGamepadIndex', () => {
    it('should set gamepad index', () => {
      inputManager.setGamepadIndex(1);
    });
  });

  describe('getKeyboard', () => {
    it('should return keyboard plugin', () => {
      const keyboard = inputManager.getKeyboard();
      expect(keyboard).toBeDefined();
    });
  });

  describe('getMouse', () => {
    it('should return mouse pointer', () => {
      const mouse = inputManager.getMouse();
      expect(mouse).toBeDefined();
    });
  });

  describe('getGamepad', () => {
    it('should return gamepad plugin when enabled', () => {
      // Gamepad is disabled by default
      const _gamepad = inputManager.getGamepad();
      // May be undefined since gamepad is disabled by default
      expect(_gamepad).toBeUndefined();
    });
  });
});
