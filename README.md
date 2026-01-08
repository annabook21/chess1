# Quest for Grandmaster

An AI-powered chess learning platform that lets you learn from legendary grandmaster playing styles (Karpov, Fischer, Tal) with real-time position analysis, human-like opponent move prediction, and personalized coaching.

## Architecture Diagram

![Architecture Diagram](./architecture.drawio.svg)

*Complete system architecture showing all services, data flows, and AWS infrastructure components.*

## Table of Contents

- [Features](#features)
- [Architecture Overview](#architecture-overview)
- [DynamoDB Design & Optimization](#dynamodb-design--optimization)
- [AI Integration](#ai-integration)
- [Human Move Prediction (Maia)](#human-move-prediction-maia)
- [Deployment](#deployment)
- [Local Development](#local-development)

---

## Features

### 🎓 Master Style Learning
Choose moves in the style of legendary players:
- **Karpov (The Constrictor)**: Positional accumulation, prophylaxis, endgame mastery
- **Fischer (The Perfectionist)**: Precision, tactical accuracy, punishing inaccuracies  
- **Tal (The Magician)**: Sacrifices, complications, creative attacks

### 🔮 Human Move Prediction
Predict your opponent's next move using the Maia neural network—a model trained on millions of human games that predicts what a ~1200-rated human would play (not the computer-optimal move).

### 📊 Position Evaluation
Real-time Stockfish analysis showing:
- Centipawn evaluation
- Principal variation (best continuation)
- Visual arrows showing predicted sequences

### 🏆 Achievement System
Earn achievements for good moves, game completions, and learning milestones.

### 📈 Weakness Tracking & Accuracy
Identifies your weakest concepts (e.g., "Open file control", "Knight outposts") based on move history.

**Lichess-Style Accuracy Calculation:**
- Converts centipawn evaluations to **Win Probability** using the Lichess formula
- Calculates per-move accuracy based on win% change (0-100%)
- Uses **harmonic mean** for overall accuracy (weights poor moves more heavily)
- Provides descriptive ratings: "Excellent" (90%+), "Good" (75%+), "Average" (60%+), etc.

---

## UI/UX Design

### Responsive Design Philosophy

The app supports both desktop and mobile views with **user-selectable device modes**:

| Mode | Layout | Key Features |
|------|--------|--------------|
| **Desktop** | Two-column with sidebar | Full move history, evaluation graphs |
| **Mobile** | Single-column, board-focused | Touch-optimized, compact toolbar |

### Compact Bottom Toolbar

All primary actions are accessible from a **fixed bottom toolbar** with glassmorphism styling:

```
┌─────────────────────────────────────────────────────────────────────┐
│  [Timer] [Choice 1] [Choice 2] [Choice 3] [Confirm] [Settings] [+]  │
└─────────────────────────────────────────────────────────────────────┘
```

**Design Principles:**
- **Board visibility**: Toolbar never obscures the chess board
- **Horizontal scrolling**: Choices scroll horizontally with snap points
- **Glassmorphism**: Semi-transparent background with blur for modern aesthetic
- **No pagination**: All choices visible in one row, no scrolling vertically

### Master Choices (Karpov/Fischer/Tal)

During guided play, master move suggestions appear as compact cards in the toolbar:

```typescript
// Each choice card shows:
- Master name (colored by personality)
- Move notation (e.g., "Nf3")
- Hover/tap for strategy tooltip
```

### Prediction Mode

When predicting opponent moves, the **same compact toolbar** is used:
- Prediction cards show probability percentages
- Timer countdown displays inline
- Skip button at the end
- No full-screen modal that blocks the board

### Visual Theme: Sierra VGA Style

The UI pays homage to classic Quest for Glory-style adventure games:
- **16-color inspired palette** with CRT scanline effects
- **Pixel art icons** for pieces and UI elements
- **"Press Start 2P" pixel font** for headings
- **Vignette darkening** at screen edges
- **Phosphor glow** on interactive elements

### Toast Notifications

Coach feedback appears as **auto-dismissing toast notifications**:
- Appears briefly (5 seconds) above the board
- Manual dismiss with close button
- Stored in "Coach's Logs" for later review

---

## Architecture Overview

The system architecture is visualized in the diagram above. Below is a simplified text representation:

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CloudFront CDN                              │
│  (HTTPS termination, SPA routing, WASM headers, API proxy)          │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    │                               │
                    ▼                               ▼
        ┌───────────────────┐           ┌───────────────────┐
        │    S3 Bucket      │           │   ALB (HTTP)      │
        │  (Static Assets)  │           │   Path-based      │
        │  - React App      │           │   routing         │
        │  - ONNX Models    │           └───────────────────┘
        └───────────────────┘                    │
                                    ┌───────────┼───────────┐
                                    │           │           │
                                    ▼           ▼           ▼
                            ┌─────────┐   ┌─────────┐   ┌─────────┐
                            │game-api │   │ engine  │   │  style  │
                            │(Fargate)│   │(Fargate)│   │(Fargate)│
                            └────┬────┘   └─────────┘   └─────────┘
                                 │                           │
                    ┌────────────┼────────────┐              │
                    │            │            │              │
                    ▼            ▼            ▼              ▼
              ┌──────────┐ ┌──────────┐ ┌──────────┐  ┌───────────┐
              │ DynamoDB │ │   SQS    │ │  coach   │  │  Bedrock  │
              │  (Games) │ │(Blunders)│ │(Fargate) │  │  (Claude) │
              └──────────┘ └────┬─────┘ └──────────┘  └───────────┘
                                │
                                ▼
                         ┌─────────────┐
                         │drill-worker │
                         │  (Fargate)  │
                         └─────────────┘
```

### Services

| Service | Purpose | Resources |
|---------|---------|-----------|
| **game-api** | Orchestrates gameplay, coordinates services | 512 CPU, 1GB RAM |
| **engine-service** | Stockfish chess engine wrapper | 1024 CPU, 2GB RAM |
| **style-service** | Bedrock-powered master style move generation | 512 CPU, 1GB RAM |
| **coach-service** | Educational explanations and feedback | 256 CPU, 512MB RAM |
| **drill-worker** | Async blunder processing for drills | 256 CPU, 512MB RAM |

---

## DynamoDB Design & Optimization

### Table Schema

```
Table: MasterAcademy-GameSessions
├── Partition Key: gameId (String)
├── Billing Mode: PAY_PER_REQUEST
├── Point-in-Time Recovery: ENABLED
│
└── GSI: ByUserV2
    ├── Partition Key: userId (String)
    ├── Sort Key: updatedAt (String, ISO-8601)
    └── Projection: INCLUDE [status, turnNumber, opponentStyle, lastEval]
```

### Stored Item Structure

```typescript
interface GameStateRecord {
  gameId: string;              // Partition key
  userId: string;              // For GSI queries
  fen: string;                 // Chess position (~100 bytes)
  userElo: number;             // Player rating
  turnNumber: number;          // Progress tracking
  opponentStyle: MasterStyle;  // 'karpov' | 'fischer' | 'tal'
  status: 'active' | 'completed' | 'abandoned';
  version: number;             // Optimistic locking
  createdAt: string;           // ISO timestamp
  updatedAt: string;           // ISO timestamp, GSI sort key
  lastEval?: number;           // Last centipawn evaluation
}
```

### Key Optimization Patterns

#### 1. **Minimal Item Size (Don't Store Computed Data)**
```typescript
// ❌ ANTI-PATTERN: Storing large computed objects
interface BadRecord {
  currentTurn: TurnPackage;  // 10-50KB with PV lines, explanations, etc.
}

// ✅ OUR PATTERN: Store minimal state, recompute on demand
interface GameStateRecord {
  fen: string;  // Just the position - everything else is computed
}
```
**Impact**: DynamoDB charges per 4KB read. A 50KB item costs 13 RCUs vs 1 RCU for our minimal items. This is a **13x cost reduction** and proportional latency improvement.

#### 2. **GSI with Sort Key for Efficient Range Queries**
```typescript
// Query user's games, sorted by most recent
const games = await docClient.send(new QueryCommand({
  TableName: 'MasterAcademy-GameSessions',
  IndexName: 'ByUserV2',
  KeyConditionExpression: 'userId = :userId',
  ExpressionAttributeValues: { ':userId': userId },
  ScanIndexForward: false,  // Descending order (most recent first)
  Limit: 10,
}));
```
**Why it matters**:
- Without GSI: Full table `Scan` + client-side filter = O(n) reads
- With GSI + Sort Key: Single `Query` = O(1) reads, pre-sorted by DynamoDB

#### 3. **Projection Expressions (Fetch Only What You Need)**
```typescript
await docClient.send(new GetCommand({
  TableName: this.tableName,
  Key: { gameId },
  ProjectionExpression: 'gameId, fen, turnNumber, #status',
  ExpressionAttributeNames: { '#status': 'status' },
}));
```
**Impact**: Reduces network payload. If an item has 20 attributes but you need 5, you transfer 75% less data.

#### 4. **GSI Attribute Projection (Storage Efficiency)**
```typescript
// In CDK stack
gameTable.addGlobalSecondaryIndex({
  indexName: 'ByUserV2',
  projectionType: ProjectionType.INCLUDE,
  nonKeyAttributes: ['status', 'turnNumber', 'opponentStyle', 'lastEval'],
  // NOT projecting: fen, version, createdAt
});
```
**Impact**: GSI only stores what list queries need. Smaller index = lower storage cost + faster queries.

#### 5. **Optimistic Locking (Concurrent Access Handling)**
```typescript
await docClient.send(new UpdateCommand({
  TableName: this.tableName,
  Key: { gameId },
  UpdateExpression: 'SET #version = :newVersion, fen = :fen',
  ConditionExpression: '#version = :expectedVersion',  // Lock check
  ExpressionAttributeValues: {
    ':expectedVersion': currentVersion,
    ':newVersion': currentVersion + 1,
    ':fen': newFen,
  },
}));
```
**Why not DynamoDB Transactions?**
- Transactions cost 2x WCUs
- Chess is mostly single-writer (one user per game)
- Optimistic locking handles edge cases at 50% cost

### Query Performance

| Operation | Pattern | Cost | Latency |
|-----------|---------|------|---------|
| Get game state | `GetItem(gameId)` | 0.5-1 RCU | 5-10ms |
| Make a move | `UpdateItem(gameId)` | 1 WCU | 5-10ms |
| List user games | `Query(GSI: userId)` | 0.5-1 RCU | 5-15ms |
| Create new game | `PutItem` | 1 WCU | 5-10ms |

---

## AI Integration

### Amazon Bedrock (Claude Sonnet 4.5)

Used for two services:

#### Style Service
Generates move recommendations in the style of legendary players:

```typescript
// Prompt structure for master-style move generation
const prompt = `You are ${masterName}, the legendary chess player.
Given this position (FEN: ${fen}), recommend a move that reflects your style.

${masterProfile.systemPrompt}

Legal moves: ${legalMoves.join(', ')}

Respond with:
- Your recommended move in UCI format
- A brief explanation in your characteristic voice
- Key positional concepts being applied`;
```

Each master has a distinct profile:
- **Karpov**: Emphasizes prophylaxis, positional squeezes, endgame technique
- **Fischer**: Focuses on precision, tactical shots, punishing inaccuracies
- **Tal**: Prioritizes sacrifices, complications, attacking chances

#### Coach Service
Provides educational feedback after moves:

```typescript
const prompt = `Analyze this chess position and the move just played.
Position: ${fen}
Move played: ${move}
Engine evaluation: ${evalBefore} → ${evalAfter}

Provide:
1. Assessment of the move quality
2. What concepts it demonstrates (or violates)
3. What the player should consider next time`;
```

### Bedrock Integration Details

```typescript
// style-service/src/models/anthropic.ts
const response = await bedrockClient.send(new InvokeModelCommand({
  modelId: 'anthropic.claude-sonnet-4-5-20250929-v1:0',  // Claude Sonnet 4.5
  contentType: 'application/json',
  body: JSON.stringify({
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  }),
}));
```

**Available Claude models on Bedrock:**
- `anthropic.claude-sonnet-4-5-20250929-v1:0` - Claude Sonnet 4.5 (current)
- `anthropic.claude-opus-4-5-20251101-v1:0` - Claude Opus 4.5
- `anthropic.claude-haiku-4-5-20251001-v1:0` - Claude Haiku 4.5

---

## Human Move Prediction (Maia)

### What is Maia?
Maia is a neural network trained by Microsoft Research on millions of human chess games. Unlike traditional engines that find the objectively best move, Maia predicts what a human of a specific rating would actually play.

### Architecture
```
┌─────────────────────────────────────────────────┐
│                   Browser                        │
│  ┌─────────────────────────────────────────┐    │
│  │         Web Worker                       │    │
│  │  ┌─────────────────────────────────┐    │    │
│  │  │    ONNX Runtime (WASM)          │    │    │
│  │  │    + Maia 1200 Model (3.5MB)    │    │    │
│  │  └─────────────────────────────────┘    │    │
│  └─────────────────────────────────────────┘    │
│              ▲                                   │
│              │ Position encoding (808 features) │
│              │                                   │
│  ┌───────────┴───────────────────────────────┐  │
│  │           MaiaEngine.ts                    │  │
│  │  - FEN → 808-dim tensor encoding          │  │
│  │  - Policy head → move probabilities       │  │
│  │  - Returns top-k human-like moves         │  │
│  └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

### Usage in the App
When the "Predict" feature is enabled, users can:
1. Before seeing the opponent's move, predict what they think the opponent will play
2. Maia runs inference client-side to show what a ~1200-rated human would likely play
3. Correct predictions earn bonus points and achievements

### Technical Implementation

```typescript
// maia/MaiaEngine.ts
export class MaiaEngine {
  private session: ort.InferenceSession | null = null;

  async initialize(modelPath: string): Promise<void> {
    this.session = await ort.InferenceSession.create(modelPath, {
      executionProviders: ['wasm'],
      graphOptimizationLevel: 'all',
    });
  }

  async predictMove(fen: string): Promise<MaiaPrediction[]> {
    // Encode position to 112-plane Lc0 format (7,168 values)
    const encoded = encodeFenToPlanes(fen, history);
    
    // Run inference
    const tensor = new ort.Tensor('float32', encoded, [1, 112, 8, 8]);
    const results = await this.session!.run({ input: tensor });
    
    // Decode 1,858-element policy to move probabilities
    // Uses LC0 encoding: base moves for queen promotions,
    // explicit n/r/b suffixes for underpromotions
    const policy = results.policy.data as Float32Array;
    return decodePolicyToMoves(policy, fen);
  }
}
```

### Why Client-Side?
- **Latency**: No network round-trip for predictions
- **Cost**: No server infrastructure for inference
- **Privacy**: Position data stays in browser
- **Scalability**: Each user's device handles their own inference

---

## Deployment

### Prerequisites

- AWS CLI configured with appropriate credentials
- Node.js 20+
- pnpm 8+
- Docker (for building container images)

### Deploy to AWS

```bash
# 1. Install dependencies
pnpm install

# 2. Build all packages
pnpm -r build

# 3. Bootstrap CDK (first time only, per region)
cd packages/infra
npx cdk bootstrap aws://ACCOUNT_ID/us-west-2

# 4. Deploy
AWS_DEFAULT_REGION=us-west-2 npx cdk deploy --require-approval never
```

### Stack Outputs

After deployment, CDK outputs:
- `FrontendUrl`: CloudFront distribution URL (https://dxxxxx.cloudfront.net)
- `ApiEndpoint`: ALB URL for API calls
- `ModelBucketName`: S3 bucket for ONNX model uploads

### Upload Maia Models

```bash
# After initial deploy, upload ONNX models to S3
cd packages/frontend-web
./scripts/download-maia-models.sh
aws s3 sync dist/models s3://BUCKET_NAME/models --cache-control "max-age=31536000"
```

---

## Local Development

### Quick Start

```bash
# 1. Start backend services (Docker)
docker-compose up -d

# 2. Start frontend dev server
cd packages/frontend-web
pnpm dev
```

### Service URLs (Local)

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5174 |
| Game API | http://localhost:3000 |
| Engine | http://localhost:3001 |
| Style | http://localhost:3002 |
| Coach | http://localhost:3003 |

### Environment Variables

For local Bedrock access, ensure AWS credentials are configured:
```bash
export AWS_REGION=us-west-2
export AWS_PROFILE=your-profile  # Or use IAM credentials
```

---

## Project Structure

```
packages/
├── frontend-web/      # React + Vite frontend
│   ├── src/
│   │   ├── maia/      # Maia neural network integration
│   │   ├── components/
│   │   └── overlays/  # Board visualization overlays
│   └── public/models/ # ONNX model files
├── game-api/          # Main game orchestration service
├── engine-service/    # Stockfish wrapper
├── style-service/     # Bedrock master style generation
├── coach-service/     # Bedrock coaching feedback
├── drill-worker/      # Async blunder processing
├── contracts/         # Shared TypeScript types
└── infra/             # AWS CDK infrastructure
```

---

## License

MIT

