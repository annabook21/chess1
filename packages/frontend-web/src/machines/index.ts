/**
 * XState Chess Game Machines
 * 
 * Central export for all state machine related code.
 */

// Main state machine
export { gameMachine, type GameMachine } from './gameMachine';

// React hook
export { useGameMachine, type UseGameMachine } from './useGameMachine';

// React provider for gradual migration
export { 
  GameMachineProvider, 
  useGameMachineContext, 
  useOptionalGameMachine,
  USE_XSTATE,
} from './GameProvider';

// Maia bridge for connecting state machine to neural network
export { MaiaBridge, useMaiaBridge } from './MaiaBridge';

// Narration bridge for connecting state machine to narration system
export { NarrationBridge } from './NarrationBridge';

// Types
export type {
  GameContext,
  GameEvent,
  GameEndState,
  OpponentType,
  MaiaRating,
  PlayMode,
  PlayerColor,
  CelebrationType,
  PlayerStats,
  PredictionResult,
  PredictionStats,
  MoveHistoryEntry,
} from './types';

export { INITIAL_CONTEXT, DEFAULT_PLAYER_STATS } from './types';

// Actors (fromPromise services)
export {
  createGameActor,
  submitMoveActor,
  fetchTurnActor,
  generateChoicesActor,
  applyMove,
  getRandomLegalMove,
  isMoveLegal,
  getLegalMoves,
  buildChoicesFromFen,
  checkGameOver,
  getGameEndState,
  type CreateGameInput,
  type CreateGameOutput,
  type SubmitMoveInput,
  type SubmitMoveOutput,
  type FetchTurnInput,
  type GenerateChoicesInput,
} from './actors';

// Legacy services (for backwards compatibility)
export {
  createGameService,
  submitMoveService,
  fetchTurnService,
  generateMaiaMoveService,
  buildChoicesFromLegalMoves,
  type MaiaMoveResult,
  type MaiaMoveParams,
} from './services';

// Actions
export {
  calculateMoveXp,
  updatePlayerStatsAfterMove,
  updatePlayerStatsAfterGame,
  calculatePredictionResult,
  updatePredictionStats,
  addMoveToHistory,
  isInCheck,
  getTurnFromFen,
  loadFromStorage,
  saveToStorage,
} from './actions';
