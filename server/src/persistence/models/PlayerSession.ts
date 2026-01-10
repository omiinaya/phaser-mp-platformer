/**
 * Represents a player's session (socket connection).
 */
export interface PlayerSession {
  socketId: string;
  playerId: string;
  connectedAt: Date;
  lastActivity: Date;
  roomId: string | null;
}