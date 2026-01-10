/**
 * Matchmaking preferences sent by client.
 */
export interface MatchmakingPreferences {
  gameMode: string; // e.g., "deathmatch", "coop"
  region?: string;
  maxPlayers?: number;
  skillLevel?: number;
}

/**
 * Represents a matchmaking request.
 */
export interface MatchmakingRequest {
  requestId: string;
  playerId: string;
  socketId: string;
  preferences: MatchmakingPreferences;
  queuedAt: Date;
}

/**
 * Represents a matchmaking result (room assignment).
 */
export interface MatchmakingResult {
  requestId: string;
  roomId: string;
  players: Array<{
    playerId: string;
    socketId: string;
  }>;
  matchedAt: Date;
}