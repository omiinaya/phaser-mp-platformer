import { Socket } from 'socket.io';
import {
  rateLimit,
  validatePlayerInput,
  requireRoom,
} from '../../../src/network/middleware/validationMiddleware';

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
    // Store original listeners map
    const listeners: Map<string, Function[]> = new Map();

    mockSocket = {
      id: 'socket-123',
      data: {},
      emit: jest.fn(),
      on: jest.fn((event: string, listener: Function) => {
        if (!listeners.has(event)) {
          listeners.set(event, []);
        }
        listeners.get(event)!.push(listener);
        return mockSocket;
      }),
      // Helper to get registered listeners
      getListeners: (event: string) => listeners.get(event) || [],
      // Helper to clear listeners
      clearListeners: () => listeners.clear(),
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

    it('should validate valid player_input data', () => {
      validatePlayerInput(mockSocket as Socket, nextFn);

      // Create a listener for player_input
      const listener = jest.fn();
      mockSocket.on('player_input', listener);

      // Get the wrapped listener
      const listeners = mockSocket.getListeners('player_input');
      const wrappedListener = listeners[listeners.length - 1];

      // Call with valid data
      const validData = {
        sequence: 1,
        input: {
          left: false,
          right: true,
          up: false,
          down: false,
          jump: true,
        },
      };

      wrappedListener(validData);
      expect(listener).toHaveBeenCalledWith(validData);
    });

    it('should reject invalid player_input - missing sequence', () => {
      validatePlayerInput(mockSocket as Socket, nextFn);

      const listener = jest.fn();
      mockSocket.on('player_input', listener);

      const listeners = mockSocket.getListeners('player_input');
      const wrappedListener = listeners[listeners.length - 1];

      wrappedListener({
        input: { left: false, right: true, up: false, down: false, jump: true },
      });
      expect(mockSocket.emit).toHaveBeenCalledWith('error', {
        message: 'Invalid input',
      });
      expect(listener).not.toHaveBeenCalled();
    });

    it('should reject invalid player_input - wrong sequence type', () => {
      validatePlayerInput(mockSocket as Socket, nextFn);

      const listener = jest.fn();
      mockSocket.on('player_input', listener);

      const listeners = mockSocket.getListeners('player_input');
      const wrappedListener = listeners[listeners.length - 1];

      wrappedListener({
        sequence: 'abc',
        input: { left: false, right: true, up: false, down: false, jump: true },
      });
      expect(mockSocket.emit).toHaveBeenCalledWith('error', {
        message: 'Invalid input',
      });
      expect(listener).not.toHaveBeenCalled();
    });

    it('should reject invalid player_input - missing input object', () => {
      validatePlayerInput(mockSocket as Socket, nextFn);

      const listener = jest.fn();
      mockSocket.on('player_input', listener);

      const listeners = mockSocket.getListeners('player_input');
      const wrappedListener = listeners[listeners.length - 1];

      wrappedListener({ sequence: 1 });
      expect(mockSocket.emit).toHaveBeenCalledWith('error', {
        message: 'Invalid input',
      });
      expect(listener).not.toHaveBeenCalled();
    });

    it('should reject invalid player_input - wrong input type', () => {
      validatePlayerInput(mockSocket as Socket, nextFn);

      const listener = jest.fn();
      mockSocket.on('player_input', listener);

      const listeners = mockSocket.getListeners('player_input');
      const wrappedListener = listeners[listeners.length - 1];

      wrappedListener({ sequence: 1, input: 'not-an-object' });
      expect(mockSocket.emit).toHaveBeenCalledWith('error', {
        message: 'Invalid input',
      });
      expect(listener).not.toHaveBeenCalled();
    });

    it('should reject invalid player_input - wrong boolean types', () => {
      validatePlayerInput(mockSocket as Socket, nextFn);

      const listener = jest.fn();
      mockSocket.on('player_input', listener);

      const listeners = mockSocket.getListeners('player_input');
      const wrappedListener = listeners[listeners.length - 1];

      wrappedListener({
        sequence: 1,
        input: {
          left: 'true', // should be boolean
          right: true,
          up: false,
          down: false,
          jump: true,
        },
      });
      expect(mockSocket.emit).toHaveBeenCalledWith('error', {
        message: 'Invalid input',
      });
      expect(listener).not.toHaveBeenCalled();
    });

    it('should accept valid skill string', () => {
      validatePlayerInput(mockSocket as Socket, nextFn);

      const listener = jest.fn();
      mockSocket.on('player_input', listener);

      const listeners = mockSocket.getListeners('player_input');
      const wrappedListener = listeners[listeners.length - 1];

      wrappedListener({
        sequence: 1,
        input: {
          left: false,
          right: true,
          up: false,
          down: false,
          jump: true,
          skill: 'fireball',
        },
      });
      expect(listener).toHaveBeenCalled();
    });

    it('should reject invalid skill type', () => {
      validatePlayerInput(mockSocket as Socket, nextFn);

      const listener = jest.fn();
      mockSocket.on('player_input', listener);

      const listeners = mockSocket.getListeners('player_input');
      const wrappedListener = listeners[listeners.length - 1];

      wrappedListener({
        sequence: 1,
        input: {
          left: false,
          right: true,
          up: false,
          down: false,
          jump: true,
          skill: 123,
        },
      });
      expect(mockSocket.emit).toHaveBeenCalledWith('error', {
        message: 'Invalid input',
      });
      expect(listener).not.toHaveBeenCalled();
    });

    it('should reject null data', () => {
      validatePlayerInput(mockSocket as Socket, nextFn);

      const listener = jest.fn();
      mockSocket.on('player_input', listener);

      const listeners = mockSocket.getListeners('player_input');
      const wrappedListener = listeners[listeners.length - 1];

      wrappedListener(null);
      expect(mockSocket.emit).toHaveBeenCalledWith('error', {
        message: 'Invalid input',
      });
      expect(listener).not.toHaveBeenCalled();
    });

    it('should reject undefined data', () => {
      validatePlayerInput(mockSocket as Socket, nextFn);

      const listener = jest.fn();
      mockSocket.on('player_input', listener);

      const listeners = mockSocket.getListeners('player_input');
      const wrappedListener = listeners[listeners.length - 1];

      wrappedListener(undefined);
      expect(mockSocket.emit).toHaveBeenCalledWith('error', {
        message: 'Invalid input',
      });
      expect(listener).not.toHaveBeenCalled();
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

    it('should block room_ events when not in a room', () => {
      requireRoom(mockSocket as Socket, nextFn);

      const listener = jest.fn();
      mockSocket.on('room_join', listener);

      const listeners = mockSocket.getListeners('room_join');
      const wrappedListener = listeners[listeners.length - 1];

      wrappedListener();
      expect(mockSocket.emit).toHaveBeenCalledWith('error', {
        message: 'Not in a room',
      });
      expect(listener).not.toHaveBeenCalled();
    });

    it('should allow room_ events when in a room', () => {
      mockSocket.data.roomId = 'room-1';

      requireRoom(mockSocket as Socket, nextFn);

      const listener = jest.fn();
      mockSocket.on('room_join', listener);

      const listeners = mockSocket.getListeners('room_join');
      const wrappedListener = listeners[listeners.length - 1];

      wrappedListener('some-data');
      expect(listener).toHaveBeenCalledWith('some-data');
    });

    it('should block player_input when not in a room', () => {
      requireRoom(mockSocket as Socket, nextFn);

      const listener = jest.fn();
      mockSocket.on('player_input', listener);

      const listeners = mockSocket.getListeners('player_input');
      const wrappedListener = listeners[listeners.length - 1];

      wrappedListener({
        sequence: 1,
        input: { left: false, right: true, up: false, down: false, jump: true },
      });
      expect(mockSocket.emit).toHaveBeenCalledWith('error', {
        message: 'Not in a room',
      });
      expect(listener).not.toHaveBeenCalled();
    });

    it('should allow player_input when in a room', () => {
      mockSocket.data.roomId = 'room-1';

      requireRoom(mockSocket as Socket, nextFn);

      const listener = jest.fn();
      mockSocket.on('player_input', listener);

      const listeners = mockSocket.getListeners('player_input');
      const wrappedListener = listeners[listeners.length - 1];

      const inputData = {
        sequence: 1,
        input: { left: false, right: true, up: false, down: false, jump: true },
      };
      wrappedListener(inputData);
      expect(listener).toHaveBeenCalledWith(inputData);
    });

    it('should pass arguments to room event listeners', () => {
      mockSocket.data.roomId = 'room-1';

      requireRoom(mockSocket as Socket, nextFn);

      const listener = jest.fn();
      mockSocket.on('room_leave', listener);

      const listeners = mockSocket.getListeners('room_leave');
      const wrappedListener = listeners[listeners.length - 1];

      wrappedListener('arg1', 'arg2');
      expect(listener).toHaveBeenCalledWith('arg1', 'arg2');
    });

    it('should handle room_ events with multiple arguments', () => {
      mockSocket.data.roomId = 'room-1';

      requireRoom(mockSocket as Socket, nextFn);

      const listener = jest.fn();
      mockSocket.on('room_chat', listener);

      const listeners = mockSocket.getListeners('room_chat');
      const wrappedListener = listeners[listeners.length - 1];

      wrappedListener('user1', 'Hello world', 'text');
      expect(listener).toHaveBeenCalledWith('user1', 'Hello world', 'text');
    });
  });
});
