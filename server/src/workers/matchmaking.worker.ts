import { parentPort } from 'worker_threads';
import { MatchmakingRequest } from '../types/matchmaking';

export interface MatchmakingResult {
  matchedRequests: MatchmakingRequest[];
  roomId?: string;
}

/**
 * Group requests by gameMode and region.
 */
function groupByGameMode(requests: MatchmakingRequest[]): Map<string, MatchmakingRequest[]> {
  const map = new Map<string, MatchmakingRequest[]>();
  for (const req of requests) {
    const key = `${req.preferences.gameMode}_${req.preferences.region || 'any'}`;
    if (!map.has(key)) {
      map.set(key, []);
    }
    map.get(key)!.push(req);
  }
  return map;
}

/**
 * Process the queue and return matches.
 */
function processQueue(queue: MatchmakingRequest[]): MatchmakingResult[] {
  if (queue.length === 0) return [];

  const groups = groupByGameMode(queue);
  const results: MatchmakingResult[] = [];

  for (const [, requests] of groups) {
    const maxPlayers = 4; // default
    if (requests.length >= maxPlayers) {
      // Create a match with the first maxPlayers
      const matchedRequests = requests.slice(0, maxPlayers);
      results.push({ matchedRequests });
      // Note: remaining requests stay in queue for next tick
    }
  }

  return results;
}

// If this script is run as a worker, listen for messages
if (parentPort) {
  parentPort.on('message', (data: MatchmakingRequest[]) => {
    try {
      const matches = processQueue(data);
      parentPort!.postMessage({ matches });
    } catch (error) {
      parentPort!.postMessage({ error: (error as Error).message });
    }
  });
}

// Export for testing
export { processQueue };