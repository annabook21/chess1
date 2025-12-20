# Comprehensive Test Plan

## Current State
- **Unit Tests**: 693 tests passing (496 frontend + 197 backend)
- **Coverage Gaps**: engine-service (0%), App.tsx (0%), many UI components

## Test Plan Phases

### Phase 1: Engine Service Package (0% → 80%+)

#### 1.1 StockfishWrapper Unit Tests
**File**: `packages/engine-service/src/engine/stockfish-wrapper.test.ts`

| Test | Description |
|------|-------------|
| Singleton pattern | `getInstance()` returns same instance |
| Fallback mode | Uses heuristics when Stockfish unavailable |
| `isLegalMove()` | Validates legal/illegal moves correctly |
| `scoreMoves()` | Scores moves using heuristics |
| `quickMoveScore()` | Capture, check, checkmate bonuses |
| `buildQuickPv()` | Builds principal variation |
| `fallbackAnalysis()` | Returns valid analysis without engine |
| `evaluatePosition()` | Material evaluation correct |
| `setStrength()` | Clamps ELO to valid range |
| Request queue | Serializes concurrent requests |

#### 1.2 Engine Routes Integration Tests
**File**: `packages/engine-service/src/routes/engine.test.ts`

| Test | Description |
|------|-------------|
| POST /analyze | Valid request returns analysis |
| POST /analyze | Missing fen returns 400 |
| POST /analyze | Missing depth/timeMs returns 400 |
| GET /is-legal | Valid move returns true |
| GET /is-legal | Illegal move returns false |
| POST /score-moves | Scores moves correctly |
| POST /set-strength | Sets ELO in valid range |
| POST /set-strength | Rejects invalid ELO |

### Phase 2: Integration Tests

#### 2.1 Game Flow Integration
**File**: `packages/game-api/src/integration/game-flow.test.ts`

| Test | Description |
|------|-------------|
| Full game creation | Creates game and fetches turn |
| Move submission | Submit move, get feedback, next turn |
| AI opponent response | AI generates valid move |
| Game over detection | Detects checkmate/stalemate |
| Choice generation | All choices are legal moves |

### Phase 3: E2E Tests (Playwright)

#### 3.1 Core Game Flow
**File**: `packages/frontend-web/e2e/game-flow.spec.ts`

| Test | Description |
|------|-------------|
| App loads | Page renders without errors |
| Chessboard visible | Board component renders |
| Move selection | Click choice, see preview |
| Move confirmation | Confirm move, board updates |

#### 3.2 Settings & Preferences
| Test | Description |
|------|-------------|
| Open settings | Settings panel appears |
| Change opponent | AI/Maia toggle works |
| Persist settings | Reload preserves settings |

### Phase 4: Coverage Verification

Target coverage after all phases:
- **engine-service**: 80%+
- **game-api**: 80%+  
- **frontend-web**: 60%+
- **Overall**: 70%+

## Execution Order

1. ✅ Create test plan (this document)
2. 🔄 Add engine-service tests
3. 🔄 Add integration tests
4. 🔄 Validate E2E tests
5. 🔄 Run full test suite
6. 🔄 Generate coverage report





