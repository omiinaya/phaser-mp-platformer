import { LobbyScene } from '../../../src/scenes/LobbyScene';
import { NetworkService } from '../../../src/services/NetworkService';
import { logger } from '../../../src/utils/logger';

// Declare mock variables (using var to avoid TDZ with hoisted jest.mock)
var mockSceneStart: jest.Mock;
var mockSceneStop: jest.Mock;
var mockAddRect: jest.Mock;
var mockAddText: jest.Mock;
var mockTweensAdd: jest.Mock;

// Mock Phaser with custom implementation
jest.mock('phaser', () => {
  mockSceneStart = jest.fn();
  mockSceneStop = jest.fn();
  mockAddRect = jest.fn().mockReturnValue({
    setOrigin: jest.fn().mockReturnThis(),
  });
  mockAddText = jest.fn().mockReturnValue({
    setOrigin: jest.fn().mockReturnThis(),
    setText: jest.fn().mockReturnThis(),
    setColor: jest.fn().mockReturnThis(),
    setAlpha: jest.fn().mockReturnThis(),
    setInteractive: jest.fn().mockReturnThis(),
    on: jest.fn().mockReturnThis(),
    setData: jest.fn().mockReturnThis(),
    destroy: jest.fn(),
  });
  mockTweensAdd = jest.fn().mockReturnValue({
    destroy: jest.fn(),
  });

  return {
    Scene: jest.fn().mockImplementation(function (this: any) {
      this.cameras = { main: { width: 800, height: 600 } };
      this.add = {
        rectangle: mockAddRect,
        text: mockAddText,
      };
      this.scene = { start: mockSceneStart, stop: mockSceneStop };
      this.tweens = { add: mockTweensAdd };
      this.events = { on: jest.fn().mockReturnThis(), emit: jest.fn() };
      this.children = { getByName: jest.fn() };
    }),
  };
});

// Mock dependencies
jest.mock('../../../src/core/InputManager', () => ({
  InputManager: jest.fn().mockImplementation(() => ({
    onInputEvent: jest.fn(),
    update: jest.fn(),
  })),
}));

jest.mock('../../../src/services/NetworkService', () => ({
  NetworkService: jest.fn().mockImplementation(() => ({
    connect: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
    requestMatchmaking: jest.fn(),
    once: jest.fn(),
    getPlayerId: jest.fn().mockReturnValue('player-123'),
    removeAllListeners: jest.fn(),
  })),
}));

jest.mock('../../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
  },
}));

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn().mockResolvedValue(undefined),
  },
});

