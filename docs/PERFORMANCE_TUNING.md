# Performance Tuning Guide

This guide covers performance optimization, benchmarking, and tuning for the Phaser Platformer game.

## Server Performance

### Tick Rate Optimization

The server uses a 20Hz tick rate by default. Adjust in `server/src/network/SocketManager.ts`:

```typescript
// For lower latency (40Hz)
const TICK_RATE = 40;

// For higher performance (10Hz)
const TICK_RATE = 10;
```

### Database Connection Pooling

Configure in `server/src/persistence/index.ts`:

```typescript
const dataSource = new DataSource({
  // ... other options
  maxQueryExecutionTime: 1000, // ms
  poolSize: 20,
  idleTimeout: 30000,
});
```

### Redis Caching

Player sessions and leaderboard data are cached. Monitor cache hit rates:

```typescript
const hitRate = cacheHits / (cacheHits + cacheMisses);
// Target: >90% hit rate
```

### Socket.IO Tuning

```typescript
const io = new Server(httpServer, {
  pingTimeout: 60000,
  pingInterval: 25000,
  perMessageDeflate: true,
  maxHttpBufferSize: 1e8, // 100MB for file transfers
});
```

## Client Performance

### Phaser Renderer

Optimize in `client/src/core/GameConfig.ts`:

```typescript
export const gameConfig: Phaser.Types.Core.GameConfig = {
  render: {
    powerPreference: 'high-performance',
    antialias: true,
    roundPixels: true, // Better performance
  },
  fps: {
    target: 60,
    forceSetTimeOut: false,
  },
};
```

### Object Pooling

Use object pooling for frequently created/destroyed objects:

```typescript
// Instead of new
const bullet = this.bulletPool.get();
// Return when done
this.bulletPool.release(bullet);
```

### Texture Atlas

Combine spritesheets into atlases to reduce draw calls:

```typescript
this.load.atlas('game', 'assets/atlas/game.png', 'assets/atlas/game.json');
```

## Benchmarking

### Server Benchmarks

Run built-in benchmarks:

```bash
cd server && npm run benchmark
```

### Client Benchmarks

Use Phaser profiler:

```typescript
// Enable profiler
this.game.events.on('prerender', () => {
  console.log(this.game.renderer.fps);
});
```

### Network Latency Testing

Test with simulated latency:

```typescript
// Add artificial latency
const latency = 100; // ms
const jitter = 20;   // ms
```

## Monitoring

### Prometheus Metrics

Access metrics at `http://localhost:4000/metrics`:

- `socket_connections_active` - Active player connections
- `game_events_total` - Total game events processed
- `db_query_duration_seconds` - Database query times
- `redis_operation_duration_seconds` - Cache operation times

### Logging Levels

Configure in `server/src/utils/logger.ts`:

```typescript
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  // ...
});
```

## Production Tuning

### Vertical Scaling

```yaml
# docker-compose.yml
services:
  server:
    deploy:
      resources:
        limits:
          cpu: 2
          memory: 2G
```

### Horizontal Scaling

Use Redis adapter for Socket.IO scaling:

```typescript
const io = new Server({
  adapter: require('@socket.io/redis-adapter'),
});
```

### Database Indexing

Key indexes in `server/src/persistence/models/`:

```typescript
@Entity()
@Index(['playerId', 'levelId']) // Compound index for level progress
export class PlayerProgress {}
```

## Performance Targets

| Metric | Target | Critical |
|--------|--------|----------|
| Server FPS | 60 | <30 |
| Client FPS | 60 | <30 |
| Tick Rate | 20Hz | 10Hz |
| DB Query | <50ms | >200ms |
| Redis Ops | <5ms | >20ms |
| Latency (p99) | <100ms | >300ms |

## Troubleshooting

### High CPU

1. Check for infinite loops in game logic
2. Reduce particle counts
3. Optimize collision detection (use spatial hashing)

### Memory Leaks

1. Monitor with `--inspect` flag
2. Check for event listener leaks
3. Verify object pooling cleanup

### Network Bottlenecks

1. Use Wireshark to analyze traffic
2. Implement delta compression for updates
3. Reduce snapshot frequency for static objects
