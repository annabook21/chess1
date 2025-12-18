# Comprehensive Testing Plan - Master Academy Chess

## Overview

This testing plan covers all layers of the Master Academy Chess application, addressing the issues discovered during development (Maia AI opponent moves, state management, predictions, game flow).

---

## 1. Test Infrastructure Setup

### Frontend (Vitest + React Testing Library)

```bash
# Add to packages/frontend-web/package.json
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom @testing-library/user-event
```

**vite.config.ts additions:**
```typescript
export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
  },
});
```

### Backend (Jest)

```bash
# Add to packages/game-api/package.json
npm install -D jest @types/jest ts-jest supertest @types/supertest
```

---

## 2. Unit Tests

### 2.1 Maia Engine Tests (`packages/frontend-web/src/maia/`)

| Test File | Coverage Target | Priority |
|-----------|-----------------|----------|
| `encoder.test.ts` | FEN encoding, policy decoding, move mappings | **Critical** |
| `sampling.test.ts` | Move sampling, temperature presets | High |
| `MaiaEngine.test.ts` | Model loading, inference, fallbacks | **Critical** |

#### `encoder.test.ts`
```typescript
describe('encoder', () => {
  describe('initMoveMappings', () => {
    it('should generate exactly 1858 move mappings (LC0 format)', () => {
      const mappings = initMoveMappings();
      expect(mappings.length).toBe(1858);
    });

    it('should include all queen-like moves in correct order', () => {
      // N, NE, E, SE, S, SW, W, NW order
    });

    it('should include knight moves', () => {});
    it('should include underpromotions only from 7th rank', () => {});
  });

  describe('fenToPlanes', () => {
    it('should encode starting position correctly', () => {
      const planes = fenToPlanes('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
      expect(planes.length).toBe(112 * 64); // 112 planes × 64 squares
    });

    it('should flip board for black perspective', () => {});
    it('should encode castling rights', () => {});
    it('should encode en passant square', () => {});
  });

  describe('decodePolicyToMoves', () => {
    it('should decode policy output to legal moves', () => {});
    it('should filter by legal moves only', () => {});
    it('should return empty array for invalid policy', () => {});
  });
});
```

#### `sampling.test.ts`
```typescript
describe('sampling', () => {
  describe('sampleMove', () => {
    it('should return null for empty predictions', () => {
      expect(sampleMove([], 1.0)).toBeNull();
    });

    it('should always pick top move with temperature=0', () => {
      const predictions = [
        { uci: 'e2e4', san: 'e4', probability: 0.6, from: 'e2', to: 'e4' },
        { uci: 'd2d4', san: 'd4', probability: 0.4, from: 'd2', to: 'd4' },
      ];
      for (let i = 0; i < 100; i++) {
        expect(sampleMove(predictions, 0)?.uci).toBe('e2e4');
      }
    });

    it('should sample probabilistically with temperature=1', () => {
      // Run 1000 samples, verify distribution matches roughly
    });

    it('should handle very small probabilities', () => {
      const predictions = [
        { uci: 'e2e4', san: 'e4', probability: 0.0001, from: 'e2', to: 'e4' },
      ];
      expect(sampleMove(predictions, 1.0)).not.toBeNull();
    });
  });
});
```

### 2.2 State Management Tests (`packages/frontend-web/src/`)

#### `App.state.test.tsx`
```typescript
describe('App state management', () => {
  describe('optimisticFen handling', () => {
    it('should set optimisticFen immediately on user move', () => {});
    it('should clear optimisticFen when turnPackage updates', () => {});
    it('should preserve optimisticFen if user makes another move during API call', () => {});
  });

  describe('free play move flow', () => {
    it('should show user move immediately (optimistic update)', () => {});
    it('should show opponent move after API response', () => {});
    it('should handle Maia failure with random fallback', () => {});
    it('should not get stuck if API times out', () => {});
  });

  describe('prediction flow', () => {
    it('should show prediction UI when enabled for human-like opponent', () => {});
    it('should not show prediction UI for master opponents', () => {});
    it('should clear prediction state after submission', () => {});
    it('should handle prediction timeout gracefully', () => {});
  });
});
```

### 2.3 Achievement System Tests

#### `evaluator.test.ts`
```typescript
describe('Achievement Evaluator', () => {
  describe('FIRST_STEPS', () => {
    it('should unlock after first game completion', () => {});
  });

  describe('DAY_STREAK', () => {
    it('should track consecutive days', () => {});
    it('should reset streak if day is missed', () => {});
  });

  describe('SHARP_EYE', () => {
    it('should unlock after 10 correct predictions', () => {});
  });

  describe('RISING_STAR', () => {
    it('should unlock at level 10', () => {});
  });

  describe('ON_FIRE', () => {
    it('should unlock after 5 prediction streak', () => {});
  });
});
```

