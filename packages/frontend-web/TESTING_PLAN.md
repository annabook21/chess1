# Master Academy Chess - Comprehensive Testing Plan

## Overview

This document outlines the testing strategy for the Master Academy Chess application across all packages. The goal is to ensure reliability, catch regressions, and maintain code quality.

**Test Framework**: Vitest (frontend), with potential expansion to backend services
**Coverage Target**: 80%+ for critical paths, 60%+ overall

---

## 1. Test Categories

| Category | Description | Priority |
|----------|-------------|----------|
| **Unit Tests** | Pure functions, utilities, isolated logic | P0 |
| **Integration Tests** | Component interactions, API flows | P1 |
| **E2E Tests** | Full user flows (Playwright/Cypress) | P2 |
| **Snapshot Tests** | UI component regression | P3 |

---

## 2. Frontend (`packages/frontend-web`)

### 2.1 Core Maia Engine (`src/maia/`)

**Status**: Partially covered ✅

| File | Test File | Coverage | Priority |
|------|-----------|----------|----------|
| `encoder.ts` | `encoder.test.ts` | ✅ Good | P0 |
| `sampling.ts` | `sampling.test.ts` | ✅ Good | P0 |
| `MaiaEngine.ts` | `MaiaEngine.test.ts` | ❌ Missing | P0 |
| `useMaia.tsx` | `useMaia.test.tsx` | ❌ Missing | P1 |
| `types.ts` | (utility functions) | ❌ Missing | P1 |

#### New Tests Needed:

```typescript
// MaiaEngine.test.ts
describe('MaiaEngine', () => {
  describe('loadModel', () => {
    it('should load ONNX model from URL');
    it('should handle load failures gracefully');
    it('should cache loaded models');
    it('should emit loading progress events');
  });

  describe('predict', () => {
    it('should return predictions for valid FEN');
    it('should return fallback for invalid FEN');
    it('should respect top-K parameter');
    it('should handle concurrent predictions');
  });

  describe('dispose', () => {
    it('should release ONNX session resources');
  });
});

// types.test.ts
describe('formatProbability', () => {
  it('should format 0.45 as "45%"');
  it('should format 0.045 as "4.5%"');
  it('should format 0.0045 as "0.45%"');
  it('should format 0.0001 as "<0.1%"');
  it('should format 0 as "0%"');
});
```

### 2.2 Achievement System (`src/achievements/`)

**Status**: Not covered ❌

| File | Test File | Priority |
|------|-----------|----------|
| `evaluator.ts` | `evaluator.test.ts` | P0 |
| `types.ts` | (type definitions) | N/A |
| `castleAchievements.ts` | `castleAchievements.test.ts` | P1 |
| `useAchievements.tsx` | `useAchievements.test.tsx` | P2 |

#### New Tests Needed:

```typescript
// evaluator.test.ts
describe('evaluateEvent', () => {
  describe('GAME_COMPLETED event', () => {
    it('should increment gamesPlayed');
    it('should increment gamesWon when won=true');
    it('should increment perfectGames when no blunders/mistakes');
    it('should reset currentPredictionStreak');
  });

  describe('MOVE_PLAYED event', () => {
    it('should increment bestMovesFound for best moves');
    it('should increment brilliantMoves for brilliant moves');
    it('should increment tacticsFound for tactical moves');
  });

  describe('PREDICTION_MADE event', () => {
    it('should update currentPredictionStreak on correct');
    it('should update maxPredictionStreak when beating record');
    it('should reset streak on incorrect');
  });

  describe('achievement completion', () => {
    it('should mark achievement completed when threshold reached');
    it('should not re-complete already completed achievements');
    it('should return newlyCompleted array');
  });
});

// castleAchievements.test.ts
describe('Castle Achievements', () => {
  it('should define all required achievements');
  it('should have unique IDs');
  it('should have valid trigger configurations');
  it('should have appropriate XP rewards');
});
```

### 2.3 Narration System (`src/narration/`)

**Status**: Partially covered ✅

| File | Test File | Coverage | Priority |
|------|-----------|----------|----------|
| `narrator.ts` | `narrator.test.ts` | ✅ Basic | P1 |
| `tagger.ts` | `tagger.test.ts` | ✅ Basic | P0 |
| `moodMapper.ts` | `moodMapper.test.ts` | ✅ Basic | P1 |
| `emotionalArc.ts` | `emotionalArc.test.ts` | ❌ Missing | P2 |
| `templateLoader.ts` | `templateLoader.test.ts` | ❌ Missing | P2 |

#### New Tests Needed:

