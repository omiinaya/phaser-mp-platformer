# API Reference

## Server REST API

### Player Endpoints

#### Get Player Profile
```
GET /api/players/:id
```

**Response:**
```json
{
  "id": "string",
  "username": "string",
  "level": "number",
  "experience": "number"
}
```

#### Create Player
```
POST /api/players
```

**Body:**
```json
{
  "username": "string",
  "password": "string"
}
```

#### Update Player
```
PUT /api/players/:id
```

**Body:**
```json
{
  "username": "string",
  "level": "number"
}
```

### Inventory Endpoints

#### Get Player Inventory
```
GET /api/inventory/:playerId
```

**Response:**
```json
{
  "playerId": "string",
  "items": [
    {
      "id": "string",
      "name": "string",
      "quantity": "number"
    }
  ]
}
```

#### Add Item to Inventory
```
POST /api/inventory/:playerId/items
```

**Body:**
```json
{
  "itemId": "string",
  "quantity": "number"
}
```

#### Remove Item from Inventory
```
DELETE /api/inventory/:playerId/items/:itemId
```

### Progression Endpoints

#### Get Player Progress
```
GET /api/progression/:playerId
```

**Response:**
```json
{
  "playerId": "string",
  "currentLevel": "number",
  "unlockedLevels": ["string"],
  "completedAchievements": ["string"]
}
```

#### Unlock Level
```
POST /api/progression/:playerId/levels
```

**Body:**
```json
{
  "levelId": "string"
}
```

### Leaderboard Endpoints

#### Get Top Players
```
GET /api/leaderboard?limit=10&sortBy=score
```

**Query Parameters:**
- `limit`: Number of results (default: 10)
- `sortBy`: Field to sort by (score, wins, level)

**Response:**
```json
[
  {
    "rank": 1,
    "playerId": "string",
    "username": "string",
    "score": 1000
  }
]
```

#### Submit Score
```
POST /api/leaderboard/scores
```

**Body:**
```json
{
  "playerId": "string",
  "score": 1000
}
```

---

## WebSocket Events

### Client → Server

#### Join Game
```typescript
socket.emit('game:join', { roomId: string })
```

#### Player Action
```typescript
socket.emit('game:action', {
  type: 'move' | 'jump' | 'attack',
  data: { x: number, y: number }
})
```

#### Use Power-up
```typescript
socket.emit('game:powerup', { powerupId: string })
```

### Server → Client

#### Game State Update
```typescript
socket.on('game:state', (state: GameState) => {
  // Handle game state
})
```

#### Player Joined
```typescript
socket.on('game:player-joined', (player: Player) => {
  // Handle new player
})
```

#### Player Left
```typescript
socket.on('game:player-left', (playerId: string) => {
  // Handle player disconnect
})
```

#### Score Update
```typescript
socket.on('game:score', (data: { playerId: string, score: number }) => {
  // Handle score update
})
```

---

## Error Responses

All endpoints return standard HTTP status codes:

- `200 OK` - Success
- `201 Created` - Resource created
- `400 Bad Request` - Invalid input
- `401 Unauthorized` - Authentication required
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `500 Internal Server Error` - Server error

**Error Response Format:**
```json
{
  "error": "string",
  "message": "string",
  "code": "string"
}
```

---

## Rate Limiting

API endpoints are rate limited:
- **Authenticated:** 100 requests/minute
- **Unauthenticated:** 20 requests/minute

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1609459200
```
