// Jest setup file for client tests
import 'jest-canvas-mock';

// Mock Phaser - comprehensive mock for game development
const mockSprite = jest.fn().mockImplementation(function (this: any) {
  this.x = 0;
  this.y = 0;
  this.width = 32;
  this.height = 32;
  this.active = true;
  this.visible = true;
  this.alpha = 1;
  this.angle = 0;
  this.scaleX = 1;
  this.scaleY = 1;
  this.texture = { key: 'default' };
  this.setCollideWorldBounds = jest.fn().mockReturnThis();
  this.setBounce = jest.fn().mockReturnThis();
  this.setDrag = jest.fn().mockReturnThis();
  this.setVelocity = jest.fn().mockReturnThis();
  this.setPosition = jest.fn().mockReturnThis();
  this.setScale = jest.fn().mockReturnThis();
  this.setScaleX = jest.fn().mockReturnThis();
  this.setScaleY = jest.fn().mockReturnThis();
  this.setTint = jest.fn().mockReturnThis();
  this.setAlpha = jest.fn().mockReturnThis();
  this.setVisible = jest.fn().mockReturnThis();
  this.setActive = jest.fn().mockReturnThis();
  this.play = jest.fn().mockReturnThis();
  this.setFlipX = jest.fn().mockReturnThis();
  this.on = jest.fn().mockReturnThis();
  this.off = jest.fn().mockReturnThis();
  this.destroy = jest.fn();
  this.update = jest.fn();
  this.body = {
    setSize: jest.fn(),
    setOffset: jest.fn(),
    setImmovable: jest.fn(),
    setAllowGravity: jest.fn(),
    setEnable: jest.fn(),
    setCircle: jest.fn(),
    setVelocityX: jest.fn(),
    velocity: { x: 0, y: 0 },
    blocked: { down: false },
    touching: { down: false },
    enable: true,
    onWorldBounds: true,
  };
  this.anims = {
    play: jest.fn(),
    exists: jest.fn().mockReturnValue(true),
    create: jest.fn(),
  };
});

class MockVector2 {
  x = 0;
  y = 0;
  set(x: number, y: number) {
    this.x = x;
    this.y = y;
    return this;
  }
}

class MockVector3 {
  x = 0;
  y = 0;
  z = 0;
}

const Phaser = {
  Game: jest.fn(),
  Scene: jest.fn().mockImplementation(() => ({
    add: {
      sprite: jest.fn().mockReturnValue({
        setPosition: jest.fn().mockReturnThis(),
        setDepth: jest.fn().mockReturnThis(),
        destroy: jest.fn(),
      }),
      existing: jest.fn().mockReturnValue({
        body: {
          setImmovable: jest.fn(),
          setAllowGravity: jest.fn(),
          enable: true,
          setEnable: jest.fn(),
        },
      }),
    },
    physics: {
      add: {
        existing: jest.fn().mockReturnValue({
          body: {
            setImmovable: jest.fn(),
            setAllowGravity: jest.fn(),
            enable: true,
            setEnable: jest.fn(),
          },
        }),
      },
    },
    tweens: {
      add: jest.fn().mockReturnValue({
        destroy: jest.fn(),
      }),
    },
    time: {
      delayedCall: jest.fn(),
    },
    events: {
      emit: jest.fn(),
    },
    sound: {
      play: jest.fn(),
    },
    cameras: {
      main: {
        worldView: {
          x: 0,
          y: 0,
          width: 800,
          height: 600,
        },
      },
    },
  })),
  GameObjects: {
    Sprite: mockSprite,
  },
  Physics: {
    Arcade: {
      Sprite: mockSprite,
      Body: class MockBody {
        setSize = jest.fn();
        setOffset = jest.fn();
        velocity = { x: 0, y: 0 };
        blocked = { down: false };
        touching = { down: false };
        enable = true;
      },
    },
  },
  Math: {
    Vector2: MockVector2,
    Vector3: MockVector3,
    DegToRad: (deg: number) => (deg * Math.PI) / 180,
    RadToDeg: (rad: number) => (rad * 180) / Math.PI,
    Distance: {
      Between: jest.fn(),
    },
    Random: {
      UUID: () => 'test-uuid-' + Math.random().toString(36).substr(2, 9),
    },
  },
  Utils: {
    String: {
      UUID: () => 'test-uuid-' + Math.random().toString(36).substr(2, 9),
    },
  },
  Time: {
    TimerEvent: jest.fn(),
  },
  Tweens: {
    Tween: jest.fn(),
  },
  Cameras: {
    Scene2D: {
      Camera: jest.fn(),
    },
  },
};

jest.mock('phaser', () => Phaser);
jest.mock('phaser', () => Phaser);
jest.mock('phaser', () => Phaser);

const phaserModule = Phaser;
// Also set it as default export
Object.defineProperty(phaserModule, 'default', {
  value: Phaser,
});

// Make Phaser available globally when the module is imported
jest.mock('phaser', () => {
  return new Proxy(
    {},
    {
      get: (target, prop) => {
        if (prop === 'default') return Phaser;
        if (prop === '__esModule') return true;
        return (Phaser as any)[prop];
      },
    },
  );
});

// Mock socket.io-client
jest.mock('socket.io-client', () => ({
  io: jest.fn(() => ({
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
    disconnect: jest.fn(),
  })),
}));