```typescript
// tagger.test.ts (expand existing)
describe('tagMove', () => {
  it('should tag blunders (eval loss >= 200cp)');
  it('should tag mistakes (eval loss >= 100cp)');
  it('should tag best moves (matches engine best)');
  it('should identify tactics (forks, pins, skewers)');
  it('should identify positional concepts (outposts, weak squares)');
  it('should handle checkmate positions');
  it('should handle stalemate positions');
});

// emotionalArc.test.ts
describe('EmotionalArc', () => {
  it('should track game momentum');
  it('should detect comeback scenarios');
  it('should influence narrative tone');
});
```

### 2.4 Components (`src/components/`)

**Status**: Not covered ❌

| Component | Priority | Test Focus |
|-----------|----------|------------|
| `ChessBoard.tsx` | P0 | Move handling, piece rendering |
| `MoveChoices.tsx` | P0 | Choice selection, rendering |
| `PredictOpponent.tsx` | P0 | Prediction flow, timer |
| `Feedback.tsx` | P1 | Feedback display |
| `Sidebar.tsx` | P2 | Stats display |
| `Header.tsx` | P3 | Navigation |

#### New Tests Needed:

```typescript
// ChessBoard.test.tsx
describe('ChessBoard', () => {
  describe('rendering', () => {
    it('should render 64 squares');
    it('should render pieces from FEN');
    it('should highlight last move');
    it('should show legal moves on piece selection');
  });

  describe('move handling', () => {
    it('should call onPieceDrop with correct squares');
    it('should reject illegal moves');
    it('should handle promotion moves');
    it('should respect board orientation');
  });

  describe('overlays', () => {
    it('should render arrows from overlay providers');
    it('should render square highlights');
    it('should render prediction hover preview');
  });
});

// MoveChoices.test.tsx
describe('MoveChoices', () => {
  it('should render all choices');
  it('should highlight selected choice');
  it('should display master style icons');
  it('should show evaluation delta');
  it('should call onSelect when clicked');
  it('should show concept tags');
});

// PredictOpponent.test.tsx
describe('PredictOpponent', () => {
  describe('rendering', () => {
    it('should show prediction options');
    it('should display timer countdown');
    it('should show probability for each prediction');
  });

  describe('interaction', () => {
    it('should call onPredictionSubmit when prediction selected');
    it('should call onSkip when skip clicked');
    it('should auto-skip on timer expiry');
    it('should highlight hovered prediction');
  });

  describe('Maia integration', () => {
    it('should display Maia predictions for human-like opponents');
    it('should format small probabilities correctly');
  });
});
```

### 2.5 App State & Flows (`src/App.tsx`)

**Status**: Not covered ❌

This is the most critical file with complex state management. Testing approach: Extract logic into testable hooks/utilities.

#### Recommended Refactoring for Testability:

```typescript
// Extract into: src/hooks/useGameFlow.ts
export const useGameFlow = (gameId: string) => {
  // Game state management
  // Move submission
  // Turn package handling
};

// Extract into: src/hooks/useMaiaOpponent.ts
export const useMaiaOpponent = (maiaContext, opponentRating) => {
  // Maia move generation
  // Fallback logic
};

// Extract into: src/hooks/usePredictionFlow.ts
export const usePredictionFlow = () => {
  // Prediction state
  // Timer management
  // Result calculation
};
```

#### Tests for Extracted Hooks:

```typescript
// useGameFlow.test.ts
describe('useGameFlow', () => {
  it('should initialize game with createGame API');
  it('should fetch initial turn package');
  it('should submit moves via API');
  it('should handle API errors gracefully');
  it('should update optimisticFen before API response');
  it('should clear optimisticFen on API response');
});

// useMaiaOpponent.test.ts
describe('useMaiaOpponent', () => {
  it('should generate move from Maia predictions');
  it('should sample move based on temperature');
  it('should fallback to random move on Maia failure');
  it('should await pending model loads');
});

// usePredictionFlow.test.ts
describe('usePredictionFlow', () => {
  it('should start prediction timer');
  it('should store pending response until prediction');
  it('should calculate prediction score correctly');
  it('should handle prediction timeout');
  it('should clear state on flow completion');
});
```

### 2.6 API Client (`src/api/`)

**Status**: Not covered ❌

```typescript
// client.test.ts
describe('API Client', () => {
  describe('createGame', () => {
    it('should POST to /game with userElo');
    it('should return gameId on success');
    it('should throw on network error');
  });

  describe('getTurn', () => {
    it('should GET /game/:id/turn');
    it('should return TurnPackage');
    it('should handle 404 for invalid gameId');
  });

  describe('submitMove', () => {
    it('should POST move to /game/:id/move');
    it('should return MoveResponse');
    it('should handle 400 for illegal moves');
    it('should handle 504 timeout gracefully');
  });
});
```

### 2.7 Overlay System (`src/overlays/`)

**Status**: Not covered ❌

