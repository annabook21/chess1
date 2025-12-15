/**
 * Maia Chess Engine Types
 * 
 * Type definitions for the browser-based Maia neural network inference.
 */

/** Maia rating level variants */
export type MaiaRating = 1100 | 1200 | 1300 | 1400 | 1500 | 1600 | 1700 | 1800 | 1900;

/** Move prediction with probability */
export interface MovePrediction {
  uci: string;       // e.g., "e2e4"
  san: string;       // e.g., "e4"
  from: string;      // e.g., "e2"
  to: string;        // e.g., "e4"
  probability: number; // 0.0 - 1.0
  promotion?: string; // e.g., "q" for queen
}

/** Result of running Maia inference */
export interface MaiaInferenceResult {
  predictions: MovePrediction[];
  modelRating: MaiaRating;
  inferenceTimeMs: number;
}

/** State of the Maia engine */
export interface MaiaEngineState {
  isLoading: boolean;
  isReady: boolean;
  currentModel: MaiaRating | null;
  error: string | null;
}

/** Configuration for Maia engine */
export interface MaiaConfig {
  /** Number of top moves to return */
  topK: number;
  /** Minimum probability threshold to include a move */
  minProbability: number;
  /** Default rating model to load */
  defaultRating: MaiaRating;
}

export const DEFAULT_MAIA_CONFIG: MaiaConfig = {
  topK: 5,
  minProbability: 0.01,
  defaultRating: 1500,
};

/**
 * Lc0 neural network input dimensions
 * - 112 input planes of 8x8 = 7168 values
 * - 104 planes: 8 time steps × 13 planes (12 pieces + 1 repetition)
 * - 8 auxiliary planes: castling (4), en passant (1), side to move (1), 50-move (1), ply (1)
 */
export const LC0_INPUT_PLANES = 112;
export const LC0_BOARD_SIZE = 8;
export const LC0_INPUT_SIZE = LC0_INPUT_PLANES * LC0_BOARD_SIZE * LC0_BOARD_SIZE; // 7168

/**
 * Lc0 policy output dimensions
 * - 1858 possible moves in Lc0 encoding
 */
export const LC0_POLICY_SIZE = 1858;
