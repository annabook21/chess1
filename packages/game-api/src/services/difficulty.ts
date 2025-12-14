/**
 * Difficulty Scaling
 * 
 * Pure functions for calculating difficulty parameters
 */

export interface DifficultyParams {
  engineElo: number;
  hintLevel: number;
}

/**
 * Calculate difficulty based on user skill level
 */
export function calculateDifficulty(userElo: number): DifficultyParams {
  // Engine plays slightly above user level to provide challenge
  const engineElo = Math.min(3000, Math.max(800, userElo + 100));
  
  // Hint level: 0 = no hints, 5 = very obvious
  // Lower skill = more hints
  const hintLevel = userElo < 1200 ? 3 : userElo < 1600 ? 2 : 1;

  return { engineElo, hintLevel };
}

/**
 * Calculate time budget for a move
 */
export function calculateTimeBudget(difficulty: DifficultyParams, moveNumber: number): number {
  // Opening: more time, endgame: less time
  const baseTime = moveNumber < 20 ? 30000 : moveNumber < 40 ? 20000 : 15000;
  
  // Adjust for difficulty
  const adjustedTime = baseTime * (1 + (difficulty.hintLevel * 0.1));
  
  return Math.round(adjustedTime);
}

