import winston from 'winston';
import 'winston-daily-rotate-file';

const logDir = 'logs';

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
);

// Create a Winston logger instance
const winstonLogger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { service: 'phaser-platformer-server' },
  transports: [
    // Console transport (pretty print in development)
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          return `${timestamp} [${level}] ${message} ${
            Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''
          }`;
        }),
      ),
    }),
    // Daily rotate file transport for errors
    new winston.transports.DailyRotateFile({
      dirname: logDir,
      filename: 'error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxFiles: '30d',
      maxSize: '20m',
    }),
    // Daily rotate file transport for all logs
    new winston.transports.DailyRotateFile({
      dirname: logDir,
      filename: 'combined-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxFiles: '30d',
      maxSize: '20m',
    }),
  ],
});

// Export a simplified interface for backward compatibility
export const logger = {
  info: (message: string, meta?: any) => winstonLogger.info(message, meta),
  warn: (message: string, meta?: any) => winstonLogger.warn(message, meta),
  error: (message: string, meta?: any) => winstonLogger.error(message, meta),
  debug: (message: string, meta?: any) => winstonLogger.debug(message, meta),
};

/**
 * Close all logger transports - useful for test cleanup
 */
export function closeLogger(): void {
  winstonLogger.close();
}
