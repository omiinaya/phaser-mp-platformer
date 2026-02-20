/**
 * @file Tests for matchmaking worker thread message handling.
 * These tests simulate the worker thread behavior to improve coverage.
 */

import { MatchmakingRequest } from '../../../src/types/matchmaking';

// Mock worker_threads first
const mockPostMessage = jest.fn();
const mockOnMessage = jest.fn();

jest.mock('worker_threads', () => ({
  parentPort: {
    on: mockOnMessage,
    postMessage: mockPostMessage,
  },
}));

// Must import after mocking
// Note: we mock the worker but don't need to reference it directly

describe('matchmaking.worker - Worker Thread', () => {
  let messageHandler: Function | null = null;

  beforeEach(() => {
    jest.clearAllMocks();
    // Capture the message handler that gets registered
    mockOnMessage.mockImplementation((event: string, handler: Function) => {
      if (event === 'message') {
        messageHandler = handler;
      }
    });
    // Clear and reimport to trigger the registration
    jest.resetModules();
    jest.doMock('worker_threads', () => ({
      parentPort: {
        on: mockOnMessage,
        postMessage: mockPostMessage,
      },
    }));
    require('../../../src/workers/matchmaking.worker');
  });

  afterEach(() => {
    jest.dontMock('../../../src/workers/matchmaking.worker');
    jest.resetModules();
    messageHandler = null;
  });

  it('should register a message handler when parentPort exists', () => {
    expect(mockOnMessage).toHaveBeenCalledWith('message', expect.any(Function));
    expect(messageHandler).toBeDefined();
    expect(typeof messageHandler).toBe('function');
  });

  it('should process matches and post results', () => {
    if (!messageHandler) {
      throw new Error('Message handler not registered');
    }

    const requests: MatchmakingRequest[] = [
      {
        requestId: 'req1',
        playerId: 'player1',
        socketId: 'socket1',
        preferences: {
          gameMode: 'deathmatch',
          maxPlayers: 4,
          region: 'us-east',
        },
        queuedAt: new Date(),
      },
      {
        requestId: 'req2',
        playerId: 'player2',
        socketId: 'socket2',
        preferences: {
          gameMode: 'deathmatch',
          maxPlayers: 4,
          region: 'us-east',
        },
        queuedAt: new Date(),
      },
      {
        requestId: 'req3',
        playerId: 'player3',
        socketId: 'socket3',
        preferences: {
          gameMode: 'deathmatch',
          maxPlayers: 4,
          region: 'us-east',
        },
        queuedAt: new Date(),
      },
      {
        requestId: 'req4',
        playerId: 'player4',
        socketId: 'socket4',
        preferences: {
          gameMode: 'deathmatch',
          maxPlayers: 4,
          region: 'us-east',
        },
        queuedAt: new Date(),
      },
    ];

    messageHandler(requests);

    expect(mockPostMessage).toHaveBeenCalledWith({
      matches: expect.any(Array),
    });
    expect(mockPostMessage.mock.calls[0][0].matches).toHaveLength(1);
    expect(
      mockPostMessage.mock.calls[0][0].matches[0].matchedRequests,
    ).toHaveLength(4);
  });

  it('should handle errors and post error message', () => {
    if (!messageHandler) {
      throw new Error('Message handler not registered');
    }

    // Create data that will cause an error (e.g., null instead of array)
    const invalidData = null as any;

    // This should trigger the catch block
    messageHandler(invalidData);

    expect(mockPostMessage).toHaveBeenCalled();
    const result = mockPostMessage.mock.calls[0][0];
    expect(result).toHaveProperty('error');
  });

  it('should handle empty queue', () => {
    if (!messageHandler) {
      throw new Error('Message handler not registered');
    }

    messageHandler([]);

    expect(mockPostMessage).toHaveBeenCalledWith({
      matches: [],
    });
  });
});
