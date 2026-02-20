/**
 * Socket.IO event names used in the game.
 */
export const EventNames = {
  // Connection
  CONNECTION_ACK: 'connection_ack',
  PING: 'ping',
  PONG: 'pong',

  // Matchmaking
  MATCHMAKING_REQUEST: 'matchmaking_request',
  MATCHMAKING_QUEUED: 'matchmaking_queued',
  MATCHMAKING_SUCCESS: 'matchmaking_success',
  MATCHMAKING_CANCEL: 'matchmaking_cancel',

  // Room
  ROOM_JOINED: 'room_joined',
  ROOM_LEFT: 'room_left',
  ROOM_CREATED: 'room_created',
  ROOM_PAUSED: 'room_paused',
  ROOM_RESUMED: 'room_resumed',
  ROOM_ENDED: 'room_ended',
  PLAYER_JOINED_ROOM: 'player_joined_room',
  PLAYER_LEFT_ROOM: 'player_left_room',

  // Gameplay
  PLAYER_INPUT: 'player_input',
  GAME_STATE_UPDATE: 'game_state_update',
  PLAYER_JUMP: 'player_jump',
  PLAYER_SKILL: 'player_skill',
  PLAYER_COLLECT_ITEM: 'player_collect_item',
  PLAYER_DAMAGED: 'player_damaged',
  PLAYER_DIED: 'player_died',
  PLAYER_RESPAWN: 'player_respawn',

  // Chat
  CHAT_MESSAGE: 'chat_message',
  CHAT_WHISPER: 'chat_whisper',

  // System
  ERROR: 'error',
  WARNING: 'warning',
} as const;

/**
 * Payload for player input event.
 */
export interface PlayerInputEvent {
  sequence: number;
  input: {
    left: boolean;
    right: boolean;
    up: boolean;
    down: boolean;
    jump: boolean;
    skill?: string;
  };
  timestamp: number;
}

/**
 * Payload for game state update.
 */
export interface GameStateUpdateEvent {
  timestamp: number;
  roomId: string;
  entities: Record<string, any>;
  events: any[];
  compressed: boolean;
}

/**
 * Payload for matchmaking request.
 */
export interface MatchmakingRequestEvent {
  gameMode: string;
  region?: string;
  maxPlayers?: number;
  skillLevel?: number;
}

/**
 * Payload for chat message.
 */
export interface ChatMessageEvent {
  message: string;
  channel: 'global' | 'room' | 'whisper';
  targetPlayerId?: string;
}
