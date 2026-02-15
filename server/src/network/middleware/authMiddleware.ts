import { Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { logger } from '../../utils/logger';

/**
 * Authentication middleware for Socket.IO.
 * Verifies JWT token from handshake.
 */
export function authenticateSocket(
  socket: Socket,
  next: (err?: Error) => void,
): void {
  const token = socket.handshake.auth.token || socket.handshake.query.token;

  if (!token) {
    // Allow guest connections
    socket.data.userId = `guest_${socket.id}`;
    socket.data.isGuest = true;
    return next();
  }

  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      logger.error('JWT_SECRET environment variable not set');
      return next(new Error('Server configuration error'));
    }

    const decoded = jwt.verify(token as string, secret) as { userId: string };
    socket.data.userId = decoded.userId;
    socket.data.isGuest = false;
    logger.debug(`Authenticated user ${decoded.userId}`);
    next();
  } catch (error) {
    logger.warn(`Authentication failed: ${(error as Error).message}`);
    next(new Error('Authentication error'));
  }
}

/**
 * Middleware to require authenticated (non-guest) user.
 */
export function requireAuth(socket: Socket, next: (err?: Error) => void): void {
  if (socket.data.isGuest) {
    return next(new Error('Authentication required'));
  }
  next();
}
