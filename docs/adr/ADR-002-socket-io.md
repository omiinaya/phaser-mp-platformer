# ADR-002: Socket.IO for Real-time Multiplayer

## Status
Accepted

## Context
The game requires real-time multiplayer functionality with low latency communication between clients and server.

## Decision
We will use Socket.IO for real-time bidirectional communication.

## Consequences

### Positive
- Automatic reconnection handling
- Fallback to long-polling if WebSocket unavailable
- Room-based communication for lobby system
- Event-based message passing
- Built-in heartbeat/ping-pong for connection health

### Negative
- Additional server resource for socket connections
- Requires separate handling from REST API
- State synchronization complexity

## Alternatives Considered

### WebRTC
- Lower latency for peer-to-peer
- More complex to implement
- No server-side connection management

### Raw WebSockets
- Lower overhead
- More implementation work
- No built-in reconnection handling

## References
- [Socket.IO Documentation](https://socket.io/docs/)
- [Phaser Socket.IO Example](https://phaser.io/examples)
