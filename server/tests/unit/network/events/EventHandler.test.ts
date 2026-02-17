import { EventHandler } from '../../../../src/network/events/EventHandler';
import { EventNames } from '../../../../src/network/events/eventTypes';

// Mock dependencies
jest.mock('../../../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('EventHandler', () => {
  let eventHandler: EventHandler;
  let mockConnectionManager: any;
  let mockMatchmaker: any;
  let mockRoomManager: any;
  let mockGameSync: any;
  let mockSocket: any;

  beforeEach(() => {
    mockConnectionManager = {
      getSession: jest.fn(),
      getSessionByPlayerId: jest.fn(),
    };
    mockMatchmaker = {
      enqueuePlayer: jest.fn().mockReturnValue('request-123'),
      dequeuePlayer: jest.fn().mockReturnValue(true),
    };
    mockRoomManager = {
      getRoom: jest.fn(),
      addPlayer: jest.fn().mockReturnValue(true),
      removePlayer: jest.fn().mockReturnValue(true),
    };
    mockGameSync = {
      applyPlayerInput: jest.fn(),
    };

    eventHandler = new EventHandler(
      mockConnectionManager,
      mockMatchmaker,
      mockRoomManager,
      mockGameSync
    );

    mockSocket = {
      on: jest.fn((event, callback) => {
        // Store callback for direct testing
        mockSocket._callbacks = mockSocket._callbacks || {};
        mockSocket._callbacks[event] = callback;
      }),
      emit: jest.fn(),
      join: jest.fn(),
      leave: jest.fn(),
      to: jest.fn().mockReturnValue({
        emit: jest.fn(),
      }),
      broadcast: {
        emit: jest.fn(),
      },
      id: 'socket-123',
      nsp: {
        sockets: {
          get: jest.fn().mockReturnValue({
            emit: jest.fn(),
          }),
        },
      },
      _callbacks: {},
    };
  });

  describe('registerSocket', () => {
    it('should register all socket event listeners', () => {
      eventHandler.registerSocket(mockSocket);

      // Verify that socket.on was called for each event
      expect(mockSocket.on).toHaveBeenCalledWith(
        EventNames.MATCHMAKING_REQUEST,
        expect.any(Function)
      );
      expect(mockSocket.on).toHaveBeenCalledWith(
        EventNames.MATCHMAKING_CANCEL,
        expect.any(Function)
      );
      expect(mockSocket.on).toHaveBeenCalledWith('join_room', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('leave_room', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith(
        EventNames.PLAYER_INPUT,
        expect.any(Function)
      );
      expect(mockSocket.on).toHaveBeenCalledWith(
        EventNames.PLAYER_JUMP,
        expect.any(Function)
      );
      expect(mockSocket.on).toHaveBeenCalledWith(
        EventNames.PLAYER_SKILL,
        expect.any(Function)
      );
      expect(mockSocket.on).toHaveBeenCalledWith(
        EventNames.PLAYER_COLLECT_ITEM,
        expect.any(Function)
      );
      expect(mockSocket.on).toHaveBeenCalledWith(
        EventNames.CHAT_MESSAGE,
        expect.any(Function)
      );
      expect(mockSocket.on).toHaveBeenCalledWith(EventNames.PING, expect.any(Function));
    });
  });

  describe('handleMatchmakingRequest', () => {
    it('should enqueue player for matchmaking', () => {
      eventHandler.registerSocket(mockSocket);
      const data = { gameMode: 'deathmatch', region: 'us' };
      
      mockSocket._callbacks[EventNames.MATCHMAKING_REQUEST](data);

      expect(mockMatchmaker.enqueuePlayer).toHaveBeenCalledWith(mockSocket, data);
    });

    it('should emit error on matchmaking failure', () => {
      mockMatchmaker.enqueuePlayer.mockImplementation(() => {
        throw new Error('Matchmaking error');
      });

      eventHandler.registerSocket(mockSocket);
      const data = { gameMode: 'deathmatch' };
      
      mockSocket._callbacks[EventNames.MATCHMAKING_REQUEST](data);

      expect(mockSocket.emit).toHaveBeenCalledWith(EventNames.ERROR, { message: 'Matchmaking failed' });
    });
  });

  describe('handleMatchmakingCancel', () => {
    it('should dequeue player and emit cancel event', () => {
      eventHandler.registerSocket(mockSocket);

      mockSocket._callbacks[EventNames.MATCHMAKING_CANCEL]();

      expect(mockMatchmaker.dequeuePlayer).toHaveBeenCalledWith(mockSocket.id);
      expect(mockSocket.emit).toHaveBeenCalledWith('matchmaking_canceled');
    });

    it('should not emit cancel event if dequeue fails', () => {
      mockMatchmaker.dequeuePlayer.mockReturnValue(false);

      eventHandler.registerSocket(mockSocket);

      mockSocket._callbacks[EventNames.MATCHMAKING_CANCEL]();

      expect(mockSocket.emit).not.toHaveBeenCalledWith('matchmaking_canceled');
    });
  });

  describe('handleJoinRoom', () => {
    it('should join room successfully when session and room exist', () => {
      mockConnectionManager.getSession.mockReturnValue({
        socketId: 'socket-123',
        playerId: 'player-1',
        roomId: null,
      });
      mockRoomManager.getRoom.mockReturnValue({ roomId: 'room-1' });

      eventHandler.registerSocket(mockSocket);
      mockSocket._callbacks['join_room']('room-1');

      expect(mockConnectionManager.getSession).toHaveBeenCalledWith(mockSocket.id);
      expect(mockRoomManager.getRoom).toHaveBeenCalledWith('room-1');
      expect(mockRoomManager.addPlayer).toHaveBeenCalledWith('room-1', 'player-1', mockSocket.id);
      expect(mockSocket.join).toHaveBeenCalledWith('room-1');
      expect(mockSocket.emit).toHaveBeenCalledWith('room_join_success', { roomId: 'room-1' });
    });

    it('should emit error when session not found', () => {
      mockConnectionManager.getSession.mockReturnValue(undefined);

      eventHandler.registerSocket(mockSocket);
      mockSocket._callbacks['join_room']('room-1');

      expect(mockSocket.emit).toHaveBeenCalledWith(EventNames.ERROR, { message: 'Session not found' });
    });

    it('should emit error when room does not exist', () => {
      mockConnectionManager.getSession.mockReturnValue({
        socketId: 'socket-123',
        playerId: 'player-1',
        roomId: null,
      });
      mockRoomManager.getRoom.mockReturnValue(undefined);

      eventHandler.registerSocket(mockSocket);
      mockSocket._callbacks['join_room']('room-1');

      expect(mockSocket.emit).toHaveBeenCalledWith(EventNames.ERROR, { message: 'Room does not exist' });
    });

    it('should emit error when addPlayer fails', () => {
      mockConnectionManager.getSession.mockReturnValue({
        socketId: 'socket-123',
        playerId: 'player-1',
        roomId: null,
      });
      mockRoomManager.getRoom.mockReturnValue({ roomId: 'room-1' });
      mockRoomManager.addPlayer.mockReturnValue(false);

      eventHandler.registerSocket(mockSocket);
      mockSocket._callbacks['join_room']('room-1');

      expect(mockSocket.emit).toHaveBeenCalledWith(EventNames.ERROR, { message: 'Cannot join room' });
    });
  });

  describe('handleLeaveRoom', () => {
    it('should leave room successfully', () => {
      mockConnectionManager.getSession.mockReturnValue({
        socketId: 'socket-123',
        playerId: 'player-1',
        roomId: 'room-1',
      });

      eventHandler.registerSocket(mockSocket);
      mockSocket._callbacks['leave_room']('room-1');

      expect(mockConnectionManager.getSession).toHaveBeenCalledWith(mockSocket.id);
      expect(mockRoomManager.removePlayer).toHaveBeenCalledWith('room-1', 'player-1');
      expect(mockSocket.leave).toHaveBeenCalledWith('room-1');
      expect(mockSocket.emit).toHaveBeenCalledWith('room_left', { roomId: 'room-1' });
    });

    it('should do nothing when session not found', () => {
      mockConnectionManager.getSession.mockReturnValue(undefined);

      eventHandler.registerSocket(mockSocket);
      mockSocket._callbacks['leave_room']('room-1');

      expect(mockRoomManager.removePlayer).not.toHaveBeenCalled();
    });

    it('should do nothing when removePlayer fails', () => {
      mockConnectionManager.getSession.mockReturnValue({
        socketId: 'socket-123',
        playerId: 'player-1',
        roomId: 'room-1',
      });
      mockRoomManager.removePlayer.mockReturnValue(false);

      eventHandler.registerSocket(mockSocket);
      mockSocket._callbacks['leave_room']('room-1');

      expect(mockSocket.leave).not.toHaveBeenCalled();
    });
  });

  describe('handlePlayerInput', () => {
    it('should apply player input and broadcast to room', () => {
      const session = {
        socketId: 'socket-123',
        playerId: 'player-1',
        roomId: 'room-1',
      };
      mockConnectionManager.getSession.mockReturnValue(session);
      const inputData = { sequence: 1, input: { left: true }, timestamp: 123 };

      eventHandler.registerSocket(mockSocket);
      mockSocket._callbacks[EventNames.PLAYER_INPUT](inputData);

      expect(mockGameSync.applyPlayerInput).toHaveBeenCalledWith('room-1', 'player-1', inputData);
      expect(mockSocket.to).toHaveBeenCalledWith('room-1');
    });

    it('should do nothing when session not found', () => {
      mockConnectionManager.getSession.mockReturnValue(undefined);

      eventHandler.registerSocket(mockSocket);
      mockSocket._callbacks[EventNames.PLAYER_INPUT]({ sequence: 1, input: {}, timestamp: 123 });

      expect(mockGameSync.applyPlayerInput).not.toHaveBeenCalled();
    });

    it('should do nothing when not in a room', () => {
      mockConnectionManager.getSession.mockReturnValue({
        socketId: 'socket-123',
        playerId: 'player-1',
        roomId: null,
      });

      eventHandler.registerSocket(mockSocket);
      mockSocket._callbacks[EventNames.PLAYER_INPUT]({ sequence: 1, input: {}, timestamp: 123 });

      expect(mockGameSync.applyPlayerInput).not.toHaveBeenCalled();
    });
  });

  describe('handlePlayerJump', () => {
    it('should broadcast jump to room', () => {
      mockConnectionManager.getSession.mockReturnValue({
        socketId: 'socket-123',
        playerId: 'player-1',
        roomId: 'room-1',
      });

      eventHandler.registerSocket(mockSocket);
      mockSocket._callbacks[EventNames.PLAYER_JUMP]();

      expect(mockSocket.to).toHaveBeenCalledWith('room-1');
    });
  });

  describe('handlePlayerSkill', () => {
    it('should broadcast skill to room', () => {
      mockConnectionManager.getSession.mockReturnValue({
        socketId: 'socket-123',
        playerId: 'player-1',
        roomId: 'room-1',
      });

      eventHandler.registerSocket(mockSocket);
      mockSocket._callbacks[EventNames.PLAYER_SKILL]('fireball');

      expect(mockSocket.to).toHaveBeenCalledWith('room-1');
    });
  });

  describe('handleCollectItem', () => {
    it('should broadcast item collection to room', () => {
      mockConnectionManager.getSession.mockReturnValue({
        socketId: 'socket-123',
        playerId: 'player-1',
        roomId: 'room-1',
      });

      eventHandler.registerSocket(mockSocket);
      mockSocket._callbacks[EventNames.PLAYER_COLLECT_ITEM]('gem-1');

      expect(mockSocket.to).toHaveBeenCalledWith('room-1');
    });
  });

  describe('handleChatMessage', () => {
    it('should send room chat message', () => {
      mockConnectionManager.getSession.mockReturnValue({
        socketId: 'socket-123',
        playerId: 'player-1',
        roomId: 'room-1',
      });

      eventHandler.registerSocket(mockSocket);
      mockSocket._callbacks[EventNames.CHAT_MESSAGE]({ message: 'Hello', channel: 'room' });

      expect(mockSocket.to).toHaveBeenCalledWith('room-1');
    });

    it('should send global chat message', () => {
      mockConnectionManager.getSession.mockReturnValue({
        socketId: 'socket-123',
        playerId: 'player-1',
        roomId: null,
      });

      eventHandler.registerSocket(mockSocket);
      mockSocket._callbacks[EventNames.CHAT_MESSAGE]({ message: 'Hello', channel: 'global' });

      expect(mockSocket.broadcast.emit).toHaveBeenCalledWith(EventNames.CHAT_MESSAGE, expect.any(Object));
    });

    it('should send whisper message', () => {
      mockConnectionManager.getSession.mockReturnValue({
        socketId: 'socket-123',
        playerId: 'player-1',
        roomId: null,
      });
      mockConnectionManager.getSessionByPlayerId.mockReturnValue({
        socketId: 'socket-target',
        playerId: 'player-2',
      });

      eventHandler.registerSocket(mockSocket);
      mockSocket._callbacks[EventNames.CHAT_MESSAGE]({ message: 'Secret', channel: 'whisper', targetPlayerId: 'player-2' });

      expect(mockConnectionManager.getSessionByPlayerId).toHaveBeenCalledWith('player-2');
    });

    it('should do nothing when session not found', () => {
      mockConnectionManager.getSession.mockReturnValue(undefined);

      eventHandler.registerSocket(mockSocket);
      mockSocket._callbacks[EventNames.CHAT_MESSAGE]({ message: 'Hello', channel: 'room' });

      expect(mockSocket.to).not.toHaveBeenCalled();
    });
  });

  describe('handlePing', () => {
    it('should respond with pong and server time', () => {
      eventHandler.registerSocket(mockSocket);
      mockSocket._callbacks[EventNames.PING]();

      expect(mockSocket.emit).toHaveBeenCalledWith(EventNames.PONG, expect.objectContaining({
        serverTime: expect.any(Number),
      }));
    });
  });
});
