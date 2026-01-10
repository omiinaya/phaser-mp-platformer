import { Request, Response, NextFunction } from 'express';
import { logger } from '../../utils/logger';

/**
 * In-memory store for rate limiting.
 * Maps IP -> { count: number, resetTime: number }
 */
const buckets = new Map<string, { count: number; resetTime: number }>();

/**
 * Rate limiting middleware for HTTP routes.
 * Limits requests per IP per window.
 * @param maxRequests Maximum requests per window (default 100 per 15 minutes)
 * @param windowMs Window length in milliseconds (default 15 minutes)
 */
export function httpRateLimit(
  maxRequests: number = 100,
  windowMs: number = 15 * 60 * 1000 // 15 minutes
) {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();

    let bucket = buckets.get(ip);
    if (!bucket || now >= bucket.resetTime) {
      bucket = { count: 0, resetTime: now + windowMs };
      buckets.set(ip, bucket);
    }

    bucket.count++;
    if (bucket.count > maxRequests) {
      logger.warn(`HTTP rate limit exceeded for IP ${ip}`);
      return res.status(429).json({
        error: 'Too many requests',
        retryAfter: Math.ceil((bucket.resetTime - now) / 1000),
      });
    }

    // Set response headers
    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', maxRequests - bucket.count);
    res.setHeader('X-RateLimit-Reset', bucket.resetTime);

    next();
  };
}

/**
 * Clean up old buckets periodically (optional).
 */
export function startCleanupInterval(intervalMs: number = 60 * 60 * 1000): void {
  setInterval(() => {
    const now = Date.now();
    for (const [ip, bucket] of buckets.entries()) {
      if (now >= bucket.resetTime) {
        buckets.delete(ip);
      }
    }
  }, intervalMs);
}