# ADR-001: Use TypeScript for Type Safety

## Status
Accepted

## Context
We need to choose a language for the Phaser Platformer project that provides type safety and developer productivity.

## Decision
We will use TypeScript for all client, server, and shared code.

## Consequences

### Positive
- Type checking catches errors at compile time
- Better IDE support with autocomplete
- Self-documenting code through types
- Easier refactoring

### Negative
- Build step required
- Learning curve for JavaScript developers
- Configuration required

## Alternatives Considered

### JavaScript
- Faster initial development
- No build step
- Less type safety, more runtime errors

### Pure JavaScript with JSDoc
- More verbose
- Less tooling support
- Type checking not as robust

## References
- [TypeScript Official Site](https://www.typescriptlang.org/)
- [Phaser TypeScript Guide](https://phaser.io/tutorials/typescript)
