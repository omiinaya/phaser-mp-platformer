import { Socket } from 'socket.io';
import { rateLimit, validatePlayerInput, requireRoom } from '../../../src/network/middleware/validationMiddleware';

jest.mock('../../../src/utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('validationMiddleware', () => {
  let mockSocket: any;
  let nextFn: jest.Mock;

  beforeEach(() => {
    mockSocket = {
      id: 'socket-123',
      data: {},
      emit: jest.fn(),
      on: jest.fn(),
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
    };
    nextFn = jest.fn();
    jest.clearAllMocks();
  });

  describe('rateLimit', () => {
    it('should allow requests within rate limit', () => {
      const middleware = rateLimit(30, 1000);
      
      middleware(mockSocket as Socket, nextFn);
      
      expect(nextFn).toHaveBeenCalledWith();
    });

    it('should block requests exceeding rate limit', () => {
      const middleware = rateLimit(2, 1000);
      
      // First request
      middleware(mockSocket as Socket, nextFn);
      expect(nextFn).toHaveBeenCalledTimes(1);
      
      nextFn.mockClear();
      
      // Second request
      middleware(mockSocket as Socket, nextFn);
      expect(nextFn).toHaveBeenCalledTimes(1);
      
      nextFn.mockClear();
      
      // Third request should be blocked
      middleware(mockSocket as Socket, nextFn);
      expect(nextFn).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('validatePlayerInput', () => {
    it('should call next without changes for non-player_input events', () => {
      validatePlayerInput(mockSocket as Socket, nextFn);
      
      expect(nextFn).toHaveBeenCalledWith();
    });
  });

  describe('requireRoom', () => {
    it('should allow events when socket is in a room', () => {
      mockSocket.data.roomId = 'room-1';
      
      requireRoom(mockSocket as Socket, nextFn);
      
      expect(nextFn).toHaveBeenCalledWith();
    });

    it('should call next for non-room events', () => {
      requireRoom(mockSocket as Socket, nextFn);
      
      // Should not throw for non-room events
      expect(nextFn).toHaveBeenCalledWith();
    });
  });
});
