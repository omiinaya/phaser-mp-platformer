# Rate Limiting

This document describes the rate limiting strategy for the Phaser Platformer API.

## Overview

Rate limiting protects the API from abuse and ensures fair usage across all clients.

## Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| `/api/auth/*` | 10 requests | 1 minute |
| `/api/players/*` | 60 requests | 1 minute |
| `/api/game/*` | 120 requests | 1 minute |
| WebSocket connection | 5 connections | 1 minute |

## Implementation

### Server-side (Express)

```typescript
import rateLimit from 'express-rate-limit';

const authLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests
  message: { error: 'Too many auth attempts, please try again later' }
});

app.use('/api/auth', authLimiter);
```

### WebSocket Rate Limiting

```typescript
io.use((socket, next) => {
  const ip = socket.handshake.address;
  const requests = getRateLimitCount(ip);
  
  if (requests > 5) {
    return next(new Error('Too many connections'));
  }
  next();
});
```

## Response Headers

When rate limited, the response includes:

```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1708200000
Retry-After: 60
```

## Client Handling

```typescript
async function apiCall(url: string, options: RequestInit) {
  const response = await fetch(url, options);
  
  if (response.status === 429) {
    const retryAfter = response.headers.get('Retry-After');
    const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : 60000;
    
    console.log(`Rate limited. Waiting ${waitTime}ms`);
    await sleep(waitTime);
    
    // Retry the request
    return apiCall(url, options);
  }
  
  return response;
}
```

## Configuration

Rate limits can be configured via environment variables:

```bash
RATE_LIMIT_AUTH=10
RATE_LIMIT_PLAYERS=60
RATE_LIMIT_GAME=120
RATE_LIMIT_WINDOW=60000
```

## Monitoring

Track rate limiting metrics:

- `rate_limit_exceeded_total`
- `rate_limit_by_endpoint`
- `rate_limit_by_ip`

---

*Last updated: 2026-02-17*
