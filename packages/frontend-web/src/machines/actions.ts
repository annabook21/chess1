/**
 * XState Chess Game Actions
 * 
 * Complex action helpers for the game state machine.
 * Simple actions are defined inline in gameMachine.ts.
 */

import { Chess } from 'chess.js';
import type { 
  GameContext, 
  PlayerStats, 
  MoveHistoryEntry,
  PredictionResult,
  PredictionStats,
} from './types';
import type { MoveResponse, MoveFeedback } from '@master-academy/contracts';

// ============================================================================
// PLAYER STATS UPDATES
// ============================================================================

/**
 * Calculate XP reward based on move quality
 */
export function calculateMoveXp(feedback: MoveFeedback): number {
  const delta = feedback.evalAfter - feedback.evalBefore;
  
  // Base XP for making a move
  let xp = 5;
  
  // Bonus/penalty based on move quality
  if (delta >= 100) {
    xp += 25; // Great move
  } else if (delta >= 50) {
    xp += 15; // Good move
  } else if (delta >= 0) {
    xp += 10; // Decent move
  } else if (delta >= -50) {
    xp += 5; // Slight inaccuracy
  } else if (delta >= -100) {
    xp += 0; // Inaccuracy
  } else if (delta >= -200) {
    xp -= 5; // Mistake
  } else {
    xp -= 10; // Blunder
  }
  
  return Math.max(0, xp);
}

/**
 * Update player stats after a move
 */
export function updatePlayerStatsAfterMove(
  stats: PlayerStats,
  feedback: MoveFeedback
): PlayerStats {
  const delta = feedback.evalAfter - feedback.evalBefore;
  const xpGained = calculateMoveXp(feedback);
  
  const newStats: PlayerStats = {
    ...stats,
    xp: stats.xp + xpGained,
    totalMoves: stats.totalMoves + 1,
  };
  
  // Classify move quality
  if (delta >= 50) {
    newStats.goodMoves++;
    newStats.accurateMoves++;
  } else if (delta >= -50) {
    newStats.accurateMoves++;
  } else if (delta <= -200) {
    newStats.blunders++;
  } else if (delta <= -100) {
    newStats.mistakes++;
  }
  
  // Update skill rating (simplified ELO-like system)
  const ratingChange = Math.round(delta / 10);
  newStats.skillRating = Math.max(100, newStats.skillRating + ratingChange);
  newStats.highestRating = Math.max(newStats.highestRating, newStats.skillRating);
  
  // Level up check
  const xpForNextLevel = newStats.level * 100;
  if (newStats.xp >= xpForNextLevel) {
    newStats.level++;
    newStats.xp -= xpForNextLevel;
  }
  
  return newStats;
}

/**
 * Update player stats after game end
 */
export function updatePlayerStatsAfterGame(
  stats: PlayerStats,
  won: boolean,
  wasCheckmate: boolean
): PlayerStats {
  const newStats: PlayerStats = {
    ...stats,
    gamesPlayed: stats.gamesPlayed + 1,
  };
  
  // Bonus XP for winning
  if (won) {
    newStats.xp += 50;
    if (wasCheckmate) {
      newStats.xp += 25; // Extra for checkmate
    }
    newStats.skillRating += 15;
    newStats.streak++;
  } else {
    newStats.skillRating = Math.max(100, newStats.skillRating - 10);
    newStats.streak = 0;
  }
  
  newStats.highestRating = Math.max(newStats.highestRating, newStats.skillRating);
  
  return newStats;
}

// ============================================================================
// PREDICTION SCORING
// ============================================================================

/**
 * Calculate prediction result based on Maia probabilities
 */
export function calculatePredictionResult(
  predictedMoveUci: string,
  actualMoveUci: string,
  predictions: Array<{ uci: string; probability: number }>
): PredictionResult {
  const isCorrect = predictedMoveUci.slice(2, 4) === actualMoveUci.slice(2, 4);
  
  // Find probabilities
  const actualPred = predictions.find(p => p.uci === actualMoveUci);
  const pickPred = predictions.find(p => p.uci === predictedMoveUci);
  
  const actualProbability = actualPred?.probability || 0;
  const pickProbability = pickPred?.probability || 0;
  
  // Calculate points
  const basePoints = isCorrect ? 50 : 0;
  
  // Bonus for predicting unlikely moves correctly
  let probabilityBonus = 0;
  if (isCorrect && actualProbability < 0.2) {
    probabilityBonus = Math.round((1 - actualProbability) * 30);
  }
  
  return {
    predicted: predictedMoveUci,
    actual: actualMoveUci,
    correct: isCorrect,
    actualProbability,
    pickProbability,
    basePoints,
    probabilityBonus,
    totalPoints: basePoints + probabilityBonus,
  };
}

