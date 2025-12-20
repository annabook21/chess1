/**
 * XState Chess Game Machine Types
 * 
 * Consolidates all game state into a single typed context
 * and defines all possible events for the state machine.
 */

import type { TurnPackage, MoveResponse, MoveChoice, MoveFeedback } from '@master-academy/contracts';
import type { MovePrediction } from '../maia';

// ============================================================================
// ENUMS AND BASIC TYPES
// ============================================================================

/** Game end result */
export type GameEndState = 'victory' | 'defeat' | 'draw' | null;

/** Opponent type - AI Master (Bedrock/Stockfish) or Human-like (Maia) */
export type OpponentType = 'ai-master' | 'human-like';

/** Maia rating options */
export type MaiaRating = 1100 | 1200 | 1300 | 1400 | 1500 | 1600 | 1700 | 1800 | 1900;

/** Play mode - guided (master suggestions) or free (manual moves) */
export type PlayMode = 'guided' | 'free';

/** Player color */
export type PlayerColor = 'white' | 'black';

/** Celebration type */
export type CelebrationType = 'good' | 'great' | 'blunder' | 'predict' | null;

// ============================================================================
// PLAYER STATS
// ============================================================================

/** Gamification state - tracks player progress */
export interface PlayerStats {
  xp: number;
  level: number;
  streak: number;
  gamesPlayed: number;
  goodMoves: number;       // Moves better than engine suggestion
  blunders: number;        // Bad moves (delta <= -200)
  mistakes: number;        // Mistakes (delta between -100 and -200)
  totalMoves: number;      // All moves made
  accurateMoves: number;   // Moves within top-3 engine suggestions
  skillRating: number;     // Fluctuating rating (like chess.com)
  highestRating: number;   // Peak skill rating
}

/** Default player stats for new players */
export const DEFAULT_PLAYER_STATS: PlayerStats = {
  xp: 0,
  level: 1,
  streak: 1,
  gamesPlayed: 0,
  goodMoves: 0,
  blunders: 0,
  mistakes: 0,
  totalMoves: 0,
  accurateMoves: 0,
  skillRating: 1200,
  highestRating: 1200,
};

// ============================================================================
// PREDICTION STATE
// ============================================================================

/** Prediction result after user makes a prediction */
export interface PredictionResult {
  predicted: string;
  actual: string;
  correct: boolean;
  actualProbability?: number;
  pickProbability?: number;
  basePoints?: number;
  probabilityBonus?: number;
  totalPoints?: number;
}

/** Prediction stats tracked across games */
export interface PredictionStats {
  total: number;
  correct: number;
  streak: number;
}

// ============================================================================
// MOVE HISTORY
// ============================================================================

/** Single move entry in history */
export interface MoveHistoryEntry {
  moveNumber: number;
  white?: string;
  black?: string;
  eval?: number;
}

// ============================================================================
// GAME CONTEXT (State Machine Context)
// ============================================================================

/** 
 * Complete game context - single source of truth for all game state.
 * This replaces the 30+ useState hooks in App.tsx.
 */
export interface GameContext {
  // Core game state
  gameId: string | null;
  fen: string;
  sideToMove: 'w' | 'b';
  choices: MoveChoice[];
  
  // User interaction
  selectedChoice: string | null;
  hoveredChoice: MoveChoice | null;
  
  // Pending move data (prevents stale state bugs)
  pendingMove: {
    choice: { moveUci: string; id: string };
    turnPackage: TurnPackage;
  } | null;
  
  // Server response handling
  pendingResponse: MoveResponse | null;
  feedback: MoveFeedback | null;
  
  // Optimistic updates
  optimisticFen: string | null;
  pendingOpponentMoveUci: string | null;
  
  // Game settings
  opponentType: OpponentType;
  maiaOpponentRating: MaiaRating;
  playMode: PlayMode;
  playerColor: PlayerColor;
  
  // Prediction mode
  predictionEnabled: boolean;
  fenBeforeAiMove: string | null;
  predictionResult: PredictionResult | null;
  currentMaiaPredictions: MovePrediction[];
  predictionHover: { from: string | null; to: string | null };
  predictionStats: PredictionStats;
  
  // Game progress
  moveHistory: MoveHistoryEntry[];
  moveCounter: number;
  
  // Gamification
  playerStats: PlayerStats;
  celebration: CelebrationType;
  
  // Game end
  gameEndState: GameEndState;
  gameStats: {
    xpEarned: number;
    movesPlayed: number;
    accuracy: number;
  } | null;
  
  // UI state
  loading: boolean;
  error: string | null;
  illegalMoveMessage: string | null;
  
  // Settings panel
  showSettings: boolean;
  
  // FEN after player's move (before opponent responds)
  fenAfterPlayerMove: string | null;
}

/** Initial context values */
export const INITIAL_CONTEXT: GameContext = {
  // Core game state
  gameId: null,
  fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  sideToMove: 'w',
  choices: [],
  
  // User interaction
  selectedChoice: null,
  hoveredChoice: null,
  
  // Pending move data
  pendingMove: null,
  
  // Server response handling
  pendingResponse: null,
  feedback: null,
  
  // Optimistic updates
  optimisticFen: null,
  pendingOpponentMoveUci: null,
  
  // Game settings (will be loaded from localStorage)
  opponentType: 'ai-master',
  maiaOpponentRating: 1500,
  playMode: 'guided',
  playerColor: 'white',
  
  // Prediction mode
  predictionEnabled: true,
  fenBeforeAiMove: null,
  predictionResult: null,
  currentMaiaPredictions: [],
  predictionHover: { from: null, to: null },
  predictionStats: { total: 0, correct: 0, streak: 0 },
  
  // Game progress
  moveHistory: [],
  moveCounter: 1,
  
  // Gamification
  playerStats: DEFAULT_PLAYER_STATS,
  celebration: null,
  
  // Game end
  gameEndState: null,
  gameStats: null,
  
  // UI state
  loading: false,
  error: null,
  illegalMoveMessage: null,
  
  // Settings panel
  showSettings: false,
  
  // FEN after player's move
  fenAfterPlayerMove: null,
};

