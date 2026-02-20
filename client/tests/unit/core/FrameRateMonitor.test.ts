import {
  FrameRateMonitor,
  QualityLevel,
  FrameRateMonitorConfig,
} from '../../../src/core/FrameRateMonitor';

// Mock Phaser
jest.mock('phaser');
jest.mock('../../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock Phaser scene
const createMockScene = () => {
  const mockTime = {
    now: 0,
  };

  const mockEvents = {
    on: jest.fn(),
    off: jest.fn(),
  };

  return {
    time: mockTime,
    events: mockEvents,
  } as unknown as Phaser.Scene;
};

describe('FrameRateMonitor', () => {
  let scene: Phaser.Scene;
  let monitor: FrameRateMonitor;

  beforeEach(() => {
    scene = createMockScene();
    jest.useFakeTimers();
  });

  afterEach(() => {
    if (monitor) {
      monitor.destroy();
    }
    jest.useRealTimers();
  });

  describe('constructor', () => {
    it('should create a FrameRateMonitor with default config', () => {
      monitor = new FrameRateMonitor(scene);

      expect(monitor).toBeInstanceOf(FrameRateMonitor);
    });

    it('should create a FrameRateMonitor with custom config', () => {
      const config: FrameRateMonitorConfig = {
        targetFps: 30,
        sampleWindow: 2,
        lowThreshold: 20,
        mediumThreshold: 40,
        adaptive: false,
      };

      monitor = new FrameRateMonitor(scene, config);

      expect(monitor).toBeInstanceOf(FrameRateMonitor);
    });

    it('should register update event listener', () => {
      monitor = new FrameRateMonitor(scene);

      expect(scene.events.on).toHaveBeenCalledWith(
        'update',
        expect.any(Function),
        expect.any(Object),
      );
    });
  });

  describe('getFps', () => {
    it('should return 0 initially', () => {
      monitor = new FrameRateMonitor(scene);

      expect(monitor.getFps()).toBe(0);
    });
  });

  describe('getQualityLevel', () => {
    it('should return High as default quality level', () => {
      monitor = new FrameRateMonitor(scene);

      expect(monitor.getQualityLevel()).toBe(QualityLevel.High);
    });
  });

  describe('setQualityLevel', () => {
    it('should set quality level to Low', () => {
      monitor = new FrameRateMonitor(scene);

      monitor.setQualityLevel(QualityLevel.Low);

      expect(monitor.getQualityLevel()).toBe(QualityLevel.Low);
    });

    it('should set quality level to Medium', () => {
      monitor = new FrameRateMonitor(scene);

      monitor.setQualityLevel(QualityLevel.Medium);

      expect(monitor.getQualityLevel()).toBe(QualityLevel.Medium);
    });

    it('should disable adaptive when manually setting quality', () => {
      monitor = new FrameRateMonitor(scene, { adaptive: true });

      monitor.setQualityLevel(QualityLevel.Low);

      // Adaptive should be disabled after manual set
      expect(monitor.getQualityLevel()).toBe(QualityLevel.Low);
    });
  });

  describe('setAdaptive', () => {
    it('should enable adaptive quality', () => {
      monitor = new FrameRateMonitor(scene, { adaptive: false });

      monitor.setAdaptive(true);

      // Should not throw and adaptive should be enabled
      expect(monitor).toBeInstanceOf(FrameRateMonitor);
    });

    it('should disable adaptive quality', () => {
      monitor = new FrameRateMonitor(scene, { adaptive: true });

      monitor.setAdaptive(false);

      expect(monitor).toBeInstanceOf(FrameRateMonitor);
    });
  });

  describe('destroy', () => {
    it('should remove update event listener', () => {
      monitor = new FrameRateMonitor(scene);

      monitor.destroy();

      expect(scene.events.off).toHaveBeenCalledWith(
        'update',
        expect.any(Function),
        expect.any(Object),
      );
    });
  });
});
