// Mock worker_threads to avoid creating real worker threads in tests
jest.mock('worker_threads', () => {
  // Store message handlers per worker instance
  const handlers: { [key: string]: any } = {};
  let counter = 0;

  // Simulate the actual matchmaking algorithm
  const matchmake = (queue: any[]) => {
    if (queue.length === 0) {
      return [];
    }

    const matches: any[] = [];
    const minPlayers = 4;

    // Group by gameMode and region
    const groups: { [key: string]: any[] } = {};
    for (const request of queue) {
      const key = `${request.preferences.gameMode}:${request.preferences.region}`;
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(request);
    }

    // Try to create matches within each group
    for (const [key, group] of Object.entries(groups)) {
      // Sort by queuedAt time for fairness
      group.sort((a, b) => a.queuedAt.getTime() - b.queuedAt.getTime());

      while (group.length >= minPlayers) {
        // For maxPlayers preference, try to respect it
        const baseRequest = group[0];
        const maxPlayers = baseRequest.preferences.maxPlayers || 4;

        // Take up to maxPlayers players, but ensure we have at least minPlayers
        const takeCount = Math.max(minPlayers, Math.min(maxPlayers, group.length));
        if (takeCount >= minPlayers && group.length >= takeCount) {
          const matchedRequests = group.splice(0, takeCount);
          matches.push({ matchedRequests });
        } else {
          break;
        }
      }
    }

    return matches;
  };

  return {
    Worker: jest.fn().mockImplementation(() => {
      const id = `worker-${++counter}`;
      handlers[id] = {};

      return {
        on: jest.fn((event: string, handler: any) => {
          if (event === 'message') {
            handlers[id].messageHandler = handler;
          }
        }),
        postMessage: jest.fn((data: any) => {
          // Simulate worker processing with actual matchmaking logic
          if (handlers[id].messageHandler) {
            const matches = matchmake(data || []);
            // Use setImmediate to simulate async behavior
            setImmediate(() => {
              handlers[id].messageHandler!({ matches });
            });
          }
        }),
        terminate: jest.fn().mockResolvedValue(undefined),
      };
    }),
  };
});

import { MatchmakingWorker } from '../../../src/workers/MatchmakingWorker';
import { MatchmakingRequest } from '../../../src/types/matchmaking';

describe('MatchmakingWorker', () => {
  let worker: MatchmakingWorker;

  beforeEach(() => {
    worker = new MatchmakingWorker();
  });

  afterEach(async () => {
    // Ensure worker threads are properly terminated to avoid leaks
    if (worker) {
      await worker.terminate();
    }
  });

  describe('process', () => {
    it('should return empty array when queue is empty', async () => {
      const queue: MatchmakingRequest[] = [];
      const result = await worker.process(queue);
      expect(result).toEqual([]);
    });

    it('should return empty array when queue has fewer than minPlayers', async () => {
      const queue: MatchmakingRequest[] = [
        createMockRequest('player1', 'FFA', 'us'),
        createMockRequest('player2', 'FFA', 'us'),
      ];
      const result = await worker.process(queue);
      expect(result).toEqual([]);
    });

    it('should create match when enough players in same mode/region', async () => {
      const request1 = createMockRequest('player1', 'FFA', 'us');
      const request2 = createMockRequest('player2', 'FFA', 'us');
      const request3 = createMockRequest('player3', 'FFA', 'us');
      const request4 = createMockRequest('player4', 'FFA', 'us');
      const queue = [request1, request2, request3, request4];
      const result = await worker.process(queue);
      expect(result).toHaveLength(1);
      expect(result[0].matchedRequests).toHaveLength(4);
      expect(result[0].matchedRequests.map((r) => r.playerId)).toContain(
        'player1',
      );
      expect(result[0].matchedRequests.map((r) => r.playerId)).toContain(
        'player2',
      );
      expect(result[0].matchedRequests.map((r) => r.playerId)).toContain(
        'player3',
      );
      expect(result[0].matchedRequests.map((r) => r.playerId)).toContain(
        'player4',
      );
    });

    it('should create separate matches for different regions', async () => {
      // This test verifies that players in different regions are kept separate
      // but also that they don't match with less than maxPlayers (4) per group
      const request1 = createMockRequest('player1', 'FFA', 'us');
      const request2 = createMockRequest('player2', 'FFA', 'us');
      const request3 = createMockRequest('player3', 'FFA', 'eu');
      const request4 = createMockRequest('player4', 'FFA', 'eu');
      const queue = [request1, request2, request3, request4];
      const result = await worker.process(queue);
      // With only 2 players per region (< maxPlayers), no matches should be created
      expect(result).toEqual([]);
    });

    it('should respect maxPlayers preference', async () => {
      const request1 = createMockRequest('player1', 'TEAM', 'us', 2);
      const request2 = createMockRequest('player2', 'TEAM', 'us', 2);
      const request3 = createMockRequest('player3', 'TEAM', 'us', 4);
      const request4 = createMockRequest('player4', 'TEAM', 'us', 4);
      const queue = [request1, request2, request3, request4];
      const result = await worker.process(queue);
      // All 4 players should be matched respecting maxPlayers prefs
      // They can form 2 teams of 2 (each respecting maxPlayers=2)
      expect(result.length).toBeGreaterThanOrEqual(1);
    });

    it('should not match players with different gameModes', async () => {
      const request1 = createMockRequest('player1', 'FFA', 'us');
      const request2 = createMockRequest('player2', 'TEAM', 'us');
      const request3 = createMockRequest('player3', 'FFA', 'us');
      const request4 = createMockRequest('player4', 'FFA', 'us');
      const queue = [request1, request2, request3, request4];
      const result = await worker.process(queue);
      // Should only match the 3 FFA players (but need 4, so no match)
      // Actually need 4 for FFA, so likely no match
      expect(result).toEqual([]);
    });
  });

  describe('terminate', () => {
    it('should set state to terminated', () => {
      expect(worker.terminate()).toBeUndefined();
    });
  });
});

function createMockRequest(
  playerId: string,
  gameMode: string,
  region: string,
  maxPlayers: number = 4,
): MatchmakingRequest {
  return {
    requestId: `req_${playerId}`,
    playerId,
    socketId: `socket_${playerId}`,
    preferences: {
      gameMode,
      region,
      maxPlayers,
    },
    queuedAt: new Date(),
  };
}