// ============================================================================
// EVENTS (All possible state machine events)
// ============================================================================

/** Start a new game */
export type StartGameEvent = {
  type: 'START_GAME';
};

/** Game successfully created */
export type GameCreatedEvent = {
  type: 'GAME_CREATED';
  gameId: string;
  turnPackage: TurnPackage;
};

/** Game creation failed */
export type GameCreateFailedEvent = {
  type: 'GAME_CREATE_FAILED';
  error: string;
};

/** Select a move choice */
export type SelectChoiceEvent = {
  type: 'SELECT_CHOICE';
  choiceId: string;
};

/** Hover over a move choice */
export type HoverChoiceEvent = {
  type: 'HOVER_CHOICE';
  choice: MoveChoice | null;
};

/** Submit the selected move */
export type SubmitMoveEvent = {
  type: 'SUBMIT_MOVE';
  choiceId: string;
};

/** Move submitted successfully */
export type MoveSubmittedEvent = {
  type: 'MOVE_SUBMITTED';
  response: MoveResponse;
  fenAfterMove: string;
};

/** Move submission failed */
export type MoveFailedEvent = {
  type: 'MOVE_FAILED';
  error: string;
};

/** Show prediction UI */
export type ShowPredictionEvent = {
  type: 'SHOW_PREDICTION';
  fenBeforeAiMove: string;
  maiaPredictions: MovePrediction[];
};

/** User submits a prediction */
export type SubmitPredictionEvent = {
  type: 'SUBMIT_PREDICTION';
  predictedMoveUci: string;
};

/** User skips prediction */
export type SkipPredictionEvent = {
  type: 'SKIP_PREDICTION';
};

/** Prediction phase complete */
export type PredictionCompleteEvent = {
  type: 'PREDICTION_COMPLETE';
  result?: PredictionResult;
};

/** Maia move generation complete */
export type MaiaMoveReadyEvent = {
  type: 'MAIA_MOVE_READY';
  moveUci: string;
  moveSan: string;
  probability: number;
};

/** Maia move generation failed */
export type MaiaMoveFailedEvent = {
  type: 'MAIA_MOVE_FAILED';
  error: string;
};

/** Maia predictions ready (for prediction UI) */
export type MaiaPredictionsReadyEvent = {
  type: 'MAIA_PREDICTIONS_READY';
  predictions: MovePrediction[];
};

/** Hover over a prediction (for arrow display) */
export type HoverPredictionEvent = {
  type: 'HOVER_PREDICTION';
  from: string | null;
  to: string | null;
};

/** Apply opponent's move to the board */
export type ApplyOpponentMoveEvent = {
  type: 'APPLY_OPPONENT_MOVE';
  moveUci: string;
  moveSan: string;
  newFen: string;
};

/** Game ended (checkmate, stalemate, etc.) */
export type GameEndEvent = {
  type: 'GAME_END';
  result: GameEndState;
  stats: { xpEarned: number; movesPlayed: number; accuracy: number };
};

/** Start a new game after game over */
export type NewGameEvent = {
  type: 'NEW_GAME';
};

/** Retry after error */
export type RetryEvent = {
  type: 'RETRY';
};

/** Update settings */
export type UpdateSettingsEvent = {
  type: 'UPDATE_SETTINGS';
  settings: Partial<{
    opponentType: OpponentType;
    maiaOpponentRating: MaiaRating;
    playMode: PlayMode;
    playerColor: PlayerColor;
    predictionEnabled: boolean;
  }>;
};

/** Toggle settings panel */
export type ToggleSettingsEvent = {
  type: 'TOGGLE_SETTINGS';
};

/** Show celebration */
export type CelebrateEvent = {
  type: 'CELEBRATE';
  celebrationType: CelebrationType;
};

/** Clear celebration */
export type ClearCelebrationEvent = {
  type: 'CLEAR_CELEBRATION';
};

/** Illegal move attempted */
export type IllegalMoveEvent = {
  type: 'ILLEGAL_MOVE';
  message: string;
};

/** Clear error/illegal move message */
export type ClearErrorEvent = {
  type: 'CLEAR_ERROR';
};

/** Free play move (drag and drop) */
export type FreePlayMoveEvent = {
  type: 'FREE_PLAY_MOVE';
  from: string;
  to: string;
  promotion?: string;
};

/** Union of all events */
export type GameEvent =
  | StartGameEvent
  | GameCreatedEvent
  | GameCreateFailedEvent
  | SelectChoiceEvent
  | HoverChoiceEvent
  | SubmitMoveEvent
  | MoveSubmittedEvent
  | MoveFailedEvent
  | ShowPredictionEvent
  | SubmitPredictionEvent
  | SkipPredictionEvent
  | PredictionCompleteEvent
  | MaiaMoveReadyEvent
  | MaiaMoveFailedEvent
  | MaiaPredictionsReadyEvent
  | HoverPredictionEvent
  | ApplyOpponentMoveEvent
  | GameEndEvent
  | NewGameEvent
  | RetryEvent
  | UpdateSettingsEvent
  | ToggleSettingsEvent
  | CelebrateEvent
  | ClearCelebrationEvent
  | IllegalMoveEvent
  | ClearErrorEvent
  | FreePlayMoveEvent;
