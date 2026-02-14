import { Socket } from 'socket.io';
import { logger } from '../../utils/logger';

/**
 * Rate limiting middleware.
 * Limits number of events per socket per second.
 */
const rateLimitBuckets = new Map<string, { count: number; resetTime: number }>();

// Cleanup old buckets every 5 minutes to prevent memory leak
setInterval(() => {
  const now = Date.now();
  for (const [socketId, bucket] of rateLimitBuckets.entries()) {
    if (now >= bucket.resetTime) {
      rateLimitBuckets.delete(socketId);
    }
  }
}, 5 * 60 * 1000);

export function rateLimit(
  maxEventsPerSecond: number = 30,
  windowMs: number = 1000
) {
  return (socket: Socket, next: (err?: Error) => void) => {
    const socketId = socket.id;
    const now = Date.now();

    let bucket = rateLimitBuckets.get(socketId);
    if (!bucket || now >= bucket.resetTime) {
      bucket = { count: -1, resetTime: now + windowMs }; // -1 because we increment before check
      rateLimitBuckets.set(socketId, bucket);
    }

    bucket.count++;
    if (bucket.count > maxEventsPerSecond) {
      logger.warn(`Rate limit exceeded for socket ${socketId}`);
      return next(new Error('Rate limit exceeded'));
    }

    next();
  };
}

/**
 * Input validation middleware for player_input events.
 */
export function validatePlayerInput(socket: Socket, next: (err?: Error) => void) {
  const originalOn = socket.on.bind(socket);

  socket.on = (event: string, listener: (...args: any[]) => void) => {
    if (event === 'player_input') {
      const validatedListener = (data: any) => {
        if (!isValidPlayerInput(data)) {
          logger.warn(`Invalid player_input from ${socket.id}: ${JSON.stringify(data)}`);
          socket.emit('error', { message: 'Invalid input' });
          return;
        }
        listener(data);
      };
      return originalOn(event, validatedListener);
    }
    return originalOn(event, listener);
  };

  next();
}

function isValidPlayerInput(data: any): boolean {
  if (!data || typeof data !== 'object') return false;
  if (typeof data.sequence !== 'number') return false;
  if (!data.input || typeof data.input !== 'object') return false;
  const { left, right, up, down, jump } = data.input;
  if (typeof left !== 'boolean' ||
      typeof right !== 'boolean' ||
      typeof up !== 'boolean' ||
      typeof down !== 'boolean' ||
      typeof jump !== 'boolean') {
    return false;
  }
  if (data.input.skill !== undefined && typeof data.input.skill !== 'string') {
    return false;
  }
  return true;
}

/**
 * Middleware to ensure socket is in a room for room-specific events.
 */
export function requireRoom(socket: Socket, next: (err?: Error) => void) {
  const originalOn = socket.on.bind(socket);

  socket.on = (event: string, listener: (...args: any[]) => void) => {
    if (event.startsWith('room_') || event === 'player_input') {
      const validatedListener = (...args: any[]) => {
        if (!socket.data.roomId) {
          logger.warn(`Socket ${socket.id} attempted ${event} without room`);
          socket.emit('error', { message: 'Not in a room' });
          return;
        }
        listener(...args);
      };
      return originalOn(event, validatedListener);
    }
    return originalOn(event, listener);
  };

  next();
}