/**
 * Update prediction stats
 */
export function updatePredictionStats(
  stats: PredictionStats,
  wasCorrect: boolean
): PredictionStats {
  return {
    total: stats.total + 1,
    correct: wasCorrect ? stats.correct + 1 : stats.correct,
    streak: wasCorrect ? stats.streak + 1 : 0,
  };
}

// ============================================================================
// MOVE HISTORY
// ============================================================================

/**
 * Add a move to history
 */
export function addMoveToHistory(
  history: MoveHistoryEntry[],
  san: string,
  isWhiteMove: boolean,
  evaluation?: number
): MoveHistoryEntry[] {
  const newHistory = [...history];
  
  if (isWhiteMove) {
    // White's move - new entry
    newHistory.push({
      moveNumber: newHistory.length + 1,
      white: san,
      eval: evaluation,
    });
  } else {
    // Black's move - add to last entry or create new one
    if (newHistory.length > 0 && newHistory[newHistory.length - 1].white) {
      newHistory[newHistory.length - 1].black = san;
      if (evaluation !== undefined) {
        newHistory[newHistory.length - 1].eval = evaluation;
      }
    } else {
      newHistory.push({
        moveNumber: newHistory.length + 1,
        black: san,
        eval: evaluation,
      });
    }
  }
  
  return newHistory;
}

// ============================================================================
// GAME STATE HELPERS
// ============================================================================

/**
 * Determine game end state from current position
 */
export function getGameEndState(
  fen: string,
  playerColor: 'white' | 'black'
): { state: GameContext['gameEndState']; reason: string } | null {
  try {
    const chess = new Chess(fen);
    
    if (chess.isCheckmate()) {
      // The side to move is in checkmate (they lost)
      const loserIsWhite = chess.turn() === 'w';
      const playerLost = (playerColor === 'white') === loserIsWhite;
      
      return {
        state: playerLost ? 'defeat' : 'victory',
        reason: 'checkmate',
      };
    }
    
    if (chess.isStalemate()) {
      return { state: 'draw', reason: 'stalemate' };
    }
    
    if (chess.isDraw()) {
      return { state: 'draw', reason: 'draw by repetition or insufficient material' };
    }
    
    return null;
  } catch {
    return null;
  }
}

/**
 * Check if position has check
 */
export function isInCheck(fen: string): boolean {
  try {
    const chess = new Chess(fen);
    return chess.inCheck();
  } catch {
    return false;
  }
}

/**
 * Get current turn from FEN
 */
export function getTurnFromFen(fen: string): 'w' | 'b' {
  try {
    const chess = new Chess(fen);
    return chess.turn();
  } catch {
    return 'w';
  }
}

// ============================================================================
// LOCALSTORAGE HELPERS
// ============================================================================

const STORAGE_KEYS = {
  opponentType: 'qfg_opponentType',
  maiaRating: 'qfg_maiaRating',
  playMode: 'qfg_playMode',
  playerColor: 'qfg_playerColor',
  predictionEnabled: 'masterAcademy_predictionEnabled',
  predictionStats: 'masterAcademy_predictions',
  playerStats: 'masterAcademy_stats_v2',
} as const;

/**
 * Load a value from localStorage with fallback
 */
export function loadFromStorage<T>(key: keyof typeof STORAGE_KEYS, fallback: T): T {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS[key]);
    if (!stored) return fallback;
    
    // Handle boolean and object types
    if (typeof fallback === 'boolean' || typeof fallback === 'object') {
      return JSON.parse(stored);
    }
    
    // Handle number types
    if (typeof fallback === 'number') {
      return parseInt(stored, 10) as T;
    }
    
    return stored as T;
  } catch {
    return fallback;
  }
}

/**
 * Save a value to localStorage
 */
export function saveToStorage<T>(key: keyof typeof STORAGE_KEYS, value: T): void {
  try {
    const stringValue = typeof value === 'object' 
      ? JSON.stringify(value) 
      : String(value);
    localStorage.setItem(STORAGE_KEYS[key], stringValue);
  } catch (e) {
    console.error(`Failed to save ${key} to localStorage:`, e);
  }
}
