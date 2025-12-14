# Architecture Overview

## System Design

Master Academy Chess is built as a microservices architecture with strict separation of concerns.

## Services

### 1. Contracts Package (`packages/contracts`)
- **Purpose**: Shared TypeScript types and JSON schemas
- **Key Files**:
  - `types.ts`: All shared interfaces
  - `turn-package.schema.json`: JSON schema for API contracts
- **Dependencies**: None (pure types)

### 2. Engine Service (`packages/engine-service`)
- **Purpose**: Chess engine wrapper (Stockfish)
- **Endpoints**:
  - `POST /engine/analyze` - Analyze position
  - `GET /engine/is-legal` - Validate move
  - `POST /engine/score-moves` - Score multiple moves
  - `POST /engine/set-strength` - Set engine ELO
- **Port**: 3001
- **Note**: Currently uses `stockfish` npm package. For production, consider:
  - Native Stockfish binary
  - `stockfish.js` wrapper
  - Dedicated engine service

### 3. Style Service (`packages/style-service`)
- **Purpose**: Generate moves in master styles using **Amazon Bedrock**
- **Endpoints**:
  - `POST /style/suggest` - Get AI-powered style-based move suggestions
- **Port**: 3002
- **Technology**: **Bedrock (Claude 3 Sonnet)** - NOT deterministic rules
- **Masters** (each with detailed Bedrock prompts):
  - **Capablanca**: Positional, endgame-focused ("Chess Fundamentals")
  - **Tal**: Tactical, attacking ("The Life and Games of Mikhail Tal")
  - **Karpov**: Strategic, methodical
  - **Fischer**: Precise, principled ("My 60 Memorable Games")
- **Key**: Bedrock generates creative, varied moves. Engine only validates legality.

### 4. Coach Service (`packages/coach-service`)
- **Purpose**: Generate explanations via Bedrock
- **Endpoints**:
  - `POST /coach/explain` - Generate move explanation
- **Port**: 3003
- **Integration**: AWS Bedrock (Claude) with mock fallback

### 5. Game API (`packages/game-api`)
- **Purpose**: Orchestration layer
- **Endpoints**:
  - `POST /game` - Create game
  - `GET /game/:gameId/turn` - Get turn package
  - `POST /game/:gameId/move` - Submit move
- **Port**: 3000
- **Components**:
  - `choice-builder.ts`: Builds 3 move choices
  - `difficulty.ts`: Calculates difficulty parameters
  - `turn-controller.ts`: Orchestrates turn package creation
  - `move-controller.ts`: Handles move submission
  - `game-store.ts`: In-memory game state (replace with DB)

### 6. Frontend (`packages/frontend-web`)
- **Purpose**: React-based UI
- **Tech**: React + Vite + TypeScript
- **Port**: 5173
- **Components**:
  - `ChessBoard`: Chessboard display
  - `MoveChoices`: 3 choice buttons
  - `Feedback`: Move feedback display

### 7. Drill Worker (`packages/drill-worker`)
- **Purpose**: Puzzle generation and spaced repetition
- **Status**: Placeholder (MVP)
- **Future**: SQS queue consumer, puzzle generator

## Data Flow

### Turn Request Flow
1. Frontend → Game API: `GET /game/:id/turn`
2. Game API → Engine Service: Analyze position (for evaluation)
3. Game API → Style Service: **Bedrock generates moves** in 4 master styles (AI-powered, dynamic)
4. Game API → Engine Service: Validate legality of Bedrock moves
5. Game API → Engine Service: Score validated moves
6. Game API → Choice Builder: Select 3 diverse choices from Bedrock suggestions
7. Game API → Frontend: Return turn package

**Key**: Bedrock drives creativity, engine validates. Every game is different.

### Move Submission Flow
1. Frontend → Game API: `POST /game/:id/move`
2. Game API → Engine Service: Validate move
3. Game API → Game Store: Make move
4. Game API → Engine Service: Get evaluation
5. Game API → Coach Service: Generate explanation
6. Game API → Frontend: Return feedback + next turn

## Key Design Principles

1. **Bedrock Drives Creativity**: AI generates moves in master styles (not deterministic)
2. **Engine Validates Legality**: Engine is ground truth for move validity, not move generation
3. **Small Files**: Max ~300 lines per file
4. **Single Responsibility**: Each module has one purpose
5. **Dependency Inversion**: Services depend on interfaces
6. **Pure Functions**: Logic functions are testable
7. **Contracts First**: Shared types prevent coupling
8. **Dynamic Gameplay**: Every game feels different because Bedrock generates moves dynamically

## Move Format

- **UCI Format**: Used throughout (e.g., "e2e4")
- **Conversion**: chess.js uses SAN internally, conversion happens at boundaries

## Storage

- **MVP**: In-memory (GameStore)
- **Production**: DynamoDB or Postgres

## Deployment

- **Local**: Docker Compose
- **Production**: 
  - Game API: Lambda (container) or ECS
  - Engine Service: ECS/Fargate
  - Style Service: SageMaker or ECS
  - Coach Service: Bedrock (no hosting)
  - Drill Worker: ECS worker + SQS

## Next Steps

1. ✅ **Bedrock-powered moves** - DONE (replaces deterministic rules)
2. Replace in-memory store with database
3. Improve Stockfish integration (for validation only)
4. Implement drill worker queue
5. Add observability (logs, traces)
6. Add tests
7. Fine-tune Bedrock prompts for each master
8. Add move history context to Bedrock prompts for better continuity

