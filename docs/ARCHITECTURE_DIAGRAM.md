# Architecture Diagram

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                            CLIENT (Phaser 3)                            │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│  │   Scenes    │  │   Entities  │  │   Systems   │  │   Network   │    │
│  │             │  │             │  │             │  │             │    │
│  │ • BootScene│  │ • Player    │  │ • Physics   │  │ • Socket.IO │    │
│  │ • MenuScene│  │ • Enemy     │  │ • Collision │  │ • Events    │    │
│  │ • GameScene│  │ • Collectible│ │ • Animation │  │ • Sync      │    │
│  │ • UIScene  │  │ • Projectile│  │ • Particles │  │             │    │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘    │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │ WebSocket / HTTP
                                 │ (Real-time & REST)
┌────────────────────────────────▼────────────────────────────────────────┐
│                          SERVER (Node.js)                               │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                      API Layer (Express)                        │    │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │    │
│  │  │   Auth   │  │  Player  │  │Progress. │  │ Matchmak.│       │    │
│  │  │ Endpoint │  │ Endpoint │  │ Endpoint │  │ Endpoint │       │    │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘       │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                    │                                     │
│  ┌────────────────────────────────▼─────────────────────────────────┐    │
│  │                    Services Layer                                │    │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │    │
│  │  │  Auth    │  │Inventory │  │Leaderboard│ │Matchmaker │       │    │
│  │  │ Service  │  │ Service  │  │ Service  │  │ Service  │       │    │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘       │    │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │    │
│  │  │Progress. │  │Progression│ │  Game    │  │ Notif.   │       │    │
│  │  │ Service  │  │ Service  │  │ Manager  │  │ Service  │       │    │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘       │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                    │                                     │
│  ┌────────────────────────────────▼─────────────────────────────────┐    │
│  │                  Persistence Layer (TypeORM)                     │    │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │    │
│  │  │ Player   │  │ Inventory│  │ Progres. │  │ Leader   │       │    │
│  │  │ Repo     │  │ Repo     │  │ Repo     │  │ Repo     │       │    │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘       │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                    │                                     │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  PostgreSQL     │    │      Redis      │    │   Socket.IO     │
│  (Primary DB)   │    │  (Cache/Session)│    │  (WebSocket)    │
│                 │    │                 │    │                 │
│ • Players       │    │ • Sessions      │    │ • Real-time     │
│ • Inventory     │    │ • Game State    │    │ • Events        │
│ • Progress      │    │ • Leaderboard   │    │ • Broadcast     │
│ • Matchmaking   │    │ • Pub/Sub       │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Data Flow

### Authentication Flow

```
┌────────┐         ┌────────┐         ┌────────┐         ┌────────┐
│ Client │         │ Express│         │  Auth  │         │   DB   │
└───┬────┘         └───┬────┘         └───┬────┘         └───┬────┘
    │ POST /login     │                  │                  │
    │────────────────>│                  │                  │
    │                 │ Validate creds  │                  │
    │                 │────────────────>│                  │
    │                 │                  │ Query user      │
    │                 │                  │────────────────>│
    │                 │                  │<────────────────│
    │                 │ Generate JWT     │                  │
    │                 │<─────────────────│                  │
    │ 200 + JWT       │                  │                  │
    │<────────────────│                  │                  │
```

### Game State Synchronization

```
┌────────┐         ┌────────┐         ┌────────┐         ┌────────┐
│ Client │         │SocketIO│         │ Game   │         │  Redis │
└───┬────┘         └───┬────┘         └───┬────┘         └───┬────┘
    │ Emit input       │                  │                  │
    │─────────────────>│                  │                  │
    │                  │ Process input    │                  │
    │                  │─────────────────│                  │
    │                  │ Update state     │                  │
    │                  │─────────────────>│                  │
    │                  │                  │ Cache state       │
    │                  │                  │─────────────────>│
    │ Receive update   │ Broadcast        │                  │
    │<─────────────────│<─────────────────│                  │
```

### Matchmaking Flow

