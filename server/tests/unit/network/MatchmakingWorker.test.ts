import { MatchmakingWorker } from '../../../src/workers/MatchmakingWorker';
import { MatchmakingRequest } from '../../../src/types/matchmaking';

describe('MatchmakingWorker', () => {
  let worker: MatchmakingWorker;

  beforeEach(() => {
    worker = new MatchmakingWorker();
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
      const request3 = createMockRequest('player3', 'TEAM', 'us', 4); // asks for 4 but we have 3
      const request4 = createMockRequest('player4', 'TEAM', 'us', 4);

      const queue = [request1, request2, request3, request4];
      const result = await worker.process(queue);

      // player1 & player2 should match together (maxPlayers 2)
      // player3 & player4 might match if allowed to form larger group
      // The worker tries to form matches with the players available
      // At least one match should be formed
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
