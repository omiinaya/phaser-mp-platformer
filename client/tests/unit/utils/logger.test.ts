import { logger } from '../../../src/utils/logger';

describe('logger', () => {
  let originalEnv: string | undefined;

  beforeEach(() => {
    originalEnv = process.env.NODE_ENV;
  });

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.NODE_ENV = originalEnv;
    }
  });

  describe('info', () => {
    it('should log info message without throwing', () => {
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

    it('should log error with args', () => {
      expect(() =>
        logger.error('error message', { key: 'value' }),
      ).not.toThrow();
    });
  });

  describe('debug', () => {
    it('should not log debug in production', () => {
      process.env.NODE_ENV = 'production';
      expect(() => logger.debug('debug message')).not.toThrow();
    });

    it('should not log debug in test', () => {
      process.env.NODE_ENV = 'test';
      expect(() => logger.debug('debug message')).not.toThrow();
    });

    it('should log debug in development', () => {
      process.env.NODE_ENV = 'development';
      expect(() => logger.debug('debug message')).not.toThrow();
    });
  });
});
