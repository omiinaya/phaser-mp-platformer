import { EventBus } from '../../../src/core/EventBus';

describe('EventBus', () => {
  let eventBus: EventBus;

  beforeEach(() => {
    // Clear the singleton instance before each test
    (EventBus as any).instance = null;
    eventBus = EventBus.getInstance();
    eventBus.clear();
  });

  afterEach(() => {
    eventBus.clear();
  });

  describe('getInstance', () => {
    it('should return the same instance', () => {
      const instance1 = EventBus.getInstance();
      const instance2 = EventBus.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('on', () => {
    it('should add a listener to an event', () => {
      const callback = jest.fn();
      eventBus.on('test-event', callback);
      expect(eventBus.listenerCount('test-event')).toBe(1);
    });

    it('should call the callback when event is emitted', () => {
      const callback = jest.fn();
      eventBus.on('test-event', callback);
      eventBus.emit('test-event', { data: 'test' });
      expect(callback).toHaveBeenCalledWith({ data: 'test' });
    });

    it('should return an unsubscribe function', () => {
      const callback = jest.fn();
      const unsubscribe = eventBus.on('test-event', callback);
      unsubscribe();
      eventBus.emit('test-event');
      expect(callback).not.toHaveBeenCalled();
    });

    it('should support multiple listeners for the same event', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();
      eventBus.on('test-event', callback1);
      eventBus.on('test-event', callback2);
      eventBus.emit('test-event');
      expect(callback1).toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
    });
  });

  describe('once', () => {
    it('should only call the callback once', () => {
      const callback = jest.fn();
      eventBus.once('test-event', callback);
      eventBus.emit('test-event');
      eventBus.emit('test-event');
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should pass data to the callback', () => {
      const callback = jest.fn();
      eventBus.once('test-event', callback);
      eventBus.emit('test-event', { value: 42 });
      expect(callback).toHaveBeenCalledWith({ value: 42 });
    });
  });

  describe('off', () => {
    it('should remove a specific listener', () => {
      const callback = jest.fn();
      eventBus.on('test-event', callback);
      eventBus.off('test-event', callback);
      eventBus.emit('test-event');
      expect(callback).not.toHaveBeenCalled();
    });

    it('should not affect other listeners', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();
      eventBus.on('test-event', callback1);
      eventBus.on('test-event', callback2);
      eventBus.off('test-event', callback1);
      eventBus.emit('test-event');
      expect(callback1).not.toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
    });
  });

  describe('emit', () => {
    it('should pass data to all listeners', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();
      eventBus.on('test-event', callback1);
      eventBus.on('test-event', callback2);
      eventBus.emit('test-event', { message: 'hello' });
      expect(callback1).toHaveBeenCalledWith({ message: 'hello' });
      expect(callback2).toHaveBeenCalledWith({ message: 'hello' });
    });

    it('should not call listeners added after emit', () => {
      const callback = jest.fn();
      eventBus.emit('test-event');
      eventBus.on('test-event', callback);
      expect(callback).not.toHaveBeenCalled();
    });

    it('should continue calling other listeners when one throws', () => {
      const errorCallback = jest.fn(() => {
        throw new Error('Test error');
      });
      const normalCallback = jest.fn();
      eventBus.on('test-event', errorCallback);
      eventBus.on('test-event', normalCallback);
      // Should not throw - errors are caught internally
      eventBus.emit('test-event');
      // Normal callback should still be called
      expect(normalCallback).toHaveBeenCalled();
    });
  });

  describe('hasListeners', () => {
    it('should return false when no listeners', () => {
      expect(eventBus.hasListeners('test-event')).toBe(false);
    });

    it('should return true when listeners exist', () => {
      eventBus.on('test-event', jest.fn());
      expect(eventBus.hasListeners('test-event')).toBe(true);
    });

    it('should return false after all listeners are removed', () => {
      const callback = jest.fn();
      eventBus.on('test-event', callback);
      eventBus.off('test-event', callback);
      expect(eventBus.hasListeners('test-event')).toBe(false);
    });
  });

  describe('listenerCount', () => {
    it('should return 0 for event with no listeners', () => {
      expect(eventBus.listenerCount('test-event')).toBe(0);
    });

    it('should return correct count', () => {
      eventBus.on('test-event', jest.fn());
      eventBus.on('test-event', jest.fn());
      eventBus.on('test-event', jest.fn());
      expect(eventBus.listenerCount('test-event')).toBe(3);
    });
  });

  describe('clear', () => {
    it('should remove all listeners for a specific event', () => {
      eventBus.on('event1', jest.fn());
      eventBus.on('event2', jest.fn());
      eventBus.clear('event1');
      expect(eventBus.hasListeners('event1')).toBe(false);
      expect(eventBus.hasListeners('event2')).toBe(true);
    });

    it('should remove all listeners when no event specified', () => {
      eventBus.on('event1', jest.fn());
      eventBus.on('event2', jest.fn());
      eventBus.clear();
      expect(eventBus.hasListeners('event1')).toBe(false);
      expect(eventBus.hasListeners('event2')).toBe(false);
    });
  });
});
