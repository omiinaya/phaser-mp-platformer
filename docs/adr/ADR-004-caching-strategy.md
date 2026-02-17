# ADR-004: Caching Strategy

## Status

Accepted

## Context

The application needs to handle high traffic efficiently while keeping response times low. We need a caching strategy.

## Decision

We will implement a multi-layer caching strategy:

1. **L1 Cache**: In-memory (node-cache)
2. **L2 Cache**: Redis
3. **CDN**: Static assets

### Cache Tiers

```typescript
interface CacheConfig {
  // L1: In-memory (fast, per-instance)
  local: {
    enabled: true,
    ttl: 60, // 1 minute
    maxSize: 1000 // items
  };
  
  // L2: Redis (distributed, persistent)
  redis: {
    enabled: true,
    ttl: 300, // 5 minutes
  };
}
```

## Implementation

### Local Cache

```typescript
import NodeCache from 'node-cache';

const localCache = new NodeCache({ stdTTL: 60 });

function getCachedLocal<T>(key: string): T | undefined {
  return localCache.get<T>(key);
}

function setCachedLocal<T>(key: string, value: T, ttl: number = 60): void {
  localCache.set(key, value, ttl);
}
```

### Redis Cache

```typescript
import redis from './redis';

async function getCached<T>(key: string): Promise<T | null> {
  const cached = await redis.get(key);
  return cached ? JSON.parse(cached) : null;
}

async function setCached<T>(key: string, value: T, ttl: number = 300): Promise<void> {
  await redis.setex(key, ttl, JSON.stringify(value));
}
```

### Cache-Aside Pattern

```typescript
async function getPlayerData(playerId: string) {
  const cacheKey = `player:${playerId}`;
  
  // 1. Check local cache
  let data = getCachedLocal(cacheKey);
  if (data) return data;
  
  // 2. Check Redis
  data = await getCached(cacheKey);
  if (data) {
    setCachedLocal(cacheKey, data);
    return data;
  }
  
  // 3. Fetch from database
  data = await database.players.find(playerId);
  
  // 4. Store in caches
  setCachedLocal(cacheKey, data);
  setCached(cacheKey, data);
  
  return data;
}
```

## Cache Invalidation

### On Update

```typescript
async function updatePlayer(playerId: string, updates: Partial<Player>) {
  await database.players.update(playerId, updates);
  
  // Invalidate caches
  const cacheKey = `player:${playerId}`;
  localCache.del(cacheKey);
  await redis.del(cacheKey);
}
```

### Time-Based Expiration

| Data Type | TTL | Reason |
|-----------|-----|--------|
| Player data | 5 min | Updates frequently |
| Leaderboard | 1 min | Changes on each game |
| Game config | 1 hour | Rarely changes |
| Static assets | 24 hours | Never changes |

## Monitoring

Track cache metrics:

```typescript
metrics.increment('cache.hit.local');
metrics.increment('cache.miss.local');
metrics.increment('cache.hit.redis');
metrics.increment('cache.miss.redis');
```

Target hit rates:
- Local cache: > 70%
- Redis cache: > 90%

---

*Date: 2026-02-17*
