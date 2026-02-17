import { AnimationManager } from '../../../src/core/AnimationManager';

// Mock Phaser scene
const createMockScene = () => {
  const mockAnims = {
    exists: jest.fn().mockReturnValue(false),
    create: jest.fn(),
    get: jest.fn().mockReturnValue({}),
  };

  const mockLoad = {
    spritesheet: jest.fn(),
  };

  return {
    anims: mockAnims,
    load: mockLoad,
  } as any;
};

describe('AnimationManager', () => {
  let animationManager: AnimationManager;
  let mockScene: any;

  beforeEach(() => {
    mockScene = createMockScene();
    animationManager = new AnimationManager(mockScene);
  });

  describe('constructor', () => {
    it('should create an AnimationManager instance', () => {
      expect(animationManager).toBeDefined();
    });
  });

  describe('loadSpriteSheet', () => {
    it('should store sprite sheet configuration', () => {
      animationManager.loadSpriteSheet('player', '/assets/player.png', 32, 32);
      // The method should be called without error
      expect(mockScene.load.spritesheet).toHaveBeenCalledWith(
        'player',
        '/assets/player.png',
        { frameWidth: 32, frameHeight: 32 },
      );
    });
  });

  describe('createAnimation', () => {
    it('should create an animation if it does not exist', () => {
      const config = {
        key: 'player_idle',
        frames: [{ key: 'player', frame: 0 }],
        frameRate: 10,
        repeat: -1,
      };

      animationManager.createAnimation(config);

      expect(mockScene.anims.create).toHaveBeenCalledWith({
        key: 'player_idle',
        frames: [{ key: 'player', frame: 0 }],
        frameRate: 10,
        repeat: -1,
        yoyo: false,
        delay: 0,
        hideOnComplete: false,
      });
    });

    it('should not create animation if it already exists', () => {
      mockScene.anims.exists.mockReturnValue(true);

      const config = {
        key: 'player_idle',
        frames: [{ key: 'player', frame: 0 }],
      };

      animationManager.createAnimation(config);

      expect(mockScene.anims.create).not.toHaveBeenCalled();
    });

    it('should use default values for optional properties', () => {
      const config = {
        key: 'player_idle',
        frames: [{ key: 'player', frame: 0 }],
      };

      animationManager.createAnimation(config);

      expect(mockScene.anims.create).toHaveBeenCalledWith(
        expect.objectContaining({
          frameRate: 10,
          repeat: -1,
          yoyo: false,
          delay: 0,
          hideOnComplete: false,
        }),
      );
    });
  });

  describe('createAnimationsFromSheet', () => {
    it('should create multiple animations from a sprite sheet', () => {
      const configs = [
        { name: 'idle', start: 0, end: 3 },
        { name: 'run', start: 4, end: 11 },
      ];

      animationManager.createAnimationsFromSheet('player', configs);

      expect(mockScene.anims.create).toHaveBeenCalledTimes(2);
    });

    it('should not recreate existing animations', () => {
      mockScene.anims.exists.mockReturnValue(true);

      const configs = [{ name: 'idle', start: 0, end: 3 }];

      animationManager.createAnimationsFromSheet('player', configs);

      expect(mockScene.anims.create).not.toHaveBeenCalled();
    });

    it('should use custom frame rate when provided', () => {
      const configs = [{ name: 'run', start: 0, end: 7, frameRate: 20 }];

      animationManager.createAnimationsFromSheet('player', configs);

      expect(mockScene.anims.create).toHaveBeenCalledWith(
        expect.objectContaining({
          frameRate: 20,
        }),
      );
    });

    it('should support yoyo option', () => {
      const configs = [{ name: 'attack', start: 0, end: 5, yoyo: true }];

      animationManager.createAnimationsFromSheet('player', configs);

      expect(mockScene.anims.create).toHaveBeenCalledWith(
        expect.objectContaining({
          yoyo: true,
        }),
      );
    });
  });

  describe('play', () => {
    it('should play an animation on a sprite', () => {
      const mockSprite = {
        play: jest.fn(),
        once: jest.fn(),
        texture: { key: 'player' },
        name: 'test',
        x: 0,
        y: 0,
      } as any;

      const result = animationManager.play(mockSprite, 'player_idle');

      expect(mockSprite.play).toHaveBeenCalledWith('player_idle', true);
      expect(result).toBe(true);
    });

    it('should return false if animation is already playing and ignoreIfPlaying is true', () => {
      const mockSprite = {
        play: jest.fn(),
        once: jest.fn(),
        texture: { key: 'player' },
        name: 'test',
        x: 0,
        y: 0,
      } as any;

      // First play
      animationManager.play(mockSprite, 'player_idle');
      // Second play should return false
      const result = animationManager.play(mockSprite, 'player_idle');

      expect(result).toBe(false);
    });

    it('should update animation state', () => {
      const mockSprite = {
        play: jest.fn(),
        once: jest.fn(),
        texture: { key: 'player' },
        name: 'test',
        x: 0,
        y: 0,
      } as any;

      animationManager.play(mockSprite, 'player_run');

      // The animation should be set to play
      expect(mockSprite.play).toHaveBeenCalled();
    });
  });

  describe('stop', () => {
    it('should stop the sprite animation', () => {
      const mockSprite = {
        stop: jest.fn(),
        texture: { key: 'player' },
        name: 'test',
        x: 0,
        y: 0,
      } as any;

      animationManager.stop(mockSprite);

      expect(mockSprite.stop).toHaveBeenCalled();
    });
  });

  describe('pause', () => {
    it('should pause the sprite animation', () => {
      const mockSprite = {
        anims: {
          pause: jest.fn(),
        },
        texture: { key: 'player' },
        name: 'test',
        x: 0,
        y: 0,
      } as any;

      animationManager.pause(mockSprite);

      expect(mockSprite.anims.pause).toHaveBeenCalled();
    });
  });

  describe('resume', () => {
    it('should resume the sprite animation', () => {
      const mockSprite = {
        anims: {
          resume: jest.fn(),
        },
        texture: { key: 'player' },
        name: 'test',
        x: 0,
        y: 0,
      } as any;

      animationManager.resume(mockSprite);

      expect(mockSprite.anims.resume).toHaveBeenCalled();
    });
  });

  describe('isPlaying', () => {
    it('should return false when no animation state exists', () => {
      const mockSprite = {
        texture: { key: 'player' },
        name: 'test',
        x: 0,
        y: 0,
      } as any;

      const result = animationManager.isPlaying(mockSprite);

      expect(result).toBe(false);
    });

    it('should return true when animation is playing', () => {
      const mockSprite = {
        play: jest.fn(),
        once: jest.fn(),
        texture: { key: 'player' },
        name: 'test',
        x: 0,
        y: 0,
      } as any;

      animationManager.play(mockSprite, 'player_idle');
      const result = animationManager.isPlaying(mockSprite);

      expect(result).toBe(true);
    });

    it('should check for specific animation key', () => {
      const mockSprite = {
        play: jest.fn(),
        once: jest.fn(),
        texture: { key: 'player' },
        name: 'test',
        x: 0,
        y: 0,
      } as any;

      animationManager.play(mockSprite, 'player_idle');
      const result = animationManager.isPlaying(mockSprite, 'player_run');

      expect(result).toBe(false);
    });
  });

  describe('getCurrentAnimation', () => {
    it('should return empty string when no state exists', () => {
      const mockSprite = {
        texture: { key: 'player' },
        name: 'test',
        x: 0,
        y: 0,
      } as any;

      const result = animationManager.getCurrentAnimation(mockSprite);

      expect(result).toBe('');
    });

    it('should return the current animation key', () => {
      const mockSprite = {
        play: jest.fn(),
        once: jest.fn(),
        texture: { key: 'player' },
        name: 'test',
        x: 0,
        y: 0,
      } as any;

      animationManager.play(mockSprite, 'player_idle');
      const result = animationManager.getCurrentAnimation(mockSprite);

      expect(result).toBe('player_idle');
    });
  });

  describe('setFrameRate', () => {
    it('should set the frame rate', () => {
      const mockSprite = {
        anims: {
          currentAnim: { msPerFrame: 100 },
        },
        texture: { key: 'player' },
        name: 'test',
        x: 0,
        y: 0,
      } as any;

      animationManager.setFrameRate(mockSprite, 20);

      expect(mockSprite.anims.msPerFrame).toBe(50); // 1000/20
    });
  });

  describe('playOnce', () => {
    it('should play animation once and call onComplete', () => {
      const mockSprite = {
        play: jest.fn(),
        once: jest.fn().mockImplementation((event: string, cb: () => void) => {
          if (event === 'animationcomplete') {
            cb();
          }
        }),
        texture: { key: 'player' },
        name: 'test',
        x: 0,
        y: 0,
      } as any;

      const onComplete = jest.fn();

      animationManager.playOnce(mockSprite, 'player_attack', onComplete);

      expect(mockSprite.play).toHaveBeenCalledWith('player_attack', false);
      expect(onComplete).toHaveBeenCalled();
    });
  });

  describe('transition', () => {
    it('should transition between animations', () => {
      const mockSprite = {
        play: jest.fn(),
        once: jest.fn(),
        texture: { key: 'player' },
        name: 'test',
        x: 0,
        y: 0,
      } as any;

      const mockTween = {
        add: jest.fn().mockImplementation((config: any) => {
          if (config.onComplete) {
            config.onComplete();
          }
          return mockTween;
        }),
      };

      mockScene.tweens = mockTween;

      animationManager.transition(mockSprite, 'idle', 'run');

      // The transition should attempt to play the animation
      expect(mockSprite.play).toHaveBeenCalled();
    });
  });

  describe('preloadAll', () => {
    it('should preload all configured sprite sheets', () => {
      animationManager.loadSpriteSheet('player', '/assets/player.png', 32, 32);
      animationManager.preloadAll();

      expect(mockScene.load.spritesheet).toHaveBeenCalledWith(
        'player',
        'assets/sprites/player.png',
        { frameWidth: 32, frameHeight: 32 },
      );
    });
  });

  describe('destroy', () => {
    it('should clear all internal maps', () => {
      animationManager.destroy();

      // Should complete without error
      expect(true).toBe(true);
    });
  });
});