### 2.4 Narration Tests (Existing - Expand)

Already have: `tagger.test.ts`, `narrator.test.ts`, `moodMapper.test.ts`

Add coverage for edge cases:
```typescript
describe('narrator edge cases', () => {
  it('should handle missing templates gracefully', () => {});
  it('should not crash on undefined move data', () => {});
});
```

---

## 3. Integration Tests

### 3.1 Maia + Game Flow Integration

```typescript
describe('Maia game integration', () => {
  it('complete game flow: user move → Maia prediction → Maia opponent move', async () => {
    // 1. Setup game with human-like opponent
    // 2. User makes move (e2e4)
    // 3. Verify prediction UI shows
    // 4. Submit prediction
    // 5. Verify opponent move is generated
    // 6. Verify board shows both moves
  });

  it('should recover from Maia model load failure', async () => {
    // Mock model loading failure
    // Verify random fallback is used
    // Game continues without getting stuck
  });
});
```

### 3.2 API Integration Tests (`packages/game-api/`)

```typescript
describe('Game API', () => {
  describe('POST /game', () => {
    it('should create new game with valid config', async () => {});
    it('should return initial turn package', async () => {});
  });

  describe('POST /game/:id/move', () => {
    it('should accept valid move', async () => {});
    it('should reject invalid move', async () => {});
    it('should return AI move for non-human-like opponents', async () => {});
    it('should skip AI move when skipAiMove=true', async () => {});
  });

  describe('Engine timeouts', () => {
    it('should handle Stockfish timeout gracefully', async () => {});
    it('should return fallback move on engine failure', async () => {});
  });
});
```

---

## 4. End-to-End Tests (Playwright)

### Setup
```bash
npm install -D @playwright/test
npx playwright install
```

### Critical User Flows

#### `e2e/free-play-human-like.spec.ts`
```typescript
test.describe('Free Play with Human-like AI', () => {
  test('complete 3-move sequence', async ({ page }) => {
    await page.goto('/');
    
    // Start new game
    await page.click('text=Free Play');
    await page.click('text=Human-like');
    await page.click('text=Start Game');
    
    // Move 1
    await page.dragAndDrop('[data-square="e2"]', '[data-square="e4"]');
    await expect(page.locator('[data-square="e4"] [data-piece]')).toBeVisible();
    
    // Wait for prediction UI
    await expect(page.locator('.prediction-container')).toBeVisible({ timeout: 5000 });
    
    // Submit prediction (or wait for timeout)
    await page.click('.prediction-choice:first-child');
    
    // Verify opponent moved
    await expect(page.locator('.move-history')).toContainText(/[a-h][1-8]/);
    
    // Move 2
    await page.dragAndDrop('[data-square="d2"]', '[data-square="d4"]');
    // ... continue
  });

  test('illegal move is rejected with notification', async ({ page }) => {
    // Attempt to move opponent's piece
    // Verify rejection message appears
  });

  test('game continues if Maia times out', async ({ page }) => {
    // Slow network simulation
    // Verify fallback move is made
  });
});
```

#### `e2e/guided-mode.spec.ts`
```typescript
test.describe('Guided Mode', () => {
  test('shows move choices and feedback', async ({ page }) => {});
  test('tracks achievements correctly', async ({ page }) => {});
  test('prediction scoring works', async ({ page }) => {});
});
```

#### `e2e/achievements.spec.ts`
```typescript
test.describe('Achievements', () => {
  test('FIRST_STEPS unlocks after completing a game', async ({ page }) => {});
  test('DAY_STREAK tracks across sessions', async ({ page }) => {});
});
```

---

## 5. Manual Testing Checklist

### 5.1 Critical Path Testing

| # | Scenario | Steps | Expected Result | Status |
|---|----------|-------|-----------------|--------|
| 1 | Free play first move | Start game → drag piece | Piece stays, opponent responds | ☐ |
| 2 | Free play second move | After opponent moves → make second move | Both moves stay on board | ☐ |
| 3 | Free play third move | Continue game | Game flows without resets | ☐ |
| 4 | Prediction submission | Make move → prediction appears → click choice | Prediction recorded, opponent moves | ☐ |
| 5 | Prediction timeout | Make move → wait 25s | Timeout triggers, opponent moves | ☐ |
| 6 | Illegal move | Try to move piece illegally | Piece returns, notification shows | ☐ |
| 7 | Mode switch | Start guided → switch to free | State preserved, game continues | ☐ |

### 5.2 Edge Case Testing

