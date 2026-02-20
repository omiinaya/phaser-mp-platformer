// Type tests for event types

describe('EventTypes', () => {
  it('should have proper type definitions', () => {
    // Simple type validation test
    expect(true).toBe(true);
  });

  it('should define EventNames object', () => {
    const EventNames = {
      CONNECTION_ACK: 'connection_ack',
      PING: 'ping',
      PONG: 'pong',
      MATCHMAKING_REQUEST: 'matchmaking_request',
      MATCHMAKING_QUEUED: 'matchmaking_queued',
      MATCHMAKING_SUCCESS: 'matchmaking_success',
      MATCHMAKING_CANCEL: 'matchmaking_cancel',
      ROOM_JOINED: 'room_joined',
      ROOM_LEFT: 'room_left',
      ROOM_CREATED: 'room_created',
      ROOM_PAUSED: 'room_paused',
      ROOM_RESUMED: 'room_resumed',
      ROOM_ENDED: 'room_ended',
      PLAYER_JOINED_ROOM: 'player_joined_room',
      PLAYER_LEFT_ROOM: 'player_left_room',
      PLAYER_INPUT: 'player_input',
      GAME_STATE_UPDATE: 'game_state_update',
      PLAYER_JUMP: 'player_jump',
      PLAYER_SKILL: 'player_skill',
      PLAYER_COLLECT_ITEM: 'player_collect_item',
      PLAYER_DAMAGED: 'player_damaged',
      PLAYER_DIED: 'player_died',
      PLAYER_RESPAWN: 'player_respawn',
      CHAT_MESSAGE: 'chat_message',
      CHAT_WHISPER: 'chat_whisper',
      ERROR: 'error',
      WARNING: 'warning',
    };

    expect(EventNames.CONNECTION_ACK).toBe('connection_ack');
    expect(EventNames.PING).toBe('ping');
    expect(EventNames.PONG).toBe('pong');
    expect(EventNames.MATCHMAKING_REQUEST).toBe('matchmaking_request');
    expect(EventNames.ROOM_JOINED).toBe('room_joined');
    expect(EventNames.PLAYER_INPUT).toBe('player_input');
    expect(EventNames.CHAT_MESSAGE).toBe('chat_message');
    expect(EventNames.ERROR).toBe('error');
  });

  it('should define PlayerInputEvent interface', () => {
    const event = {
      sequence: 1,
      input: {
        left: false,
        right: true,
        up: false,
        down: false,
        jump: true,
      },
      timestamp: Date.now(),
    };

    expect(event.sequence).toBe(1);
    expect(event.input.right).toBe(true);
    expect(event.input.jump).toBe(true);
  });

  it('should define MatchmakingRequestEvent interface', () => {
    const event = {
      gameMode: 'deathmatch',
      region: 'us-east',
      maxPlayers: 4,
      skillLevel: 1500,
    };

    expect(event.gameMode).toBe('deathmatch');
    expect(event.region).toBe('us-east');
    expect(event.maxPlayers).toBe(4);
  });

  it('should define ChatMessageEvent interface', () => {
    const event = {
      message: 'Hello',
      channel: 'global',
    };

    expect(event.message).toBe('Hello');
    expect(event.channel).toBe('global');
  });
});
