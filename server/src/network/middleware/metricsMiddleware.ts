import { Request, Response, NextFunction } from 'express';
import { logger } from '../../utils/logger';

/**
 * Metrics middleware that records request duration and logs performance.
 */
export function metricsMiddleware(req: Request, res: Response, next: NextFunction): void {
  const start = process.hrtime.bigint();

  // Capture response finish event
  res.on('finish', () => {
    const end = process.hrtime.bigint();
    const durationMs = Number(end - start) / 1_000_000; // convert nanoseconds to milliseconds
    const route = req.route?.path || req.path;

    logger.debug(`Request ${req.method} ${route} took ${durationMs.toFixed(2)}ms`, {
      method: req.method,
      route,
      statusCode: res.statusCode,
      durationMs,
      userAgent: req.get('user-agent'),
    });

    // TODO: emit metrics to a metrics collector (e.g., Prometheus)
  });

  next();
}