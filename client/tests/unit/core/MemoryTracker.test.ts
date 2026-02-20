import {
  MemoryTracker,
  trackObject,
  untrackObject,
  checkMemoryLeaks,
  enableMemoryTracking,
  disableMemoryTracking,
  CleanupHelper,
  ObjectLifecycleTracker,
  withAutoCleanup,
} from '../../../src/core/MemoryTracker';

describe('MemoryTracker', () => {
  let tracker: MemoryTracker;

  beforeEach(() => {
    tracker = MemoryTracker.getInstance();
    tracker.clearAll();
    tracker.enable();
  });

  afterEach(() => {
    tracker.clearAll();
    tracker.disable();
    CleanupHelper.clearAllCleanups();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = MemoryTracker.getInstance();
      const instance2 = MemoryTracker.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('Enable/Disable', () => {
    it('should enable tracking', () => {
      tracker.enable();
      expect(tracker['enabled']).toBe(true);
    });

    it('should disable tracking', () => {
      tracker.enable();
      tracker.disable();
      expect(tracker['enabled']).toBe(false);
    });
  });

  describe('Object Tracking', () => {
    it('should track an object', () => {
      const obj = { test: true };
      const id = tracker.track(obj, 'TestObject');
      expect(id).not.toBe('');
      expect(tracker['trackedObjects'].has(id)).toBe(true);
    });

    it('should not track when disabled', () => {
      tracker.disable();
      const obj = { test: true };
      const id = tracker.track(obj, 'TestObject');
      expect(id).toBe('');
    });

    it('should untrack an object', () => {
      const obj = { test: true };
      const id = tracker.track(obj, 'TestObject');
      tracker.untrack(id);
      expect(tracker['trackedObjects'].has(id)).toBe(false);
    });

    it('should generate unique IDs', () => {
      const obj1 = { id: 1 };
      const obj2 = { id: 2 };
      const id1 = tracker.track(obj1, 'Object');
      const id2 = tracker.track(obj2, 'Object');
      expect(id1).not.toBe(id2);
    });

    it('should accept custom ID', () => {
      const obj = { test: true };
      const id = tracker.track(obj, 'TestObject', undefined, 'custom-id');
      expect(id).toBe('custom-id');
    });
  });

  describe('Memory Leak Detection', () => {
    beforeEach(() => {
      tracker.enable();
    });

    it('should detect old objects as potential leaks', () => {
      const obj = { test: true };
      tracker.track(obj, 'OldObject');

      // Simulate time passing by manipulating createdAt
      const tracked = tracker['trackedObjects'].values().next().value;
      if (tracked) {
        tracked.createdAt = Date.now() - 10000; // 10 seconds ago
      }

      const leaks = tracker.checkLeaks(5000);
      expect(leaks.length).toBeGreaterThan(0);
      expect(leaks[0]).toContain('OldObject');
    });

    it('should not detect new objects as leaks', () => {
      const obj = { test: true };
      tracker.track(obj, 'NewObject');

      const leaks = tracker.checkLeaks(5000);
      expect(leaks.length).toBe(0);
    });

    it('should respect threshold', () => {
      const obj = { test: true };
      tracker.track(obj, 'Object');

      // Object is 3 seconds old, threshold is 5 seconds
      const tracked = tracker['trackedObjects'].values().next().value;
      if (tracked) {
        tracked.createdAt = Date.now() - 3000;
      }

      const leaks = tracker.checkLeaks(5000);
      expect(leaks.length).toBe(0);
    });
  });

  describe('Statistics', () => {
    it('should calculate total tracked objects', () => {
      tracker.track({}, 'TypeA');
      tracker.track({}, 'TypeA');
      tracker.track({}, 'TypeB');

      const stats = tracker.getStatistics();
      expect(stats.totalTracked).toBe(3);
    });

    it('should group by type', () => {
      tracker.track({}, 'TypeA');
      tracker.track({}, 'TypeA');
      tracker.track({}, 'TypeB');

      const stats = tracker.getStatistics();
      expect(stats.byType.get('TypeA')).toBe(2);
      expect(stats.byType.get('TypeB')).toBe(1);
    });

    it('should count parent relationships', () => {
      tracker.track({}, 'Child', 'parent1');
      tracker.track({}, 'Child', 'parent2');
      tracker.track({}, 'Orphan');

      const stats = tracker.getStatistics();
      expect(stats.withParent).toBe(2);
      expect(stats.withoutParent).toBe(1);
    });
  });

  describe('Warnings', () => {
    it('should add and retrieve warnings', () => {
      tracker.addWarning('Test warning');
      const warnings = tracker.getWarnings();
      expect(warnings).toContain('Test warning');
    });

    it('should limit warning count', () => {
      for (let i = 0; i < 110; i++) {
        tracker.addWarning(`Warning ${i}`);
      }
      expect(tracker.getWarnings().length).toBeLessThanOrEqual(100);
    });

    it('should clear warnings', () => {
      tracker.addWarning('Warning');
      tracker.clearWarnings();
      expect(tracker.getWarnings().length).toBe(0);
    });
  });

  describe('Property Watching', () => {
    it('should watch property changes', () => {
      const obj: any = { value: 0 };
      const callback = jest.fn();

      tracker.startWatching(obj, 'value', callback);

      obj.value = 5;
      expect(callback).toHaveBeenCalledWith(0, 5);

      obj.value = 10;
      expect(callback).toHaveBeenCalledWith(5, 10);
    });

    it('should not watch when disabled', () => {
      tracker.disable();
      const obj: any = { value: 0 };
      const callback = jest.fn();

      tracker.startWatching(obj, 'value', callback);

      obj.value = 5;
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('Cleanup', () => {
    it('should clear all tracked objects', () => {
      tracker.track({}, 'Object');
      tracker.clearAll();
      expect(tracker['trackedObjects'].size).toBe(0);
    });

    it('should clear warnings', () => {
      tracker.addWarning('Warning');
      tracker.clearAll();
      expect(tracker.getWarnings().length).toBe(0);
    });
  });
});

describe('CleanupHelper', () => {
  beforeEach(() => {
    CleanupHelper.clearAllCleanups();
  });

  afterEach(() => {
    CleanupHelper.clearAllCleanups();
  });

  it('should register cleanup function', () => {
    const cleanupFn = jest.fn();
    CleanupHelper.registerCleanup('test-id', cleanupFn);
    expect(CleanupHelper['cleanupStack'].has('test-id')).toBe(true);
  });

  it('should perform cleanup', () => {
    const cleanupFn = jest.fn();
    CleanupHelper.registerCleanup('test-id', cleanupFn);
    CleanupHelper.performCleanup('test-id');
    expect(cleanupFn).toHaveBeenCalled();
  });

  it('should handle multiple cleanup functions', () => {
    const cleanupFn1 = jest.fn();
    const cleanupFn2 = jest.fn();
    CleanupHelper.registerCleanup('test-id', cleanupFn1);
    CleanupHelper.registerCleanup('test-id', cleanupFn2);
    CleanupHelper.performCleanup('test-id');
    expect(cleanupFn1).toHaveBeenCalled();
    expect(cleanupFn2).toHaveBeenCalled();
  });

  it('should handle cleanup errors gracefully', () => {
    const errorCleanup = jest.fn(() => {
      throw new Error('Cleanup error');
    });
    const normalCleanup = jest.fn();

    CleanupHelper.registerCleanup('test-id', errorCleanup);
    CleanupHelper.registerCleanup('test-id', normalCleanup);

    // Should not throw
    expect(() => CleanupHelper.performCleanup('test-id')).not.toThrow();
    expect(normalCleanup).toHaveBeenCalled();
  });
});

describe('ObjectLifecycleTracker', () => {
  beforeEach(() => {
    enableMemoryTracking();
  });

  afterEach(() => {
    disableMemoryTracking();
  });

  it('should track creation', () => {
    const obj = { test: true };
    const id = ObjectLifecycleTracker.trackCreation(obj, 'TestObject');
    expect(id).not.toBe('');
  });

  it('should track destruction', () => {
    const obj = { test: true };
    const id = ObjectLifecycleTracker.trackCreation(obj, 'TestObject');
    ObjectLifecycleTracker.trackDestruction(id);
    // Should complete without error
  });

  it('should report leaks', () => {
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
    const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

    ObjectLifecycleTracker.reportLeaks();

    // Since no objects are tracked as old, should log "No obvious memory leaks"
    // The logger adds timestamp prefix, so we check if the message is included
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining('No obvious memory leaks detected.'),
    );

    consoleSpy.mockRestore();
    consoleLogSpy.mockRestore();
  });

  it('should get tracked object count', () => {
    const initialCount = ObjectLifecycleTracker.getTrackedObjectsCount();
    const obj = { test: true };
    ObjectLifecycleTracker.trackCreation(obj, 'TestObject');
    const newCount = ObjectLifecycleTracker.getTrackedObjectsCount();
    expect(newCount).toBe(initialCount + 1);
  });
});

describe('Global Functions', () => {
  beforeEach(() => {
    enableMemoryTracking();
  });

  afterEach(() => {
    disableMemoryTracking();
  });

  describe('trackObject', () => {
    it('should track object globally', () => {
      const obj = { test: true };
      const id = trackObject(obj, 'TestObject');
      expect(id).not.toBe('');
    });
  });

  describe('untrackObject', () => {
    it('should untrack object globally', () => {
      const obj = { test: true };
      const id = trackObject(obj, 'TestObject');
      untrackObject(id);
      // Should complete without error
    });
  });

  describe('checkMemoryLeaks', () => {
    it('should check for memory leaks globally', () => {
      const leaks = checkMemoryLeaks(5000);
      expect(Array.isArray(leaks)).toBe(true);
    });
  });

  describe('enable/disable', () => {
    it('should enable tracking globally', () => {
      enableMemoryTracking();
      const tracker = MemoryTracker.getInstance();
      expect(tracker['enabled']).toBe(true);
    });

    it('should disable tracking globally', () => {
      disableMemoryTracking();
      const tracker = MemoryTracker.getInstance();
      expect(tracker['enabled']).toBe(false);
    });
  });
});

describe('withAutoCleanup', () => {
  beforeEach(() => {
    enableMemoryTracking();
  });

  afterEach(() => {
    disableMemoryTracking();
    CleanupHelper.clearAllCleanups();
  });

  it('should wrap object with auto cleanup', () => {
    const cleanupFn = jest.fn();
    const obj: any = { test: true };

    const wrapped = withAutoCleanup(obj, cleanupFn, 'test-obj');

    expect(wrapped).toBe(obj);
    expect(wrapped.destroy).toBeDefined();
  });

  it('should call cleanup on destroy', () => {
    const cleanupFn = jest.fn();
    const originalDestroy = jest.fn();
    const obj: any = { test: true, destroy: originalDestroy };

    const wrapped = withAutoCleanup(obj, cleanupFn);

    wrapped.destroy();

    expect(cleanupFn).toHaveBeenCalled();
    expect(originalDestroy).toHaveBeenCalled();
  });

  it('should work without original destroy', () => {
    const cleanupFn = jest.fn();
    const obj: any = { test: true };

    const wrapped = withAutoCleanup(obj, cleanupFn);

    // Should not throw
    expect(() => wrapped.destroy()).not.toThrow();
    expect(cleanupFn).toHaveBeenCalled();
  });
});
