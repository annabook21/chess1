# XState Game Machine

This module implements a state machine for managing chess game flow using XState v5.

## Overview

The game machine replaces the 70+ React hooks in `App.tsx` with an explicit state machine that models game flow as states and transitions. This eliminates race conditions and makes impossible states impossible.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         GameMachine                              │
│                                                                  │
│   ┌─────┐    START_GAME    ┌─────────┐                          │
│   │ idle │ ───────────────▶│ loading │                          │
│   └─────┘                  └────┬────┘                          │
│       ▲                         │                                │
│       │ NEW_GAME               │ GAME_CREATED                   │
│       │                         ▼                                │
│   ┌──────────┐           ┌───────────────────────────────────┐  │
│   │ gameOver │◀──────────│              playing              │  │
│   └──────────┘  GAME_END │                                   │  │
│                          │  ┌────────────┐  ┌─────────────┐  │  │
│       ▲                  │  │ playerTurn │  │ opponentTurn│  │  │
│       │ RETRY            │  └────────────┘  └─────────────┘  │  │
│   ┌───┴───┐              └───────────────────────────────────┘  │
│   │ error │◀── GAME_CREATE_FAILED                               │
│   └───────┘                                                     │
└─────────────────────────────────────────────────────────────────┘
```

### Player Turn Sub-states

```
playerTurn
├── selectingMove    ← User picks a move
├── submittingMove   ← Move sent to server
└── showingPrediction ← Prediction UI displayed
```

### Opponent Turn Sub-states

```
opponentTurn
├── generatingMove   ← Maia inference running
└── applyingMove     ← Move applied to board
```

## Files

| File | Description |
|------|-------------|
| `types.ts` | TypeScript types for context, events, and state |
| `gameMachine.ts` | Main XState machine definition |
| `services.ts` | Async services (API calls, Maia inference) |
| `actions.ts` | Action helpers for state updates |
| `useGameMachine.ts` | React hook wrapper for the machine |
| `GameProvider.tsx` | React context provider with feature flag |
| `MaiaBridge.tsx` | Connects machine to Maia neural network |
| `NarrationBridge.tsx` | Connects machine to narration system |

## Usage

### Enable XState (Feature Flag)

Set `USE_XSTATE = true` in `GameProvider.tsx`:

```tsx
// GameProvider.tsx
export const USE_XSTATE = true; // Enable XState
```

### Access Game State

```tsx
import { useGameMachineContext } from './machines';

function MyComponent() {
  const { 
    // State
    gamePhase,
    isPlayerTurn,
    currentFen,
    choices,
    
    // Actions
    startGame,
    submitMove,
    selectChoice,
  } = useGameMachineContext();
  
  return (
    <button onClick={startGame}>
      Start Game
    </button>
  );
}
```

### Dispatch Events

```tsx
const { submitMove, selectChoice, updateSettings } = useGameMachineContext();

// Select a move
selectChoice('A');

// Submit move
submitMove('A');

// Update settings
updateSettings({ 
  opponentType: 'human-like',
  maiaOpponentRating: 1600 
});
```

## Testing

Run machine tests:

```bash
pnpm test src/machines/gameMachine.test.ts
```

The machine can be tested in isolation without React:

```ts
import { createActor } from 'xstate';
import { gameMachine } from './gameMachine';

const actor = createActor(gameMachine);
actor.start();

actor.send({ type: 'START_GAME' });
actor.send({ type: 'GAME_CREATED', gameId: '123', turnPackage: {...} });

expect(actor.getSnapshot().value).toEqual({ playing: { playerTurn: 'selectingMove' } });
```

## Benefits

1. **Eliminates Race Conditions**: State transitions are atomic and explicit
2. **Impossible States Are Impossible**: Can't be in "prediction mode" without a pending response
3. **Testable**: Machine can be tested in isolation without React
4. **Visualizable**: Use Stately.ai visualizer for debugging
5. **Self-Documenting**: State chart IS the documentation

## Migration Notes

The machine is designed for incremental migration:

1. **Phase 1**: Core game flow (idle, loading, playing, gameOver) ✅
2. **Phase 2**: Prediction sub-states ✅
3. **Phase 3**: Maia integration ✅
4. **Phase 4**: UI states (narration, celebration) ✅
5. **Phase 5**: Full migration (remove useState hooks from App.tsx)

Currently, the existing `App.tsx` code continues to work. The machine runs in parallel when `USE_XSTATE` is enabled, allowing gradual migration.

## Dependencies

- `xstate@5.25.0` - State machine library
- `@xstate/react@6.0.0` - React bindings