```typescript
// providers/AttacksProvider.test.ts
describe('AttacksProvider', () => {
  it('should compute attacked squares from FEN');
  it('should generate arrow overlays');
  it('should respect user preferences');
});

// useOverlayManager.test.ts
describe('useOverlayManager', () => {
  it('should register overlay providers');
  it('should compute combined frames');
  it('should respect priority ordering');
  it('should toggle providers');
});
```

### 2.8 Theme System (`src/theme/`)

**Status**: Not covered ❌ (low priority)

```typescript
// effects/pixelScale.test.ts
describe('pixelScale', () => {
  it('should apply CRT filter effect');
  it('should respect intensity parameter');
});
```

---

## 3. Backend Services

### 3.1 Game API (`packages/game-api`)

| File | Priority | Test Focus |
|------|----------|------------|
| `services/choice-builder.ts` | P0 | Move choice generation |
| `services/ai-opponent.ts` | P0 | AI move selection |
| `services/difficulty.ts` | P1 | Difficulty scaling |
| `controllers/turn-controller.ts` | P1 | Turn package generation |
| `controllers/move-controller.ts` | P1 | Move processing |
| `store/game-store.ts` | P2 | Game state persistence |

#### Tests Needed:

```typescript
// choice-builder.test.ts
describe('ChoiceBuilder', () => {
  describe('buildChoices', () => {
    it('should return 3 distinct move choices');
    it('should include evaluation for each move');
    it('should assign master styles correctly');
    it('should generate concept tags');
    it('should validate moves are legal');
  });

  describe('master strategies', () => {
    it('should generate Fischer-style plans');
    it('should generate Tal-style plans');
    it('should generate Capablanca-style plans');
    it('should generate Karpov-style plans');
  });

  describe('fallback', () => {
    it('should use engine moves when styles fail');
    it('should handle timeout gracefully');
  });
});

// ai-opponent.test.ts
describe('AIOpponent', () => {
  it('should select move based on difficulty');
  it('should inject mistakes at lower ELO');
  it('should play optimal at high ELO');
  it('should vary play style');
});
```

### 3.2 Engine Service (`packages/engine-service`)

```typescript
// stockfish-wrapper.test.ts
describe('StockfishWrapper', () => {
  describe('analyze', () => {
    it('should return evaluation for position');
    it('should respect depth parameter');
    it('should respect time limit');
    it('should return principal variation');
  });

  describe('scoreMove', () => {
    it('should return eval delta for move');
    it('should handle checkmate correctly');
    it('should handle stalemate correctly');
  });

  describe('resource management', () => {
    it('should reuse engine process');
    it('should handle process crashes');
    it('should respect concurrent limits');
  });
});
```

### 3.3 Contracts (`packages/contracts`)

```typescript
// types.test.ts
describe('Type Guards', () => {
  it('should validate TurnPackage structure');
  it('should validate MoveRequest structure');
  it('should validate MoveResponse structure');
});

// schema.test.ts
describe('JSON Schema', () => {
  it('should validate valid TurnPackage JSON');
  it('should reject invalid TurnPackage JSON');
});
```

---

## 4. Integration Tests

### 4.1 Frontend-Backend Integration

```typescript
// integration/game-flow.test.ts
describe('Game Flow Integration', () => {
  it('should create game and receive initial turn');
  it('should submit move and receive feedback');
  it('should play full game to completion');
  it('should handle game with AI opponent');
  it('should handle free play mode');
});

// integration/maia-prediction.test.ts
describe('Maia Prediction Integration', () => {
  it('should load Maia model on demand');
  it('should generate predictions for position');
  it('should sample move from distribution');
  it('should display prediction UI');
  it('should score prediction correctly');
});
```

### 4.2 Service-to-Service Integration

```typescript
// integration/services.test.ts
describe('Service Integration', () => {
  it('should call engine service for analysis');
  it('should call style service for move suggestions');
  it('should call coach service for explanations');
});
```

---

## 5. E2E Tests (Playwright)

### 5.1 Critical User Flows

```typescript
// e2e/guided-play.spec.ts
test.describe('Guided Play', () => {
  test('should start new game');
  test('should display move choices');
  test('should select and submit move');
  test('should show feedback after move');
  test('should display AI opponent move');
  test('should play until game end');
});

// e2e/free-play.spec.ts
test.describe('Free Play', () => {
  test('should enable free move mode');
  test('should reject illegal moves');
  test('should show illegal move notification');
  test('should play moves by drag and drop');
});

// e2e/prediction.spec.ts
test.describe('Move Prediction', () => {
  test('should show prediction UI after user move');
  test('should display Maia predictions');
  test('should submit prediction');
  test('should show prediction result');
  test('should update prediction stats');
});

// e2e/achievements.spec.ts
test.describe('Achievements', () => {
  test('should unlock achievement on trigger');
  test('should show achievement toast');
  test('should persist achievements');
  test('should track progress correctly');
});
```

### 5.2 Error Scenarios

