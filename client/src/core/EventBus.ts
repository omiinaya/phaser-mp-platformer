import { logger } from '../utils/logger';
/**
 * Event bus for decoupled communication between game modules.
 * Implements a publish-subscribe pattern with support for typed events.
 */
export class EventBus {
  private static instance: EventBus;
  private listeners: Map<string, Array<{ callback: Function; once: boolean }>>;

  private constructor() {
    this.listeners = new Map();
  }

  /**
   * Get the singleton instance of EventBus.
   */
  public static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }

  /**
   * Subscribe to an event.
   * @param event Event name.
   * @param callback Callback function.
   * @param once Whether to listen only once (default false).
   * @returns A function to unsubscribe.
   */
  public on<T = any>(
    event: string,
    callback: (data: T) => void,
    once = false,
  ): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    const listeners = this.listeners.get(event)!;
    listeners.push({ callback, once });

    // Return unsubscribe function
    return () => {
      const index = listeners.findIndex((l) => l.callback === callback);
      if (index >= 0) {
        listeners.splice(index, 1);
      }
    };
  }

  /**
   * Subscribe to an event only once.
   * @param event Event name.
   * @param callback Callback function.
   * @returns A function to unsubscribe.
   */
  public once<T = any>(event: string, callback: (data: T) => void): () => void {
    return this.on(event, callback, true);
  }

  /**
   * Unsubscribe a specific callback from an event.
   * @param event Event name.
   * @param callback Callback function.
   */
  public off<T = any>(event: string, callback: (data: T) => void): void {
    const listeners = this.listeners.get(event);
    if (!listeners) return;

    const index = listeners.findIndex((l) => l.callback === callback);
    if (index >= 0) {
      listeners.splice(index, 1);
    }
  }

  /**
   * Emit an event with data.
   * @param event Event name.
   * @param data Data to pass to listeners.
   */
  public emit<T = any>(event: string, data?: T): void {
    const listeners = this.listeners.get(event);
    if (!listeners) return;

    // Copy array to avoid mutation during iteration
    const toCall = [...listeners];
    // Remove 'once' listeners before calling
    const toRemove: number[] = [];
    toCall.forEach((listener, index) => {
      if (listener.once) {
        toRemove.push(index);
      }
    });
    // Remove once listeners from original array (in reverse order)
    toRemove.reverse().forEach((index) => {
      listeners.splice(index, 1);
    });

    // Call all listeners
    toCall.forEach((listener) => {
      try {
        listener.callback(data);
      } catch (error) {
        logger.error(`Error in event listener for "${event}":`, error);
      }
    });
  }

  /**
   * Check if there are any listeners for an event.
   * @param event Event name.
   */
  public hasListeners(event: string): boolean {
    const listeners = this.listeners.get(event);
    return !!listeners && listeners.length > 0;
  }

  /**
   * Get the number of listeners for an event.
   * @param event Event name.
   */
  public listenerCount(event: string): number {
    const listeners = this.listeners.get(event);
    return listeners ? listeners.length : 0;
  }

  /**
   * Remove all listeners for an event.
   * @param event Event name (optional). If omitted, clears all events.
   */
  public clear(event?: string): void {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }
}

/**
 * Convenience export of the singleton instance.
 */
export const eventBus = EventBus.getInstance();
