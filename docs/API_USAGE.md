# API Usage Guide

Complete reference for the Phaser Platformer REST API and WebSocket events.

## REST API

### Base URL

```
Production: https://api.example.com
Development: http://localhost:4000
```

### Authentication

All endpoints (except public ones) require JWT authentication:

```bash
# Login
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "player1", "password": "secret"}'

# Response
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": { "id": "1", "username": "player1" }
}
```

Include token in requests:

```bash
curl http://localhost:4000/api/players/me \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

### Player Endpoints

#### Get Current Player

```bash
GET /api/players/me
```

Response:
```json
{
  "id": "uuid",
  "username": "player1",
  "level": 5,
  "experience": 1250,
  "unlockables": ["skin_forest", "skin_cave"],
  "createdAt": "2024-01-15T10:30:00Z"
}
```

#### Update Player Profile

```bash
PUT /api/players/me
Content-Type: application/json

{
  "username": "new_username",
  "settings": {
    "volume": 0.8,
    "musicVolume": 0.6,
    "sfxVolume": 0.9
  }
}
```

#### Get Player Inventory

```bash
GET /api/players/me/inventory
```

Response:
```json
{
  "items": [
    { "id": "item_1", "type": "skin", "name": "Forest Skin", "acquiredAt": "2024-01-15" },
    { "id": "item_2", "type": "powerup", "name": "Double Jump", "quantity": 3 }
  ],
  "currency": { "gems": 150, "coins": 5000 }
}
```

### Progression Endpoints

#### Get Level Progress

```bash
GET /api/progression/levels
```

Response:
```json
{
  "levels": [
    {
      "id": "forest_1",
      "name": "Forest Awakening",
      "completed": true,
      "bestTime": 125.5,
      "bestScore": 5000,
      "stars": 3
    }
  ]
}
```

#### Submit Level Score

```bash
POST /api/progression/levels/:levelId/complete
Content-Type: application/json

{
  "time": 125.5,
  "score": 5000,
  "gems": 25,
  "enemiesDefeated": 12,
  "deaths": 0
}
```

### Leaderboard Endpoints

#### Get Global Rankings

```bash
GET /api/leaderboard?limit=100&offset=0
```

Response:
```json
{
  "entries": [
    { "rank": 1, "username": "ProGamer", "score": 50000, "level": 10 },
    { "rank": 2, "username": "Player2", "score": 45000, "level": 9 }
  ],
  "total": 1250
}
```

#### Get Friend Rankings

```bash
GET /api/leaderboard/friends
```

### Matchmaking Endpoints

#### Create Lobby

```bash
POST /api/matchmaking/lobby
Content-Type: application/json

{
  "name": "My Game",
  "maxPlayers": 4,
  "isPrivate": false,
  "settings": { "difficulty": "hard" }
}
```

Response:
```json
{
  "lobbyId": "lobby_abc123",
  "code": "ABC123",
  "hostId": "player_1"
}
```

#### Join Lobby

```bash
POST /api/matchmaking/lobby/:code/join
```

### Unlockables Endpoints

#### Get Available Unlockables

```bash
GET /api/unlockables
```

Response:
```json
{
  "unlockables": [
    {
      "id": "skin_forest",
      "type": "skin",
      "name": "Forest Skin",
      "description": "A nature-themed character skin",
      "price": 500,
      "rarity": "common",
      "imageUrl": "/assets/unlockables/forest_skin.png"
    }
  ]
}
```

#### Unlock Item

```bash
POST /api/unlockables/:itemId/unlock
```

## WebSocket Events

### Connection

```typescript
import { io } from 'socket.io-client';

const socket = io('http://localhost:4000', {
  auth: { token: 'JWT_TOKEN' }
});
```

### Client Events (→ Server)

#### `game:join`

```typescript
socket.emit('game:join', { lobbyCode: 'ABC123' });
```

#### `game:input`

```typescript
socket.emit('game:input', {
  type: 'movement',
  data: { x: 1, y: 0 },
  timestamp: Date.now()
});
```

#### `game:action`

```typescript
socket.emit('game:action', {
  type: 'jump',
  timestamp: Date.now()
});
```

### Server Events (→ Client)

#### `game:start`

```typescript
socket.on('game:start', (data) => {
  console.log('Game starting:', data.level);
});
```

#### `game:player-joined`

```typescript
socket.on('game:player-joined', (player) => {
  console.log(`${player.username} joined the game`);
});
```

#### `game:player-left`

```typescript
socket.on('game:player-left', (playerId) => {
  console.log(`Player ${playerId} left`);
});
```

#### `game:state-update`

```typescript
socket.on('game:state-update', (state) => {
  // Full game state
  // { players: [...], entities: [...], score: {...} }
});
```

#### `game:player-update`

```typescript
socket.on('game:player-update', (update) => {
  // Delta update for a specific player
  // { playerId: '...', x: 100, y: 200, vx: 5, vy: 0 }
});
```

#### `game:entity-spawn`

```typescript
socket.on('game:entity-spawn', (entity) => {
  // { id: 'enemy_1', type: 'slime', x: 300, y: 100 }
});
```

#### `game:entity-destroy`

```typescript
socket.on('game:entity-destroy', (entityId) => {
  // Entity removed from game
});
```

#### `game:score-update`

```typescript
socket.on('game:score-update', (score) => {
  // { playerId: '...', points: 100, total: 5000 }
});
```

#### `game:level-complete`

```typescript
socket.on('game:level-complete', (results) => {
  // { rank: 1, score: 5000, time: 125.5, stars: 3 }
});
```

### Matchmaking Events

#### `matchmaking:found`

```typescript
socket.on('matchmaking:found', (lobby) => {
  console.log('Matched with lobby:', lobby.code);
});
```

#### `lobby:update`

```typescript
socket.on('lobby:update', (lobby) => {
  // { players: [...], settings: {...} }
});
```

### Error Events

```typescript
socket.on('error', (error) => {
  console.error('Socket error:', error.message);
});

socket.on('connect_error', (error) => {
  console.error('Connection failed:', error.message);
});
```

## Rate Limits

| Endpoint | Limit |
|----------|-------|
| Auth | 10/min |
| API (general) | 100/min |
| Game inputs | 60/sec |

## Error Responses

```json
{
  "error": "ERROR_CODE",
  "message": "Human readable message",
  "details": {}
}
```

Common error codes:
- `AUTH_REQUIRED` - Missing authentication
- `AUTH_INVALID` - Invalid token
- `NOT_FOUND` - Resource not found
- `RATE_LIMITED` - Too many requests
- `SERVER_ERROR` - Internal error