```
┌────────┐         ┌────────┐         ┌────────┐         ┌────────┐
│ Client A│         │ Match  │         │ Lobby  │         │ Socket │
│        │         │ Maker  │         │Manager │         │  Room  │
└───┬────┘         └───┬────┘         └───┬────┘         └───┬────┘
    │ Create lobby    │                  │                  │
    │────────────────>│                  │                  │
    │                 │ Create room      │                  │
    │                 │─────────────────>│                  │
    │                 │                  │ Join room        │
    │                 │                  │─────────────────>│
    │ Lobby created   │                  │                  │
    │<────────────────│                  │                  │
    │                 │                  │ Player B joins   │
    │ Player B joined │                  │<─────────────────│
    │<────────────────│                  │                  │
```

## Module Architecture

### Client Modules

```
client/src/
├── core/                 # Core game systems
│   ├── Game.ts         # Main game entry
│   ├── GameConfig.ts   # Configuration
│   └── constants/      # Game constants
├── scenes/             # Phaser scenes
│   ├── BootScene.ts   # Loading screen
│   ├── MenuScene.ts  # Main menu
│   ├── GameScene.ts  # Main gameplay
│   └── UIScene.ts    # HUD/UI overlay
├── entities/           # Game objects
│   ├── Player.ts      # Player character
│   ├── Enemy.ts       # Enemy types
│   ├── Collectible.ts # Coins, gems
│   └── Projectile.ts  # Bullets, arrows
├── systems/            # Game systems
│   ├── PhysicsSystem.ts
│   ├── CollisionSystem.ts
│   ├── AnimationSystem.ts
│   └── ParticleSystem.ts
└── network/            # Networking
    ├── NetworkService.ts
    ├── SocketManager.ts
    └── events/
```

### Server Modules

```
server/src/
├── index.ts            # Entry point
├── api/               # REST endpoints
│   ├── auth/
│   ├── players/
│   ├── progression/
│   ├── matchmaking/
│   └── leaderboard/
├── services/          # Business logic
│   ├── AuthService.ts
│   ├── PlayerService.ts
│   ├── GameManager.ts
│   └── MatchmakerService.ts
├── network/           # Socket.IO handling
│   ├── SocketManager.ts
│   ├── EventHandler.ts
│   └── rooms/
├── persistence/       # Database
│   ├── models/
│   ├── repositories/
│   └── migrations/
└── workers/           # Background jobs
    ├── MatchmakingWorker.ts
    └── LeaderboardWorker.ts
```

## Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Client Game | Phaser 3 | 2D game engine |
| Client Lang | TypeScript | Type safety |
| Server | Node.js | Runtime |
| Web Server | Express | REST API |
| Real-time | Socket.IO | WebSocket |
| Database | PostgreSQL | Primary storage |
| ORM | TypeORM | Database abstraction |
| Cache | Redis | Sessions, cache |
| Auth | JWT | Token-based auth |
| Logging | Winston | Application logs |
| Testing | Jest | Unit/integration tests |
| Build | Webpack | Client bundling |

## Deployment Architecture

```
                           ┌──────────────────┐
                           │   Load Balancer  │
                           │   (nginx/haproxy)│
                           └────────┬─────────┘
                                    │
            ┌───────────────────────┼───────────────────────┐
            │                       │                       │
            ▼                       ▼                       ▼
    ┌──────────────┐       ┌──────────────┐       ┌──────────────┐
    │   Server 1   │       │   Server 2   │       │   Server N   │
    │  (Primary)  │       │   (Replica)  │       │   (Replica)  │
    └──────┬───────┘       └──────┬───────┘       └──────┬───────┘
           │                       │                       │
           └───────────────────────┼───────────────────────┘
                                   │
           ┌───────────────────────┼───────────────────────┐
           │                       │                       │
           ▼                       ▼                       ▼
    ┌──────────────┐       ┌──────────────┐       ┌──────────────┐
    │ PostgreSQL   │       │   Redis      │       │  Prometheus  │
    │  (Primary)   │       │  (Cluster)   │       │  (Metrics)   │
    └──────────────┘       └──────────────┘       └──────────────┘
```
