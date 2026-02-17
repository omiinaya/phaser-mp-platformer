# ADR-003: API Versioning Strategy

## Status

Accepted

## Context

The API needs to evolve without breaking existing clients. We need a strategy for handling API versions.

## Decision

We will use URL-based versioning with the following approach:

```
/api/v1/{resource}
/api/v2/{resource}
```

### Rationale

1. **URL-based is explicit** - Version is visible in every request
2. **Easy to test** - Can test different versions by changing URL
3. **Cache-friendly** - Different versions are separate cache entries
4. **Simple to implement** - No custom headers needed

## Implementation

### Server-side

```typescript
// routes/v1/players.ts
router.get('/players', (req, res) => {
  // v1 implementation
});

// routes/v2/players.ts
router.get('/v2/players', (req, res) => {
  // v2 implementation with enhanced response
});
```

### Client-side

```typescript
const API_BASE = '/api/v1';

async function fetchPlayers() {
  const response = await fetch(`${API_BASE}/players`);
  return response.json();
}
```

## Deprecation Policy

1. Announce deprecation in release notes
2. Support old version for 6 months minimum
3. Return deprecation header in responses:
   ```
   Deprecation: true
   Sunset: Sat, 01 Jan 2027 00:00:00 GMT
   ```
4. Remove after deprecation period

## Consequences

### Positive

- Clear versioning in URLs
- Easy to understand
- Good for documentation

### Negative

- URL pollution
- Code duplication between versions
- Need to maintain multiple versions

---

*Date: 2026-02-17*