```typescript
// e2e/error-handling.spec.ts
test.describe('Error Handling', () => {
  test('should show error on API timeout');
  test('should recover from Maia model failure');
  test('should handle network disconnect');
  test('should preserve game state on refresh');
});
```

---

## 6. Test Data & Fixtures

### 6.1 Chess Positions

```typescript
// fixtures/positions.ts
export const POSITIONS = {
  starting: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  
  // Tactical positions
  forkPosition: '...', // Knight fork opportunity
  pinPosition: '...', // Pin tactic
  discoveredAttack: '...', // Discovered attack
  
  // Endgames
  kpkEndgame: '8/8/8/8/4k3/8/4P3/4K3 w - - 0 1',
  rookEndgame: '...',
  
  // Special cases
  checkmatePosition: '...',
  stalematePosition: '...',
  promotionPosition: '8/P7/8/8/8/8/8/4K2k w - - 0 1',
};

export const MOVE_SEQUENCES = {
  scholarsMate: ['e2e4', 'e7e5', 'd1h5', 'b8c6', 'f1c4', 'g8f6', 'h5f7'],
  // ...
};
```

### 6.2 Mock Responses

```typescript
// fixtures/mocks.ts
export const MOCK_TURN_PACKAGE: TurnPackage = {
  gameId: 'test-game-123',
  fen: POSITIONS.starting,
  sideToMove: 'w',
  choices: [/* ... */],
  bestMove: { moveUci: 'e2e4', eval: 30 },
  difficulty: { engineElo: 1500, hintLevel: 2 },
  telemetryHints: { timeBudgetMs: 60000 },
};

export const MOCK_MAIA_PREDICTIONS: MovePrediction[] = [
  { uci: 'e2e4', san: 'e4', probability: 0.4, from: 'e2', to: 'e4' },
  { uci: 'd2d4', san: 'd4', probability: 0.3, from: 'd2', to: 'd4' },
  // ...
];
```

---

## 7. Test Infrastructure

### 7.1 Setup Files

```typescript
// vitest.setup.ts
import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock ONNX runtime
vi.mock('onnxruntime-web', () => ({
  InferenceSession: {
    create: vi.fn().mockResolvedValue({
      run: vi.fn().mockResolvedValue({ output: new Float32Array(1858) }),
      release: vi.fn(),
    }),
  },
  Tensor: vi.fn(),
}));

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  clear: vi.fn(),
};
global.localStorage = localStorageMock;
```

### 7.2 Test Utilities

```typescript
// test-utils.tsx
import { render } from '@testing-library/react';
import { MaiaProvider } from './maia';
import { AchievementProvider } from './achievements';
import { ThemeProvider } from './theme';

export function renderWithProviders(ui: React.ReactElement) {
  return render(
    <ThemeProvider>
      <MaiaProvider>
        <AchievementProvider>
          {ui}
        </AchievementProvider>
      </MaiaProvider>
    </ThemeProvider>
  );
}

export * from '@testing-library/react';
```

---

## 8. Implementation Phases

### Phase 1: Critical Path (Week 1)
- [ ] `evaluator.test.ts` - Achievement system
- [ ] `MaiaEngine.test.ts` - Maia engine core
- [ ] `ChessBoard.test.tsx` - Main board component
- [ ] `choice-builder.test.ts` - Backend choice generation

### Phase 2: User Flows (Week 2)
- [ ] `PredictOpponent.test.tsx`
- [ ] `MoveChoices.test.tsx`
- [ ] `useGameFlow.test.ts` (after extraction)
- [ ] `ai-opponent.test.ts`

### Phase 3: Integration (Week 3)
- [ ] Frontend-backend integration tests
- [ ] Maia prediction integration tests
- [ ] Setup Playwright for E2E

### Phase 4: E2E & Polish (Week 4)
- [ ] Guided play E2E
- [ ] Free play E2E
- [ ] Achievement E2E
- [ ] Error handling E2E

---

## 9. CI/CD Integration

### GitHub Actions Workflow

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run test:run -- --coverage
      - uses: codecov/codecov-action@v4

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npx playwright install
      - run: npm run test:e2e
```

---

## 10. Coverage Goals

| Package | Current | Target |
|---------|---------|--------|
| `frontend-web/src/maia` | 40% | 90% |
| `frontend-web/src/achievements` | 0% | 85% |
| `frontend-web/src/narration` | 30% | 70% |
| `frontend-web/src/components` | 0% | 60% |
| `game-api/src/services` | 0% | 80% |
| `engine-service/src` | 0% | 70% |

---

## 11. Running Tests

```bash
# Run all tests
npm run test

# Run with coverage
npm run test:coverage

# Run specific file
npm run test -- encoder.test.ts

# Watch mode
npm run test -- --watch

# Run E2E tests (after Playwright setup)
npm run test:e2e
```






