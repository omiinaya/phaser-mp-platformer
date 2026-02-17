# Contributing Guide - Enhanced

Thank you for your interest in contributing to Phaser Platformer!

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Making Changes](#making-changes)
- [Pull Request Process](#pull-request-process)
- [Commit Message Format](#commit-message-format)
- [Testing Guidelines](#testing-guidelines)
- [Documentation Standards](#documentation-standards)
- [Issue Reporting](#issue-reporting)
- [Recognition](#recognition)

## Code of Conduct

Please read and follow our [Code of Conduct](CODE_OF_CONDUCT.md). We are committed to providing a welcoming and inclusive environment.

## Getting Started

### Fork and Clone

```bash
# Fork via GitHub UI, then clone your fork
git clone https://github.com/YOUR_USERNAME/phaser-platformer.git
cd phaser-platformer

# Add upstream remote
git remote add upstream https://github.com/ORIGINAL_OWNER/phaser-platformer.git
```

### Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- PostgreSQL (for integration tests)
- Redis (for caching)

## Development Setup

### Quick Start

```bash
# Install all dependencies
npm run install:all

# Start development servers
npm run dev
```

This starts:
- Client: http://localhost:3000
- Server: http://localhost:4000

### Using the Setup Script

```bash
# Full setup with database
./scripts/setup.sh

# Skip optional components
./scripts/setup.sh --skip-db --skip-redis
```

### Environment Variables

Create `.env` files in `client/` and `server/`:

```bash
# server/.env
NODE_ENV=development
PORT=4000
DATABASE_URL=postgresql://user:pass@localhost:5432/phaser_platformer
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret-key

# client/.env
NODE_ENV=development
SERVER_URL=http://localhost:4000
```

## Making Changes

### Branch Strategy

```bash
# Keep your main branch in sync
git fetch upstream
git checkout main
git merge upstream/main

# Create a feature branch
git checkout -b feature/your-feature-name
# or
git checkout -b fix/bug-description
```

### Code Style

We use:
- **ESLint** for TypeScript linting
- **Prettier** for code formatting

```bash
# Check linting
npm run lint

# Auto-fix formatting
npm run format
```

#### TypeScript Guidelines

- Use strict mode always
- Prefer interfaces over types for object shapes
- Use `const` over `let` when possible
- Add JSDoc comments for public APIs
- Export types that are used externally

```typescript
// Good
interface PlayerConfig {
  speed: number;
  jumpForce: number;
}

export class Player {
  /** Current player position */
  public x: number = 0;
  
  /**
   * Move the player in the specified direction
   * @param direction -1 for left, 1 for right
   */
  public move(direction: -1 | 1): void {
    // ...
  }
}
```

### File Organization

```
client/src/
├── scenes/       # Phaser scene classes
├── entities/    # Game entities (Player, Enemy, etc.)
├── systems/      # Game systems (physics, collision)
├── network/     # Networking code
└── utils/       # Helper functions

server/src/
├── api/         # REST API endpoints
├── services/    # Business logic
├── network/     # Socket.IO handlers
├── persistence/ # Database models/repos
└── workers/    # Background jobs
```

## Pull Request Process

### Before Submitting

1. **Run tests**
   ```bash
   npm test
   ```

2. **Run linting**
   ```bash
   npm run lint
   ```

3. **Check formatting**
   ```bash
   npm run format
   ```

4. **Update documentation** if needed

5. **Rebase on main**
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

### PR Description Template

```markdown
## Description
Brief description of the changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests pass
- [ ] Manual testing completed

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] Tests added for new functionality
```

### PR Review Process

1. All PRs require review
2. Address feedback promptly
3. Request re-review after changes

## Commit Message Format

Use [Conventional Commits](https://conventionalcommits.org):

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style (formatting)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Test changes
- `build`: Build system changes
- `ci`: CI/CD changes
- `chore`: Maintenance

### Examples

```bash
# Feature
git commit -m "feat(player): add double jump ability"

# Bug fix
git commit -m "fix(network): resolve reconnection issue"

# Documentation
git commit -m "docs(api): add usage examples for leaderboard"

# Breaking change
git commit -m "feat(auth)!: migrate to JWT v2
BREAKING CHANGE: auth endpoint now returns different payload"
```

## Testing Guidelines

### Unit Tests

```typescript
describe('Player', () => {
  it('should move in the correct direction', () => {
    const player = new Player();
    player.move(1);
    expect(player.x).toBeGreaterThan(0);
  });
});
```

### Integration Tests

```typescript
describe('Player API', () => {
  it('should create a new player', async () => {
    const response = await request(app)
      .post('/api/players')
      .send({ username: 'test' });
    
    expect(response.status).toBe(201);
  });
});
```

### Running Tests

```bash
# All tests
npm test

# Client only
npm run test:client

# Server only
npm run test:server

# With coverage
npm run test:coverage
```

### Test Coverage

- Target: >80% coverage
- Critical paths: 100%
- Run coverage before submitting PR

## Documentation Standards

### Code Documentation

Use JSDoc for all public APIs:

```typescript
/**
 * Calculate the player's score based on performance metrics
 * @param time - Time taken to complete level (seconds)
 * @param enemiesDefeated - Number of enemies killed
 * @param gemsCollected - Number of gems collected
 * @returns Calculated score
 */
function calculateScore(
  time: number, 
  enemiesDefeated: number, 
  gemsCollected: number
): number {
  // ...
}
```

### README Updates

If your change affects:
- How to run the project → Update README
- New dependencies → Update prerequisites
- New features → Update feature list
- API changes → Update API docs

## Issue Reporting

### Bug Reports

Use the [bug report template](.github/ISSUE_TEMPLATE/bug_report.md):

```markdown
**Describe the bug**
Clear description of the bug

**To Reproduce**
Steps to reproduce the behavior

**Expected behavior**
What you expected to happen

**Screenshots**
If applicable

**Environment**
- OS: [e.g., Windows]
- Browser: [e.g., Chrome]
```

### Feature Requests

Use the [feature request template](.github/ISSUE_TEMPLATE/feature_request.md):

```markdown
**Is your feature request related to a problem?**
Description of the problem

**Suggested solution**
Your proposed solution

**Alternative solutions**
Other solutions you've considered

**Additional context**
Screenshots, mockups, etc.
```

## Recognition

Contributors are recognized in:
- CONTRIBUTORS.md file
- Release notes
- GitHub profile badges

## Getting Help

- Open an [issue](https://github.com/phaser-platformer/issues)
- Join our [Discord](link-to-discord)
- Check [documentation](docs/)

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
