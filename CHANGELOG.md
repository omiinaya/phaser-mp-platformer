# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- CODE_STANDARDS.md with comprehensive coding guidelines
- TESTING_STRATEGY.md covering unit, integration, and E2E testing
- DEPLOYMENT_GUIDE.md for production deployment
- Architecture Decision Records (ADRs) for key technical decisions
- .npmrc with audit-level=high for security scanning
- Additional API documentation

### Changed

- Pinned ESLint to 8.57.0 for consistency
- Updated CI to use --audit-level=high

### Documentation

- Comprehensive code standards guide covering TypeScript, code style, component structure
- Testing strategy document with test types, organization, and best practices
- Production deployment guide with Docker, health checks, monitoring
- Architecture Decision Records documenting technical choices

## [1.0.0-alpha] - 2024-XX-XX

### Added

- Multiplayer platformer game with Phaser 3, Node.js, Socket.IO, and TypeScript
- Three themed maps (Forest, Cave, Sky)
- Four enemy types (Slime, Flying, Archer, Boss)
- Five environmental hazards (Spikes, Lava, Saw Blades, Fire, Acid)
- Five power-ups (Double Jump, Shield, Speed Boost, Health Boost, Damage Boost)
- Five gem types (Red, Blue, Green, Purple, Yellow)
- Complete animation system with player and enemy sprites
- Audio system with SFX and music with volume controls
- Particle effects for all game actions
- Level selection menu
- Real-time multiplayer synchronization with 20Hz server tick rate
- Lobby system with room codes
- Cooperative gameplay for 2-4 players
- Player interpolation for smooth movement
- Connection events and toast notifications
- Input sequence-based client prediction

### Security

- Added SECURITY.md with vulnerability reporting guidelines
- Dependency vulnerability scanning in CI (npm audit)
- JWT-based authentication for API routes
- HTTP rate limiting middleware
- Input validation using schema validation
- Parameterized queries via TypeORM for SQL injection prevention

### Documentation

- Comprehensive README.md with quick start guide
- API documentation generated with TypeDoc
- Developer guides for extending the game
- Player guides for gameplay instructions
- CONTRIBUTING.md and CODE_OF_CONDUCT.md
- GitHub issue templates for bug reports and feature requests
- Dependabot configuration for automated dependency updates
