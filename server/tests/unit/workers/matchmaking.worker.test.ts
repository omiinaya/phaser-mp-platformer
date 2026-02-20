import { processQueue } from '../../../src/workers/matchmaking.worker';
import {
  MatchmakingRequest,
  MatchmakingPreferences,
} from '../../../src/types/matchmaking';

describe('matchmaking.worker', () => {
  const MAX_PLAYERS = 4;

  describe('processQueue', () => {
    it('should return empty array for empty queue', () => {
      const result = processQueue([]);
      expect(result).toEqual([]);
    });

    it('should not match when fewer than max players in group', () => {
      const requests = createRequests(3, 'deathmatch', 'us-east');
      const result = processQueue(requests);
      expect(result).toEqual([]);
    });

    it('should create a match when exactly max players in group', () => {
      const requests = createRequests(MAX_PLAYERS, 'deathmatch', 'us-east');
      const result = processQueue(requests);

      expect(result).toHaveLength(1);
      expect(result[0].matchedRequests).toHaveLength(MAX_PLAYERS);
      expect(result[0].roomId).toBeUndefined();
    });

    it('should create only one match when exactly max players', () => {
      const requests = createRequests(MAX_PLAYERS, 'deathmatch', 'us-east');
      const result = processQueue(requests);

      expect(result).toHaveLength(1);
    });

    it('should create one match and leave remainder when more than max players', () => {
      const requests = createRequests(6, 'deathmatch', 'us-east');
      const result = processQueue(requests);

      expect(result).toHaveLength(1);
      expect(result[0].matchedRequests).toHaveLength(MAX_PLAYERS);
      // Verify that the matched requests are from the original array
      expect(everyRequestIncluded(result[0].matchedRequests, requests)).toBe(
        true,
      );
    });

    it('should group requests by gameMode and region', () => {
      const deathmatchUs = createRequests(MAX_PLAYERS, 'deathmatch', 'us-east');
      const deathmatchEu = createRequests(MAX_PLAYERS, 'deathmatch', 'eu-west');
      const captureUs = createRequests(MAX_PLAYERS, 'capture', 'us-east');
      const requests = [...deathmatchUs, ...deathmatchEu, ...captureUs];

      const result = processQueue(requests);

      expect(result).toHaveLength(3);
    });

    it('should handle mixed regions with same gameMode', () => {
      const deathmatchUs1 = createRequests(2, 'deathmatch', 'us-east');
      const deathmatchUs2 = createRequests(2, 'deathmatch', 'us-east');
      const deathmatchEu = createRequests(MAX_PLAYERS, 'deathmatch', 'eu-west');
      const requests = [...deathmatchUs1, ...deathmatchUs2, ...deathmatchEu];

      const result = processQueue(requests);

      // us-east groups together: 2+2=4 -> one match
      // eu-west: 4 -> one match
      expect(result).toHaveLength(2);
    });

    it('should ignore region "any" in grouping', () => {
      const regionAny = createRequests(MAX_PLAYERS, 'deathmatch', 'any');
      const regionUs = createRequests(MAX_PLAYERS, 'deathmatch', 'us-east');
      const requests = [...regionAny, ...regionUs];

      const result = processQueue(requests);

      // They have different keys: "deathmatch_any" vs "deathmatch_us-east"
      expect(result).toHaveLength(2);
    });

    it('should treat null region as "any"', () => {
      const requests = createRequests(MAX_PLAYERS, 'deathmatch', null);
      const result = processQueue(requests);

      expect(result).toHaveLength(1);
    });

    it('should preserve request properties in matched groups', () => {
      const requests = [
        createRequest('req1', 'deathmatch', 'us-east', { skillLevel: 1500 }),
        createRequest('req2', 'deathmatch', 'us-east', { skillLevel: 1600 }),
        createRequest('req3', 'deathmatch', 'us-east', { skillLevel: 1700 }),
        createRequest('req4', 'deathmatch', 'us-east', { skillLevel: 1800 }),
      ];
      const result = processQueue(requests);

      expect(result[0].matchedRequests).toHaveLength(4);
      expect(result[0].matchedRequests[0].requestId).toBe('req1');
      expect(result[0].matchedRequests[0].preferences.skillLevel).toBe(1500);
    });

    it('should not match groups with less than max players even if multiple groups combined could reach max', () => {
      // Two groups of 2 in different regions won't match
      const group1 = createRequests(2, 'deathmatch', 'us-east');
      const group2 = createRequests(2, 'deathmatch', 'eu-west');
      const result = processQueue([...group1, ...group2]);

      expect(result).toEqual([]);
    });

    it('should handle very large queue with many groups', () => {
      const requests = [];
      for (let i = 0; i < 10; i++) {
        requests.push(
          ...createRequests(MAX_PLAYERS, 'deathmatch', `region-${i}`),
        );
      }
      const result = processQueue(requests);

      expect(result).toHaveLength(10);
    });
  });

  // Helper function to check if every item in subset is in array
  function everyRequestIncluded(
    subset: MatchmakingRequest[],
    array: MatchmakingRequest[],
  ): boolean {
    return subset.every((item) =>
      array.some(
        (arrItem) =>
          arrItem.requestId === item.requestId &&
          arrItem.playerId === item.playerId &&
          arrItem.socketId === item.socketId &&
          JSON.stringify(arrItem.preferences) ===
            JSON.stringify(item.preferences),
      ),
    );
  }

  // Helper to create a valid MatchmakingRequest
  function createRequest(
    requestId: string,
    gameMode: string,
    region: string | null,
    preferences?: Partial<MatchmakingPreferences>,
  ): MatchmakingRequest {
    const now = new Date();
    return {
      requestId,
      playerId: `player-${requestId}`,
      socketId: `socket-${requestId}`,
      preferences: {
        gameMode,
        maxPlayers: MAX_PLAYERS,
        region,
        ...preferences,
      },
      queuedAt: now,
    };
  }

  function createRequests(
    count: number,
    gameMode: string,
    region: string | null,
  ): MatchmakingRequest[] {
    const requests = [];
    for (let i = 0; i < count; i++) {
      requests.push(createRequest(`req-${i}`, gameMode, region));
    }
    return requests;
  }
});
