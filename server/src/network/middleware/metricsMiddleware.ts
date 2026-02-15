import { Request, Response, NextFunction } from 'express';
import { logger } from '../../utils/logger';
import { httpRequestDuration, httpRequestTotal } from '../../utils/metrics';

/**
 * Metrics middleware that records request duration and logs performance.
 * Emits metrics to Prometheus for monitoring.
 */
export function metricsMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const start = process.hrtime.bigint();

  // Capture response finish event
  res.on('finish', () => {
    const end = process.hrtime.bigint();
    const durationMs = Number(end - start) / 1_000_000; // convert nanoseconds to milliseconds
    const durationSeconds = durationMs / 1000;
    const route = req.route?.path || req.path;
    const statusCode = String(res.statusCode);

    logger.debug(
      `Request ${req.method} ${route} took ${durationMs.toFixed(2)}ms`,
      {
        method: req.method,
        route,
        statusCode: res.statusCode,
        durationMs,
        userAgent: req.get('user-agent'),
      },
    );

    // Emit metrics to Prometheus
    httpRequestDuration.observe(
      {
        method: req.method,
        route,
        status_code: statusCode,
      },
      durationSeconds,
    );

    httpRequestTotal.inc({
      method: req.method,
      route,
      status_code: statusCode,
    });
  });

  next();
}
