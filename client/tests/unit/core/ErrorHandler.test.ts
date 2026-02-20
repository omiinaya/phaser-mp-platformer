import {
  ErrorHandler,
  ErrorSeverity,
  initErrorHandler,
  getErrorHandler,
  showGameError,
} from '../../../src/core/ErrorHandler';

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

describe('ErrorHandler', () => {
  let errorHandler: ErrorHandler;

  beforeEach(() => {
    errorHandler = new ErrorHandler();
  });

  describe('constructor', () => {
    it('should create an ErrorHandler instance', () => {
      expect(errorHandler).toBeDefined();
    });

    it('should initialize with empty error queue', () => {
      expect((errorHandler as any).errorQueue).toBeDefined();
      expect((errorHandler as any).errorQueue.length).toBe(0);
    });
  });

  describe('showError', () => {
    it('should add error to queue', () => {
      errorHandler.showError('Test error');
      // Queue should have one error
      expect((errorHandler as any).errorQueue.length).toBe(1);
    });

    it('should respect max queue size', () => {
      // Add 15 errors to exceed maxQueueSize of 10
      for (let i = 0; i < 15; i++) {
        errorHandler.showError(`Error ${i}`);
      }
      // Should only keep 10
      expect((errorHandler as any).errorQueue.length).toBe(10);
    });

    it('should use default severity', () => {
      errorHandler.showError('Test error');
      const error = (errorHandler as any).errorQueue[0];
      expect(error.severity).toBe(ErrorSeverity.ERROR);
    });

    it('should use custom severity', () => {
      errorHandler.showError('Test error', ErrorSeverity.WARNING);
      const error = (errorHandler as any).errorQueue[0];
      expect(error.severity).toBe(ErrorSeverity.WARNING);
    });

    it('should handle retryable errors', () => {
      const action = jest.fn();
      errorHandler.showError(
        'Test error',
        ErrorSeverity.ERROR,
        true,
        true,
        action,
      );
      const error = (errorHandler as any).errorQueue[0];
      expect(error.retryable).toBe(true);
      expect(error.action).toBe(action);
    });
  });

  describe('clearErrors', () => {
    it('should clear error queue', () => {
      errorHandler.showError('Test error 1');
      errorHandler.showError('Test error 2');
      expect((errorHandler as any).errorQueue.length).toBe(2);

      errorHandler.clearErrors();
      expect((errorHandler as any).errorQueue.length).toBe(0);
    });
  });

  describe('setScene', () => {
    it('should update scene reference', () => {
      const mockScene = { add: {} } as any;
      errorHandler.setScene(mockScene);
      expect((errorHandler as any).scene).toBe(mockScene);
    });
  });

  describe('destroy', () => {
    it('should clean up on destroy', () => {
      errorHandler.showError('Test error');
      expect(() => errorHandler.destroy()).not.toThrow();
    });
  });

  describe('ErrorSeverity', () => {
    it('should have INFO severity', () => {
      expect(ErrorSeverity.INFO).toBe('info');
    });

    it('should have WARNING severity', () => {
      expect(ErrorSeverity.WARNING).toBe('warning');
    });

    it('should have ERROR severity', () => {
      expect(ErrorSeverity.ERROR).toBe('error');
    });

    it('should have CRITICAL severity', () => {
      expect(ErrorSeverity.CRITICAL).toBe('critical');
    });
  });

  describe('initErrorHandler', () => {
    it('should initialize global error handler', () => {
      const handler = initErrorHandler();
      expect(handler).toBeDefined();
      expect(getErrorHandler()).toBe(handler);
    });
  });

  describe('showGameError', () => {
    it('should show error using global handler', () => {
      const handler = initErrorHandler();
      showGameError('Global error');
      expect((handler as any).errorQueue.length).toBe(1);
    });
  });
});