describe('LobbyScene', () => {
  let scene: LobbyScene;
  let mockNetworkService: jest.Mocked<NetworkService>;

  beforeEach(() => {
    jest.clearAllMocks();
    if (mockSceneStart) mockSceneStart.mockClear();
    if (mockAddText) mockAddText.mockClear();
    if (mockAddRect) mockAddRect.mockClear();
    if (mockTweensAdd) mockTweensAdd.mockClear();

    mockNetworkService = {
      connect: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn(),
      on: jest.fn(),
      off: jest.fn(),
      emit: jest.fn(),
      requestMatchmaking: jest.fn(),
      once: jest.fn(),
      getPlayerId: jest.fn().mockReturnValue('player-123'),
      removeAllListeners: jest.fn(),
    } as any;

    (NetworkService as any).mockImplementation(() => mockNetworkService);

    // Create scene instance using the mocked Phaser.Scene
    scene = new LobbyScene() as any;
    (scene as any).cameras = { main: { width: 800, height: 600 } };
    (scene as any).add = {
      rectangle: mockAddRect,
      text: mockAddText,
    };
    (scene as any).scene = { start: mockSceneStart, stop: mockSceneStop };
    (scene as any).tweens = { add: mockTweensAdd };
    (scene as any).events = { on: jest.fn().mockReturnThis(), emit: jest.fn() };
    (scene as any).children = { getByName: jest.fn() };
  });

  describe('init', () => {
    it('should log initialization data', () => {
      scene.init({ fromMenu: true });
      expect(logger.info).toHaveBeenCalledWith('LobbyScene init:', {
        fromMenu: true,
      });
    });
  });

  describe('create', () => {
    it('should create background', () => {
      scene.create();
      expect(mockAddRect).toHaveBeenCalledWith(0, 0, 800, 600, 0x1a1a2e);
    });

    it('should create title', () => {
      scene.create();
      expect(mockAddText).toHaveBeenCalledWith(
        400,
        80,
        'MULTIPLAYER LOBBY',
        expect.objectContaining({
          fontSize: '48px',
          color: '#fff',
        }),
      );
    });

    it('should create status text', () => {
      scene.create();
      expect(mockAddText).toHaveBeenCalledWith(
        400,
        200,
        'Connecting...',
        expect.objectContaining({
          fontSize: '24px',
          color: '#ffff00',
        }),
      );
    });

    it('should create room code display', () => {
      scene.create();
      expect(mockAddText).toHaveBeenCalledWith(
        400,
        300,
        'Room Code:',
        expect.objectContaining({ fontSize: '20px' }),
      );
      expect(mockAddText).toHaveBeenCalledWith(
        400,
        340,
        '...',
        expect.objectContaining({
          fontSize: '36px',
          color: '#fff',
        }),
      );
    });

    it('should make room code interactive', () => {
      scene.create();
      expect(mockAddText).toHaveBeenCalledWith(
        expect.any(Number),
        expect.any(Number),
        '...',
        expect.objectContaining({}),
      );
    });

    it('should create player list section', () => {
      scene.create();
      expect(mockAddText).toHaveBeenCalledWith(
        400,
        450,
        'Players:',
        expect.objectContaining({ fontSize: '20px' }),
      );
    });

    it('should create start game button', () => {
      scene.create();
      expect(mockAddText).toHaveBeenCalledWith(
        400,
        600,
        'START GAME',
        expect.objectContaining({
          fontSize: '32px',
          color: '#555',
        }),
      );
    });

    it('should start game button as disabled initially', () => {
      scene.create();
      // Find the call for START GAME (text is 3rd arg: x, y, text, style)
      const startButtonCall = mockAddText.mock.calls.find(
        (call) => call[2] === 'START GAME',
      );
      expect(startButtonCall).toBeDefined();
      // Get the returned text object from that call
      const result =
        mockAddText.mock.results[
          mockAddText.mock.calls.indexOf(startButtonCall!)
        ]?.value;
      expect(result?.setAlpha).toHaveBeenCalledWith(0.5);
    });

    it('should create back button', () => {
      scene.create();
      expect(mockAddText).toHaveBeenCalledWith(
        400,
        700,
        'Back to Menu',
        expect.objectContaining({
          fontSize: '24px',
        }),
      );
    });

    it('should initialize network service', () => {
      scene.create();
      expect(NetworkService).toHaveBeenCalled();
    });

    it('should setup network listeners', () => {
      scene.create();
      expect(mockNetworkService.on).toHaveBeenCalled();
    });

    it('should connect to server', () => {
      scene.create();
      expect(mockNetworkService.connect).toHaveBeenCalled();
    });
  });

  describe('network events', () => {
    beforeEach(() => {
      scene.create();
    });

    it('should handle connected event', () => {
      const connectedCallback = mockNetworkService.on.mock.calls.find(
        (call: any[]) => call[0] === 'connected',
      )?.[1];

      if (connectedCallback) {
        connectedCallback({ playerId: 'player-123' });

        expect(logger.info).toHaveBeenCalledWith(
          'Connected with player ID:',
          'player-123',
        );
        expect(mockNetworkService.requestMatchmaking).toHaveBeenCalledWith({
          gameMode: 'platformer',
          maxPlayers: 4,
        });
      }
    });

    it('should handle room_created event', () => {
      const roomCreatedCallback = mockNetworkService.on.mock.calls.find(
        (call: any[]) => call[0] === 'room_created',
      )?.[1];

      if (roomCreatedCallback) {
        roomCreatedCallback({ roomId: 'ABC123', players: [] });

        expect((scene as any).roomId).toBe('ABC123');
        expect((scene as any).inRoom).toBe(true);
        // The room code text should be updated via setText, not a new add
        const roomCodeText = (scene as any).roomCodeText;
        expect(roomCodeText).toBeDefined();
        expect(roomCodeText.setText).toHaveBeenCalledWith('ABC123');
      }
    });

    it('should handle player_joined event', () => {
      (scene as any).players = ['player1'];
      const playerJoinedCallback = mockNetworkService.on.mock.calls.find(
        (call: any[]) => call[0] === 'player_joined',
      )?.[1];

      if (playerJoinedCallback) {
        playerJoinedCallback({
          playerId: 'player2',
          socketId: 'socket2',
          roomId: 'ABC123',
        });

        expect((scene as any).players).toContain('player2');
        expect((scene as any).players).toHaveLength(2);
      }
    });

    it('should enable start button when 2+ players', () => {
      (scene as any).players = ['player1'];
      const playerJoinedCallback = mockNetworkService.on.mock.calls.find(
        (call: any[]) => call[0] === 'player_joined',
      )?.[1];

      if (playerJoinedCallback) {
        playerJoinedCallback({
          playerId: 'player2',
          socketId: 'socket2',
          roomId: 'ABC123',
        });

        expect(scene.events.emit).toHaveBeenCalledWith('enableStartButton');
      }
    });

    it('should handle player_left event', () => {
      (scene as any).players = ['player1', 'player2'];
      const playerLeftCallback = mockNetworkService.on.mock.calls.find(
        (call: any[]) => call[0] === 'player_left',
      )?.[1];

      if (playerLeftCallback) {
        playerLeftCallback({ playerId: 'player1', roomId: 'ABC123' });

        expect((scene as any).players).not.toContain('player1');
        expect((scene as any).players).toHaveLength(1);
      }
    });

    it('should disable start button when less than 2 players', () => {
      (scene as any).players = ['player1', 'player2'];
      const startBtn = {
        setAlpha: jest.fn(),
        setColor: jest.fn(),
        disableInteractive: jest.fn(),
      };
      (scene as any).children = {
        getByName: jest.fn().mockReturnValue(startBtn),
      };

      const playerLeftCallback = mockNetworkService.on.mock.calls.find(
        (call: any[]) => call[0] === 'player_left',
      )?.[1];

      if (playerLeftCallback) {
        playerLeftCallback({ playerId: 'player1', roomId: 'ABC123' });

        expect(startBtn.setAlpha).toHaveBeenCalledWith(0.5);
        expect(startBtn.setColor).toHaveBeenCalledWith('#555');
        expect(startBtn.disableInteractive).toHaveBeenCalled();
      }
    });

    it('should handle error event', () => {
      const errorCallback = mockNetworkService.on.mock.calls.find(
        (call: any[]) => call[0] === 'error',
      )?.[1];

      if (errorCallback) {
        errorCallback({ message: 'Connection lost' });

        // Should update statusText with error message and color
        const statusText = (scene as any).statusText;
        expect(statusText).toBeDefined();
        expect(statusText.setText).toHaveBeenCalledWith(
          'Error: Connection lost',
        );
        expect(statusText.setColor).toHaveBeenCalledWith('#ff0000');
      }
    });
  });

  describe('room code copying', () => {
    it('should copy room code to clipboard', async () => {
      (scene as any).roomId = 'ABC123';
      await (scene as any).copyRoomCode();

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('ABC123');
    });

    it('should show copied feedback', async () => {
      (scene as any).roomId = 'ABC123';
      await (scene as any).copyRoomCode();

      // The add text for "Copied!" should be called
      expect(mockAddText).toHaveBeenCalledWith(
        400,
        420,
        'Copied!',
        expect.objectContaining({
          fontSize: '16px',
          color: '#4CAF50',
        }),
      );
    });
  });

  describe('updatePlayerList', () => {
    it('should show waiting message when no players', () => {
      (scene as any).players = [];
      (scene as any).playerListText = { setText: jest.fn() };

      (scene as any).updatePlayerList();

      expect((scene as any).playerListText.setText).toHaveBeenCalledWith(
        'Waiting for players...',
      );
    });

    it('should list all players with numbers', () => {
      (scene as any).players = ['player1', 'player2', 'player3'];
      (scene as any).playerListText = { setText: jest.fn() };
      (scene as any).networkService = { getPlayerId: () => 'player2' };

      (scene as any).updatePlayerList();

      expect((scene as any).playerListText.setText).toHaveBeenCalledWith(
        '1. player1\n2. player2 (You)\n3. player3',
      );
    });

    it('should truncate long player IDs', () => {
      (scene as any).players = ['verylongplayerid123456'];
      (scene as any).playerListText = { setText: jest.fn() };

      (scene as any).updatePlayerList();

      expect((scene as any).playerListText.setText).toHaveBeenCalledWith(
        '1. verylongplay',
      );
    });
  });

  describe('showPlayerName', () => {
    it('should show joined notification in green', () => {
      const { width } = scene.cameras.main;
      (scene as any).showPlayerName('player1', 'joined');

      expect(mockAddText).toHaveBeenCalledWith(
        width / 2,
        520,
        'Player player1 joined',
        expect.objectContaining({ color: '#4CAF50' }),
      );
    });

    it('should show left notification in red', () => {
      const { width } = scene.cameras.main;
      (scene as any).showPlayerName('player1', 'left');

      expect(mockAddText).toHaveBeenCalledWith(
        width / 2,
        520,
        'Player player1 left',
        expect.objectContaining({ color: '#f44336' }),
      );
    });
  });

  describe('startGame', () => {
    it('should start game when in room', () => {
      (scene as any).inRoom = true;
      (scene as any).roomId = 'ABC123';

      (scene as any).startGame();

      expect(mockSceneStart).toHaveBeenCalledWith('GameScene', {
        level: 1,
        roomId: 'ABC123',
      });
    });

    it('should not start game when not in room', () => {
      (scene as any).inRoom = false;

      (scene as any).startGame();

      expect(mockSceneStart).not.toHaveBeenCalled();
    });
  });

  describe('destroy', () => {
    beforeEach(() => {
      // Create the scene first so networkService is initialized
      scene.create();
    });

    it('should disconnect network service', () => {
      scene.destroy();
      expect(mockNetworkService.disconnect).toHaveBeenCalled();
    });

    it('should remove all network listeners', () => {
      scene.destroy();
      expect(mockNetworkService.removeAllListeners).toHaveBeenCalled();
    });
  });
});
