import { logger } from '../../../src/utils/logger';

describe('logger', () => {
  beforeEach(() => {
    // Reset environment
    process.env.NODE_ENV = 'test';
  });

  describe('info', () => {
    it('should log info message', () => {
      expect(() => logger.info('test message')).not.toThrow();
    });

    it('should log info message with args', () => {
      expect(() => logger.info('test message', { key: 'value' })).not.toThrow();
    });
  });

  describe('warn', () => {
    it('should log warning message', () => {
      expect(() => logger.warn('warning message')).not.toThrow();
    });

    it('should log warning with args', () => {
      expect(() =>
        logger.warn('warning message', { key: 'value' }),
      ).not.toThrow();
    });
  });

  describe('error', () => {
    it('should log error message', () => {
      expect(() => logger.error('error message')).not.toThrow();
    });

    it('should log error with error object', () => {
      const err = new Error('test error');
      expect(() => logger.error('error message', err)).not.toThrow();
    });
  });

  describe('debug', () => {
    it('should log debug message in development', () => {
      process.env.NODE_ENV = 'development';
      expect(() => logger.debug('debug message')).not.toThrow();
    });

    it('should not log debug in production', () => {
      process.env.NODE_ENV = 'production';
      expect(() => logger.debug('debug message')).not.toThrow();
    });

    it('should not log debug in test', () => {
      process.env.NODE_ENV = 'test';
      expect(() => logger.debug('debug message')).not.toThrow();
    });
  });
});
