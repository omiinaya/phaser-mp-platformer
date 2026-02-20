import {
  PhysicsManager,
  ArcadePhysicsConfig,
  CollisionGroup,
} from '../../../src/core/PhysicsManager';

// Mock Phaser
jest.mock('phaser', () => ({
  Scene: jest.fn(),
  Physics: {
    Arcade: {
      ArcadePhysics: jest.fn(),
    },
  },
}));

describe('PhysicsManager', () => {
  let mockScene: any;
  let mockPhysics: any;
  let mockWorld: any;
  let physicsManager: PhysicsManager;

  beforeEach(() => {
    mockWorld = {
      gravity: {
        set: jest.fn(),
      },
      drawDebug: false,
      isPaused: false,
      createDebugGraphic: jest.fn(),
      setBounds: jest.fn(),
      pause: jest.fn(),
      resume: jest.fn(),
    };

    mockPhysics = {
      add: {
        existing: jest.fn(),
        collider: jest.fn(),
        overlap: jest.fn(),
        staticGroup: jest.fn().mockReturnValue({}),
        group: jest.fn().mockReturnValue({}),
      },
      world: mockWorld,
    };

    mockScene = {
      add: {
        graphics: jest.fn().mockReturnValue({
          destroy: jest.fn(),
        }),
      },
      physics: mockPhysics,
    };
  });

  describe('constructor', () => {
    it('should initialize with default config', () => {
      physicsManager = new PhysicsManager(mockScene);
      expect(physicsManager).toBeInstanceOf(PhysicsManager);
    });

    it('should initialize with custom config', () => {
      const config: ArcadePhysicsConfig = {
        gravity: { x: 100, y: 200 },
        debug: true,
      };
      physicsManager = new PhysicsManager(mockScene, config);
      expect(physicsManager).toBeInstanceOf(PhysicsManager);
    });
  });

  describe('enableDebug', () => {
    it('should enable debug rendering', () => {
      physicsManager = new PhysicsManager(mockScene);
      physicsManager.enableDebug();
      expect(mockWorld.drawDebug).toBe(true);
    });

    it('should not recreate debug graphics if already enabled', () => {
      physicsManager = new PhysicsManager(mockScene);
      physicsManager.enableDebug();
      physicsManager.enableDebug();
      expect(mockScene.add.graphics).toHaveBeenCalledTimes(1);
    });
  });

  describe('disableDebug', () => {
    it('should disable debug rendering', () => {
      physicsManager = new PhysicsManager(mockScene);
      physicsManager.enableDebug();
      physicsManager.disableDebug();
      expect(mockWorld.drawDebug).toBe(false);
    });
  });

  describe('setGravity', () => {
    it('should set gravity values', () => {
      physicsManager = new PhysicsManager(mockScene);
      physicsManager.setGravity(100, 200);
      expect(mockWorld.gravity.set).toHaveBeenCalledWith(100, 200);
    });
  });

  describe('enableBody', () => {
    it('should enable physics body for an object', () => {
      physicsManager = new PhysicsManager(mockScene);
      const mockObj = {} as any;
      physicsManager.enableBody(mockObj, false);
      expect(mockPhysics.add.existing).toHaveBeenCalledWith(mockObj, false);
    });

    it('should enable static body when specified', () => {
      physicsManager = new PhysicsManager(mockScene);
      const mockObj = {} as any;
      physicsManager.enableBody(mockObj, true);
      expect(mockPhysics.add.existing).toHaveBeenCalledWith(mockObj, true);
    });
  });

  describe('disableBody', () => {
    it('should disable physics body for an object', () => {
      physicsManager = new PhysicsManager(mockScene);
      const mockBody = { enable: true };
      const mockObj = { body: mockBody } as any;
      physicsManager.disableBody(mockObj);
      expect(mockBody.enable).toBe(false);
    });

    it('should handle object without body', () => {
      physicsManager = new PhysicsManager(mockScene);
      const mockObj = {} as any;
      expect(() => physicsManager.disableBody(mockObj)).not.toThrow();
    });
  });

  describe('setCollision', () => {
    it('should set collision between objects', () => {
      physicsManager = new PhysicsManager(mockScene);
      const mockObjA = {} as any;
      const mockObjB = {} as any;
      const callback = jest.fn();
      physicsManager.setCollision(mockObjA, mockObjB, callback);
      expect(mockPhysics.add.collider).toHaveBeenCalledWith(
        mockObjA,
        mockObjB,
        callback,
        undefined,
      );
    });

    it('should set collision with process callback', () => {
      physicsManager = new PhysicsManager(mockScene);
      const mockObjA = {} as any;
      const mockObjB = {} as any;
      const callback = jest.fn();
      const processCallback = jest.fn();
      physicsManager.setCollision(
        mockObjA,
        mockObjB,
        callback,
        processCallback,
      );
      expect(mockPhysics.add.collider).toHaveBeenCalledWith(
        mockObjA,
        mockObjB,
        callback,
        processCallback,
      );
    });
  });

  describe('setOverlap', () => {
    it('should set overlap between objects', () => {
      physicsManager = new PhysicsManager(mockScene);
      const mockObjA = {} as any;
      const mockObjB = {} as any;
      const callback = jest.fn();
      physicsManager.setOverlap(mockObjA, mockObjB, callback);
      expect(mockPhysics.add.overlap).toHaveBeenCalledWith(
        mockObjA,
        mockObjB,
        callback,
        undefined,
      );
    });
  });

  describe('collision groups', () => {
    it('should create collision group', () => {
      physicsManager = new PhysicsManager(mockScene);
      const group: CollisionGroup = { name: 'players', category: 1, mask: 2 };
      physicsManager.createCollisionGroup(group);
      const retrieved = physicsManager.getCollisionGroup('players');
      expect(retrieved).toEqual(group);
    });

    it('should return undefined for non-existent group', () => {
      physicsManager = new PhysicsManager(mockScene);
      const retrieved = physicsManager.getCollisionGroup('nonexistent');
      expect(retrieved).toBeUndefined();
    });
  });

  describe('setCollisionFilter', () => {
    it('should set collision category and mask', () => {
      physicsManager = new PhysicsManager(mockScene);
      const mockBody = {
        collisionCategory: 0,
        collisionMask: 0,
      } as any;
      physicsManager.setCollisionFilter(mockBody, 1, 2);
      expect(mockBody.collisionCategory).toBe(1);
      expect(mockBody.collisionMask).toBe(2);
    });
  });

  describe('createStaticGroup', () => {
    it('should create static group', () => {
      physicsManager = new PhysicsManager(mockScene);
      physicsManager.createStaticGroup();
      expect(mockPhysics.add.staticGroup).toHaveBeenCalled();
    });
  });

  describe('createGroup', () => {
    it('should create dynamic group', () => {
      physicsManager = new PhysicsManager(mockScene);
      physicsManager.createGroup();
      expect(mockPhysics.add.group).toHaveBeenCalled();
    });
  });

  describe('pause and resume', () => {
    it('should pause physics', () => {
      physicsManager = new PhysicsManager(mockScene);
      physicsManager.pause();
      expect(mockWorld.pause).toHaveBeenCalled();
    });

    it('should resume physics', () => {
      physicsManager = new PhysicsManager(mockScene);
      physicsManager.resume();
      expect(mockWorld.resume).toHaveBeenCalled();
    });

    it('should report paused state', () => {
      physicsManager = new PhysicsManager(mockScene);
      mockWorld.isPaused = true;
      expect(physicsManager.isPaused()).toBe(true);
    });
  });

  describe('setBounds', () => {
    it('should set world bounds', () => {
      physicsManager = new PhysicsManager(mockScene);
      physicsManager.setBounds(0, 0, 800, 600);
      expect(mockWorld.setBounds).toHaveBeenCalledWith(0, 0, 800, 600, true);
    });

    it('should set world bounds without collision', () => {
      physicsManager = new PhysicsManager(mockScene);
      physicsManager.setBounds(0, 0, 800, 600, false);
      expect(mockWorld.setBounds).toHaveBeenCalledWith(0, 0, 800, 600, false);
    });
  });

  describe('setBodyCollisionWithBounds', () => {
    it('should set body collision with bounds', () => {
      physicsManager = new PhysicsManager(mockScene);
      const mockBody = {
        setCollideWorldBounds: jest.fn(),
      } as any;
      physicsManager.setBodyCollisionWithBounds(mockBody);
      expect(mockBody.setCollideWorldBounds).toHaveBeenCalledWith(
        true,
        true,
        true,
        true,
        true,
      );
    });

    it('should set body collision with custom bounds', () => {
      physicsManager = new PhysicsManager(mockScene);
      const mockBody = {
        setCollideWorldBounds: jest.fn(),
      } as any;
      physicsManager.setBodyCollisionWithBounds(
        mockBody,
        false,
        true,
        true,
        false,
      );
      expect(mockBody.setCollideWorldBounds).toHaveBeenCalledWith(
        true,
        false,
        true,
        true,
        false,
      );
    });
  });
});
