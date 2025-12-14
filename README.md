# Master Academy Chess

A chess learning platform that teaches users through micro-lessons, turning each move into an educational experience.

## Architecture

This is a monorepo containing containerized microservices:

- **contracts**: Shared types and JSON schemas
- **frontend-web**: React-based UI
- **game-api**: Orchestration API layer
- **engine-service**: Stockfish chess engine wrapper
- **style-service**: Master-style move suggestion service
- **coach-service**: Bedrock-powered explanations
- **drill-worker**: Puzzle generation and spaced repetition

## Chess Masters

The system uses 4 internationally recognized chess masters who wrote influential books:

1. **Capablanca** - "Chess Fundamentals" - Positional play, endgame mastery
2. **Tal** - "The Life and Games of Mikhail Tal" - Tactical brilliance, attacking play
3. **Karpov** - Strategic positional play - Patient, methodical
4. **Fischer** - "My 60 Memorable Games" - Precise, aggressive, principled

## Quick Start

### Prerequisites

**IMPORTANT**: This application requires **AWS Bedrock** for AI-powered chess moves. The game is not deterministic - Bedrock generates moves dynamically in master styles.

1. **AWS Account** with Bedrock access
2. **AWS Credentials** configured
3. **Bedrock Model Access** (request access to Claude models in AWS Console)

### Setup

```bash
# Install dependencies
npm install

# Build contracts package first
cd packages/contracts && npm run build && cd ../..

# Set AWS credentials (required for AI-powered moves)
export AWS_REGION=us-east-1
export AWS_ACCESS_KEY_ID=your-key
export AWS_SECRET_ACCESS_KEY=your-secret

# Start all services with Docker Compose
docker-compose up

# Or start services individually
cd packages/game-api && npm run dev
```

### Without AWS Credentials

The services will run with **mock responses**, but the chess game will be deterministic and uninspired. **This defeats the purpose** - the game is designed to be AI-powered and dynamic.

See [SETUP.md](./SETUP.md) for detailed instructions.

## Development

Each package is independently containerized and can be developed/tested in isolation. The `contracts` package ensures type safety across services.

## License

MIT

