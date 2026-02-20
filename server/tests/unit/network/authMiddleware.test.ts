import { Socket } from 'socket.io';
import {
  authenticateSocket,
  requireAuth,
} from '../../../src/network/middleware/authMiddleware';

jest.mock('../../../src/utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('authMiddleware', () => {
  let mockSocket: any;
  let nextFn: jest.Mock;

  beforeEach(() => {
    mockSocket = {
      id: 'socket-123',
      handshake: {
        auth: {},
        query: {},
        headers: {},
        time: new Date().toISOString(),
        address: '127.0.0.1',
        xdomain: false,
        pid: 123,
        issued: Date.now(),
        url: '/',
      },
      data: {},
    };
    nextFn = jest.fn();
    jest.clearAllMocks();
  });

  describe('authenticateSocket', () => {
    it('should allow guest connection when no token provided', () => {
      authenticateSocket(mockSocket as Socket, nextFn);

      expect(mockSocket.data.userId).toBe('guest_socket-123');
      expect(mockSocket.data.isGuest).toBe(true);
      expect(nextFn).toHaveBeenCalledWith();
    });

    it('should allow guest connection with empty token', () => {
      mockSocket.handshake.auth.token = '';

      authenticateSocket(mockSocket as Socket, nextFn);

      expect(mockSocket.data.userId).toBe('guest_socket-123');
      expect(mockSocket.data.isGuest).toBe(true);
    });

    it('should authenticate user with valid token', () => {
      const originalEnv = process.env.JWT_SECRET;
      process.env.JWT_SECRET = 'test-secret';

      mockSocket.handshake.auth.token = 'valid-token';

      // Mock jwt.verify to return a valid decoded token
      jest.spyOn(require('jsonwebtoken'), 'verify').mockImplementation(() => ({
        userId: 'user-123',
      }));

      authenticateSocket(mockSocket as Socket, nextFn);

      expect(mockSocket.data.userId).toBe('user-123');
      expect(mockSocket.data.isGuest).toBe(false);
      expect(nextFn).toHaveBeenCalledWith();

      process.env.JWT_SECRET = originalEnv;
    });

    it('should return error when JWT_SECRET is not set', () => {
      delete process.env.JWT_SECRET;
      mockSocket.handshake.auth.token = 'some-token';

      authenticateSocket(mockSocket as Socket, nextFn);

      expect(nextFn).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should return error on invalid token', () => {
      const originalEnv = process.env.JWT_SECRET;
      process.env.JWT_SECRET = 'test-secret';
      mockSocket.handshake.auth.token = 'invalid-token';

      // Mock jwt.verify to throw an error
      jest.spyOn(require('jsonwebtoken'), 'verify').mockImplementation(() => {
        throw new Error('Invalid token');
      });

      authenticateSocket(mockSocket as Socket, nextFn);

      expect(nextFn).toHaveBeenCalledWith(expect.any(Error));

      process.env.JWT_SECRET = originalEnv;
    });
  });

  describe('requireAuth', () => {
    it('should allow authenticated user', () => {
      mockSocket.data.isGuest = false;
      mockSocket.data.userId = 'user-123';

      requireAuth(mockSocket as Socket, nextFn);

      expect(nextFn).toHaveBeenCalledWith();
    });

    it('should reject guest user', () => {
      mockSocket.data.isGuest = true;

      requireAuth(mockSocket as Socket, nextFn);

      expect(nextFn).toHaveBeenCalledWith(expect.any(Error));
    });
  });
});
