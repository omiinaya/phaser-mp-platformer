import { NetworkService } from '../../../src/services/NetworkService';

// Mock socket.io-client
jest.mock('socket.io-client', () => ({
  io: jest.fn(),
}));

// Mock the logger
jest.mock('../../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

import { io } from 'socket.io-client';

describe('NetworkService', () => {
  let mockSocket: any;
  let networkService: NetworkService;

  beforeEach(() => {
    jest.clearAllMocks();

    mockSocket = {
      on: jest.fn(),
      off: jest.fn(),
      emit: jest.fn(),
      disconnect: jest.fn(),
    };

    (io as jest.Mock).mockReturnValue(mockSocket);

    networkService = new NetworkService('http://localhost:3000');
  });

  describe('constructor', () => {
    it('should create instance with server URL', () => {
      expect(networkService).toBeInstanceOf(NetworkService);
    });

    it('should throw error if no server URL provided', () => {
      delete process.env.SERVER_URL;
      expect(() => new NetworkService()).toThrow('Server URL is required');
    });

    it('should use SERVER_URL env variable if provided', () => {
      process.env.SERVER_URL = 'http://test-server:4000';
      const service = new NetworkService();
      expect(service).toBeInstanceOf(NetworkService);
      delete process.env.SERVER_URL;
    });
  });

  describe('connect', () => {
    it('should resolve on successful connection', async () => {
      mockSocket.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'connect') callback();
      });

      const promise = networkService.connect();
      // Simulate async connection
      await Promise.resolve();
      await expect(promise).resolves.toBeUndefined();
    });

    it('should reject on connection error', async () => {
      mockSocket.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'connect_error') callback(new Error('Connection failed'));
      });

      const promise = networkService.connect();
      await expect(promise).rejects.toThrow('Connection failed');
    });

    it('should set up event listeners on connect', async () => {
      mockSocket.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'connect') callback();
      });

      await networkService.connect();
      expect(mockSocket.on).toHaveBeenCalledWith(
        'disconnect',
        expect.any(Function),
      );
      expect(mockSocket.on).toHaveBeenCalledWith(
        'reconnect',
        expect.any(Function),
      );
      expect(mockSocket.on).toHaveBeenCalledWith(
        'matchmaking_queued',
        expect.any(Function),
      );
      expect(mockSocket.on).toHaveBeenCalledWith(
        'matchmaking_success',
        expect.any(Function),
      );
    });

    it('should include auth token if provided', async () => {
      mockSocket.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'connect') callback();
      });

      await networkService.connect('test-token');
      expect(io).toHaveBeenCalledWith(
        'http://localhost:3000',
        expect.objectContaining({
          auth: { token: 'test-token' },
        }),
      );
    });
  });

  describe('disconnect', () => {
    it('should disconnect socket', async () => {
      mockSocket.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'connect') callback();
      });

      await networkService.connect();
      networkService.disconnect();
      expect(mockSocket.disconnect).toHaveBeenCalled();
    });
  });

  describe('event emission', () => {
    it('should emit events to listeners', async () => {
      const callback = jest.fn();
      mockSocket.on.mockImplementation((event: string, cb: Function) => {
        if (event === 'connect') cb();
      });

      await networkService.connect();
      networkService.on('matchmaking_success', callback);

      // Find and call the matchmaking_success handler
      const calls = mockSocket.on.mock.calls;
      const handler = calls.find((c: any[]) => c[0] === 'matchmaking_success');
      if (handler) {
        handler[1]({ roomId: 'room1' });
      }

      expect(callback).toHaveBeenCalledWith({ roomId: 'room1' });
    });
  });

  describe('matchmaking', () => {
    it('should request matchmaking', async () => {
      mockSocket.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'connect') callback();
      });

      await networkService.connect();
      networkService.requestMatchmaking({
        gameMode: 'deathmatch',
        region: 'us-east',
        maxPlayers: 4,
      });

      expect(mockSocket.emit).toHaveBeenCalledWith('matchmaking_request', {
        gameMode: 'deathmatch',
        region: 'us-east',
        maxPlayers: 4,
      });
    });

    it('should cancel matchmaking', async () => {
      mockSocket.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'connect') callback();
      });

      await networkService.connect();
      networkService.cancelMatchmaking();

      expect(mockSocket.emit).toHaveBeenCalledWith('matchmaking_cancel');
    });
  });

  describe('room management', () => {
    it('should join room', async () => {
      mockSocket.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'connect') callback();
      });

      await networkService.connect();
      networkService.joinRoom('room123');

      expect(mockSocket.emit).toHaveBeenCalledWith('join_room', 'room123');
    });

    it('should leave room', async () => {
      mockSocket.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'connect') callback();
      });

      await networkService.connect();
      // First set room ID via event
      const roomJoinedHandler = mockSocket.on.mock.calls.find(
        (c: any[]) => c[0] === 'room_joined',
      );
      if (roomJoinedHandler) {
        roomJoinedHandler[1]({ roomId: 'room123' });
      }
      networkService.leaveRoom();

      expect(mockSocket.emit).toHaveBeenCalledWith('leave_room', 'room123');
    });

    it('should get current room', async () => {
      expect(networkService.getCurrentRoom()).toBeNull();

      mockSocket.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'connect') callback();
      });

      await networkService.connect();
      const roomJoinedHandler = mockSocket.on.mock.calls.find(
        (c: any[]) => c[0] === 'room_joined',
      );
      if (roomJoinedHandler) {
        roomJoinedHandler[1]({ roomId: 'room123' });
      }

      expect(networkService.getCurrentRoom()).toBe('room123');
    });
  });

  describe('player ID', () => {
    it('should get player ID after connection', async () => {
      mockSocket.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'connect') callback();
        if (event === 'connection_ack') callback({ playerId: 'player1' });
      });

      await networkService.connect();
      expect(networkService.getPlayerId()).toBe('player1');
    });
  });

  describe('connection state', () => {
    it('should report disconnected initially', () => {
      expect(networkService.isConnected()).toBe(false);
    });

    it('should report connected after connect', async () => {
      mockSocket.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'connect') callback();
      });

      await networkService.connect();
      expect(networkService.isConnected()).toBe(true);
    });

    it('should report disconnected after disconnect', async () => {
      mockSocket.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'connect') callback();
      });

      await networkService.connect();
      networkService.disconnect();
      expect(networkService.isConnected()).toBe(false);
    });
  });

  describe('gameplay events', () => {
    beforeEach(async () => {
      mockSocket.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'connect') callback();
      });
      await networkService.connect();
    });

    it('should send player input', () => {
      networkService.sendPlayerInput({
        sequence: 1,
        input: {
          left: true,
          right: false,
          up: false,
          down: false,
          jump: false,
        },
        timestamp: 1000,
      });

      expect(mockSocket.emit).toHaveBeenCalledWith(
        'player_input',
        expect.objectContaining({
          sequence: 1,
          input: expect.objectContaining({ left: true }),
        }),
      );
    });

    it('should send jump', () => {
      networkService.sendJump();
      expect(mockSocket.emit).toHaveBeenCalledWith('player_jump');
    });

    it('should send skill', () => {
      networkService.sendSkill('fireball');
      expect(mockSocket.emit).toHaveBeenCalledWith('player_skill', 'fireball');
    });

    it('should send collect item', () => {
      networkService.sendCollectItem('coin1');
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'player_collect_item',
        'coin1',
      );
    });

    it('should send ping', () => {
      networkService.ping();
      expect(mockSocket.emit).toHaveBeenCalledWith('ping');
    });
  });

  describe('chat', () => {
    beforeEach(async () => {
      mockSocket.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'connect') callback();
      });
      await networkService.connect();
    });

    it('should send global chat message', () => {
      networkService.sendChatMessage('Hello world', 'global');
      expect(mockSocket.emit).toHaveBeenCalledWith('chat_message', {
        message: 'Hello world',
        channel: 'global',
        targetPlayerId: undefined,
      });
    });

    it('should send room chat message', () => {
      networkService.sendChatMessage('Room msg', 'room');
      expect(mockSocket.emit).toHaveBeenCalledWith('chat_message', {
        message: 'Room msg',
        channel: 'room',
        targetPlayerId: undefined,
      });
    });

    it('should send whisper message', () => {
      networkService.sendChatMessage('Secret', 'whisper', 'player2');
      expect(mockSocket.emit).toHaveBeenCalledWith('chat_message', {
        message: 'Secret',
        channel: 'whisper',
        targetPlayerId: 'player2',
      });
    });
  });

  describe('event forwarding', () => {
    it('should forward game_state_update event', async () => {
      const callback = jest.fn();
      mockSocket.on.mockImplementation((event: string, cb: Function) => {
        if (event === 'connect') cb();
      });

      await networkService.connect();
      networkService.on('game_state_update', callback);

      const handler = mockSocket.on.mock.calls.find(
        (c: any[]) => c[0] === 'game_state_update',
      );
      if (handler) {
        handler[1]({ state: 'playing' });
      }

      expect(callback).toHaveBeenCalledWith({ state: 'playing' });
    });

    it('should forward player_damaged event', async () => {
      const callback = jest.fn();
      mockSocket.on.mockImplementation((event: string, cb: Function) => {
        if (event === 'connect') cb();
      });

      await networkService.connect();
      networkService.on('player_damaged', callback);

      const handler = mockSocket.on.mock.calls.find(
        (c: any[]) => c[0] === 'player_damaged',
      );
      if (handler) {
        handler[1]({ damage: 10 });
      }

      expect(callback).toHaveBeenCalledWith({ damage: 10 });
    });

    it('should forward chat_message event', async () => {
      const callback = jest.fn();
      mockSocket.on.mockImplementation((event: string, cb: Function) => {
        if (event === 'connect') cb();
      });

      await networkService.connect();
      networkService.on('chat_message', callback);

      const handler = mockSocket.on.mock.calls.find(
        (c: any[]) => c[0] === 'chat_message',
      );
      if (handler) {
        handler[1]({ message: 'hi', playerId: 'player1' });
      }

      expect(callback).toHaveBeenCalledWith({
        message: 'hi',
        playerId: 'player1',
      });
    });
  });
});