| # | Scenario | Steps | Expected Result | Status |
|---|----------|-------|-----------------|--------|
| 8 | Slow network | Throttle to Slow 3G → make moves | Game continues (may be slow) | ☐ |
| 9 | Maia model failure | Block model requests → play | Random fallback moves used | ☐ |
| 10 | Rapid moves | Make moves very quickly | No race conditions, moves ordered | ☐ |
| 11 | Browser refresh | Refresh mid-game | Game state preserved (or clean restart) | ☐ |
| 12 | Long game | Play 40+ moves | No memory leaks, performance stable | ☐ |

### 5.3 Cross-Browser Testing

| Browser | Version | Free Play | Guided | Predictions | Maia |
|---------|---------|-----------|--------|-------------|------|
| Chrome | Latest | ☐ | ☐ | ☐ | ☐ |
| Firefox | Latest | ☐ | ☐ | ☐ | ☐ |
| Safari | Latest | ☐ | ☐ | ☐ | ☐ |
| Edge | Latest | ☐ | ☐ | ☐ | ☐ |
| Mobile Safari | iOS 17 | ☐ | ☐ | ☐ | ☐ |
| Chrome Mobile | Android 14 | ☐ | ☐ | ☐ | ☐ |

---

## 6. Performance Testing

### 6.1 Maia Engine Benchmarks

```typescript
describe('Maia performance', () => {
  it('model load time < 3s', async () => {
    const start = performance.now();
    await maiaEngine.loadModel(1500);
    expect(performance.now() - start).toBeLessThan(3000);
  });

  it('inference time < 500ms', async () => {
    const start = performance.now();
    await maiaEngine.predict(startingFen);
    expect(performance.now() - start).toBeLessThan(500);
  });
});
```

### 6.2 Memory Leak Detection

- Use Chrome DevTools Memory tab
- Play 20 games, monitor heap size
- Check for detached DOM nodes

---

## 7. Test Priority Matrix

| Category | Tests | Priority | Effort | Coverage Target |
|----------|-------|----------|--------|-----------------|
| Maia encoder | 15 | **P0** | Medium | 95% |
| State management | 20 | **P0** | High | 90% |
| Achievement system | 12 | P1 | Medium | 85% |
| Game API endpoints | 10 | **P0** | Medium | 90% |
| E2E critical paths | 7 | **P0** | High | 100% |
| Narration (existing) | 15 | P2 | Low | 80% |
| Cross-browser | 6 | P1 | Medium | N/A |

---

## 8. CI/CD Integration

### GitHub Actions Workflow

```yaml
# .github/workflows/test.yml
name: Test Suite

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
      - run: npm run test:unit
      
  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run test:e2e
      
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run lint
```

---

## 9. Implementation Roadmap

### Phase 1: Foundation (Week 1)
- [ ] Set up Vitest for frontend
- [ ] Set up Jest for backend
- [ ] Create test utilities and mocks
- [ ] Write encoder.test.ts (critical)

### Phase 2: Core Coverage (Week 2)
- [ ] Write sampling.test.ts
- [ ] Write MaiaEngine.test.ts
- [ ] Write App.state.test.tsx
- [ ] Write game API tests

### Phase 3: E2E & Integration (Week 3)
- [ ] Set up Playwright
- [ ] Write critical path E2E tests
- [ ] Write integration tests
- [ ] Set up CI/CD

### Phase 4: Polish (Week 4)
- [ ] Cross-browser testing
- [ ] Performance benchmarks
- [ ] Manual testing sweep
- [ ] Documentation

---

## 10. Test Data & Fixtures

### FEN Positions for Testing
```typescript
export const TEST_FENS = {
  starting: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  afterE4: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
  scholarsMate: 'r1bqkb1r/pppp1Qpp/2n2n2/4p3/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 0 4',
  stalemate: '8/8/8/8/8/5k2/5p2/5K2 w - - 0 1',
  promotion: '8/P7/8/8/8/8/8/k1K5 w - - 0 1',
};
```

### Mock Maia Predictions
```typescript
export const MOCK_PREDICTIONS = {
  opening: [
    { uci: 'e7e5', san: 'e5', probability: 0.35, from: 'e7', to: 'e5' },
    { uci: 'd7d5', san: 'd5', probability: 0.25, from: 'd7', to: 'd5' },
    { uci: 'c7c5', san: 'c5', probability: 0.15, from: 'c7', to: 'c5' },
  ],
};
```

---

## Summary

This testing plan provides comprehensive coverage for the Master Academy Chess application, with particular focus on:

1. **Maia engine reliability** - The source of most recent bugs
2. **State management** - Preventing optimisticFen/turnPackage race conditions
3. **Game flow integrity** - Ensuring moves don't reset or get stuck
4. **Achievement accuracy** - Making all achievements achievable

Run tests locally with:
```bash
npm run test:unit    # Unit tests
npm run test:e2e     # E2E tests
npm run test         # All tests
```
