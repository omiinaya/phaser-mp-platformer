import {
  InterpolationService,
  EntitySnapshot,
  InterpolationConfig,
} from '../../../src/services/InterpolationService';

describe('InterpolationService', () => {
  let interpolationService: InterpolationService;

  beforeEach(() => {
    interpolationService = new InterpolationService();
  });

  describe('constructor', () => {
    it('should create InterpolationService with default config', () => {
      expect(interpolationService).toBeDefined();
    });

    it('should create InterpolationService with custom config', () => {
      const config: InterpolationConfig = {
        delay: 200,
        maxSnapshots: 20,
      };
      const service = new InterpolationService(config);
      expect(service).toBeDefined();
    });
  });

  describe('addSnapshot', () => {
    it('should add a snapshot for an entity', () => {
      const snapshot: EntitySnapshot = {
        timestamp: 1000,
        entityId: 'player-1',
        state: { x: 10, y: 20 },
      };
      interpolationService.addSnapshot('player-1', snapshot);
      const state = interpolationService.getInterpolatedState('player-1', 1100);
      expect(state).toEqual({ x: 10, y: 20 });
    });

    it('should keep snapshots sorted by timestamp', () => {
      interpolationService.addSnapshot('player-1', {
        timestamp: 2000,
        entityId: 'player-1',
        state: { x: 20 },
      });
      interpolationService.addSnapshot('player-1', {
        timestamp: 1000,
        entityId: 'player-1',
        state: { x: 10 },
      });
      const state = interpolationService.getInterpolatedState('player-1', 1500);
      expect(state).toBeDefined();
    });

    it('should trim excess snapshots', () => {
      const config: InterpolationConfig = {
        maxSnapshots: 3,
      };
      const service = new InterpolationService(config);

      service.addSnapshot('player-1', {
        timestamp: 1000,
        entityId: 'player-1',
        state: { x: 10 },
      });
      service.addSnapshot('player-1', {
        timestamp: 2000,
        entityId: 'player-1',
        state: { x: 20 },
      });
      service.addSnapshot('player-1', {
        timestamp: 3000,
        entityId: 'player-1',
        state: { x: 30 },
      });
      service.addSnapshot('player-1', {
        timestamp: 4000,
        entityId: 'player-1',
        state: { x: 40 },
      });

      // Should still work with trimmed snapshots
      const state = service.getInterpolatedState('player-1', 4500);
      expect(state).toBeDefined();
    });
  });

  describe('getInterpolatedState', () => {
    it('should return null for unknown entity', () => {
      const state = interpolationService.getInterpolatedState(
        'unknown',
        Date.now(),
      );
      expect(state).toBeNull();
    });

    it('should return latest snapshot if only one exists', () => {
      interpolationService.addSnapshot('player-1', {
        timestamp: 1000,
        entityId: 'player-1',
        state: { x: 10, y: 20 },
      });
      const state = interpolationService.getInterpolatedState('player-1', 1500);
      expect(state).toEqual({ x: 10, y: 20 });
    });

    it('should return first snapshot if render time is before all snapshots', () => {
      interpolationService.addSnapshot('player-1', {
        timestamp: 1000,
        entityId: 'player-1',
        state: { x: 10 },
      });
      interpolationService.addSnapshot('player-1', {
        timestamp: 2000,
        entityId: 'player-1',
        state: { x: 20 },
      });

      const state = interpolationService.getInterpolatedState('player-1', 500);
      expect(state.x).toBe(10);
    });

    it('should return last snapshot if render time is after all snapshots', () => {
      interpolationService.addSnapshot('player-1', {
        timestamp: 1000,
        entityId: 'player-1',
        state: { x: 10 },
      });
      interpolationService.addSnapshot('player-1', {
        timestamp: 2000,
        entityId: 'player-1',
        state: { x: 20 },
      });

      const state = interpolationService.getInterpolatedState('player-1', 3000);
      expect(state.x).toBe(20);
    });
  });

  describe('pruneOlderThan', () => {
    it('should remove old snapshots', () => {
      interpolationService.addSnapshot('player-1', {
        timestamp: 1000,
        entityId: 'player-1',
        state: { x: 10 },
      });
      interpolationService.addSnapshot('player-1', {
        timestamp: 2000,
        entityId: 'player-1',
        state: { x: 20 },
      });

      interpolationService.pruneOlderThan(1500);

      const state = interpolationService.getInterpolatedState('player-1', 2500);
      expect(state.x).toBe(20);
    });

    it('should remove entity if all snapshots are pruned', () => {
      interpolationService.addSnapshot('player-1', {
        timestamp: 1000,
        entityId: 'player-1',
        state: { x: 10 },
      });

      interpolationService.pruneOlderThan(2000);

      const state = interpolationService.getInterpolatedState('player-1', 2500);
      expect(state).toBeNull();
    });
  });

  describe('clearEntity', () => {
    it('should clear snapshots for a specific entity', () => {
      interpolationService.addSnapshot('player-1', {
        timestamp: 1000,
        entityId: 'player-1',
        state: { x: 10 },
      });

      interpolationService.clearEntity('player-1');

      const state = interpolationService.getInterpolatedState('player-1', 1500);
      expect(state).toBeNull();
    });
  });

  describe('clear', () => {
    it('should clear all snapshots', () => {
      interpolationService.addSnapshot('player-1', {
        timestamp: 1000,
        entityId: 'player-1',
        state: { x: 10 },
      });
      interpolationService.addSnapshot('player-2', {
        timestamp: 1000,
        entityId: 'player-2',
        state: { x: 20 },
      });

      interpolationService.clear();

      expect(
        interpolationService.getInterpolatedState('player-1', 1500),
      ).toBeNull();
      expect(
        interpolationService.getInterpolatedState('player-2', 1500),
      ).toBeNull();
    });
  });
});
