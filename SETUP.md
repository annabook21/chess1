# Setup Guide

## Prerequisites

- Node.js 20+
- Docker and Docker Compose
- npm or yarn

## Installation

1. **Install dependencies:**
```bash
npm install
```

2. **Build contracts package first:**
```bash
cd packages/contracts
npm run build
cd ../..
```

3. **Build all packages:**
```bash
npm run build
```

## Running Locally

### Option 1: Docker Compose (Recommended)

Start all services:
```bash
docker-compose up
```

Services will be available at:
- Game API: http://localhost:3000
- Engine Service: http://localhost:3001
- Style Service: http://localhost:3002
- Coach Service: http://localhost:3003

### Option 2: Individual Services

Start each service in separate terminals:

```bash
# Terminal 1: Engine Service
cd packages/engine-service
npm run dev

# Terminal 2: Style Service
cd packages/style-service
npm run dev

# Terminal 3: Coach Service
cd packages/coach-service
npm run dev

# Terminal 4: Game API
cd packages/game-api
npm run dev

# Terminal 5: Frontend
cd packages/frontend-web
npm run dev
```

## Environment Variables

**CRITICAL**: This application requires **AWS Bedrock** for AI-powered chess moves. Without it, the game is deterministic and defeats the purpose.

Create a `.env` file or set environment variables:

```env
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
BEDROCK_MODEL_ID=anthropic.claude-v3-sonnet-20240229-v1:0
```

### AWS Bedrock Setup

1. **Request Model Access** in AWS Console:
   - Go to Amazon Bedrock → Model access
   - Request access to Claude 3 Sonnet (or other Claude models)

2. **Configure IAM Permissions**:
   - Your AWS credentials need `bedrock:InvokeModel` permission

3. **Verify Access**:
   - Check that Bedrock is available in your region
   - Default is `us-east-1`

### Without AWS Credentials

Services will run with **mock responses**, but:
- ❌ Chess moves will be random/deterministic (not AI-powered)
- ❌ Master styles won't work (just random moves)
- ❌ Gameplay will be uninspired and repetitive

**This defeats the purpose** - the game is designed to be AI-powered and dynamic.

## Notes

### Stockfish Engine

The engine service uses the `stockfish` npm package. For production, you may want to:
- Use a native Stockfish binary
- Use a more robust wrapper like `stockfish.js`
- Consider using a dedicated engine service

### Chess.js Move Format

The codebase uses UCI format (e.g., "e2e4") for moves. The `chess.js` library uses SAN format internally, so conversion happens in the game store.

## Testing

```bash
# Test all packages
npm test

# Test individual package
cd packages/game-api
npm test
```

## Troubleshooting

1. **Port conflicts**: Change ports in `docker-compose.yml` or service configs
2. **Build errors**: Ensure contracts package is built first
3. **Engine not working**: Check that Stockfish is properly installed/available

