/**
 * Achievement System Types
 * Event-driven achievement tracking with incremental progress
 */

// ============================================================================
// Achievement Definition Types (mirrored from contracts for independence)
// ============================================================================

export type AchievementRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export type AchievementTrigger =
  | { type: 'games_played'; count: number }
  | { type: 'prediction_streak'; count: number }
  | { type: 'best_moves_found'; count: number }
  | { type: 'tactics_found'; count: number }
  | { type: 'brilliant_moves'; count: number }
  | { type: 'accuracy_threshold'; percentage: number }
  | { type: 'rating_reached'; rating: number }
  | { type: 'specific_opening'; openingName: string }
  | { type: 'comeback_win'; evalThreshold: number }
  | { type: 'perfect_game'; noBlunders: boolean; noMistakes: boolean };

export interface Achievement {
  id: string;
  name: string;
  flavorText: string;
  description: string;
  trigger: AchievementTrigger;
  rarity: AchievementRarity;
  iconKey: string;
  xpReward: number;
  roomUnlock?: string;
}

// ============================================================================
// Event Types
// ============================================================================

/** Events that can trigger achievement progress */
export type AchievementEvent =
  | { type: 'GAME_COMPLETED'; won: boolean; accuracy: number; blunders: number; mistakes: number }
  | { type: 'MOVE_PLAYED'; isBestMove: boolean; isBrilliant: boolean; isTactic: boolean; tacticType?: string }
  | { type: 'PREDICTION_MADE'; correct: boolean; streak: number }
  | { type: 'RATING_CHANGED'; newRating: number; oldRating: number }
  | { type: 'COMEBACK_WIN'; evalDeficit: number }
  | { type: 'OPENING_PLAYED'; openingName: string };

/** Player statistics tracked for achievements */
export interface PlayerStats {
  gamesPlayed: number;
  gamesWon: number;
  currentPredictionStreak: number;
  maxPredictionStreak: number;
  bestMovesFound: number;
  tacticsFound: number;
  brilliantMoves: number;
  perfectGames: number;
  currentRating: number;
  peakRating: number;
  comebackWins: number;
  openingsPlayed: Record<string, number>;
}

/** Progress for a single achievement */
export interface AchievementProgress {
  achievementId: string;
  currentValue: number;
  targetValue: number;
  completed: boolean;
  completedAt?: string;
  // For display
  percentComplete: number;
  displayText: string;
}

/** Result of processing an event */
export interface AchievementUpdateResult {
  updatedProgress: AchievementProgress[];
  newlyCompleted: AchievementProgress[];
  statsChanged: Partial<PlayerStats>;
}

/** Storage interface for persistence */
export interface AchievementStore {
  stats: PlayerStats;
  progress: Map<string, AchievementProgress>;
  completedIds: Set<string>;
}

/** Default initial stats */
export const DEFAULT_PLAYER_STATS: PlayerStats = {
  gamesPlayed: 0,
  gamesWon: 0,
  currentPredictionStreak: 0,
  maxPredictionStreak: 0,
  bestMovesFound: 0,
  tacticsFound: 0,
  brilliantMoves: 0,
  perfectGames: 0,
  currentRating: 1200,
  peakRating: 1200,
  comebackWins: 0,
  openingsPlayed: {},
};





