# Developer Guide

This guide explains how to extend the Phaser Platformer game, add new features, and integrate with the server.

## Architecture Overview

The game follows a client‑server architecture:

- **Client**: Phaser 3 game engine with TypeScript, organized into scenes, entities, and core systems.
- **Server**: Node.js with Express and Socket.IO for real‑time multiplayer, plus TypeORM for persistence.
- **Shared**: Common TypeScript interfaces and constants used by both client and server.

## Adding New Game Entities

1. Create a new entity class in `client/src/entities/` extending `GameObject` or `Character`.
2. Register the entity in `EntityFactory` for easy instantiation.
3. Add any required assets to `client/public/assets/` and update `AssetManager` configurations.

Example:

```typescript
// client/src/entities/MyEntity.ts
import { GameObject } from './GameObject';

export class MyEntity extends GameObject {
  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'myEntitySprite');
    // custom logic
  }
}
```

## Creating New Scenes

1. Add a scene class in `client/src/scenes/`.
2. Register the scene in `SceneManager` and update the boot sequence in `BootScene`.

## Server‑Side Services

To add a new service (e.g., `ChatService`):

1. Create the service in `server/src/services/`.
2. Inject dependencies (repositories, cache) via constructor.
3. Export the service and add it to the appropriate module (e.g., `server/src/index.ts`).

## Database Models

New persistence models should be defined in `server/src/persistence/models/` using TypeORM decorators. Ensure you create a corresponding repository in `server/src/persistence/repositories/`.

## Socket.IO Events

Event definitions are in `shared/types/matchmaking.ts` and `server/src/network/events/eventTypes.ts`. To add a new event:

1. Add the event type to `shared/types/matchmaking.ts`.
2. Implement the handler in `server/src/network/events/EventHandler.ts`.
3. Emit the event from the client using `NetworkService`.

## Testing Your Changes

- Write unit tests for new classes in the appropriate `tests/` directory.
- Update integration tests if you modify API endpoints.
- Run `npm test` in the relevant workspace to verify.

## Deployment

See `infrastructure/` for Docker, Kubernetes, and Terraform configurations. The project can be deployed as a containerized application.

## Contributing

Follow the existing code style (TypeScript strict, ESLint). Ensure all tests pass before submitting a pull request.