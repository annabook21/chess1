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
 * Calculate difficulty based on user skill level and turn number.
 *
 * Adaptive difficulty based on chess pedagogy research:
 * - Beginners (800-1200): Face easier engine (-200 to -300 ELO) to build confidence
 * - Intermediate (1200-1800): Face matched engine (-100 to +100 ELO)
 * - Advanced (1800+): Face challenging engine (+100 to +300 ELO)
 * - First 10 moves: Reduce difficulty by 100 to teach opening principles
 */
export function calculateDifficulty(userElo: number, turnNumber: number = 0): DifficultyParams {
  // Adaptive difficulty based on skill level
  let eloDelta = 0;

  if (userElo < 1000) {
    // Beginners: play against easier engine to build confidence
    eloDelta = -250;
  } else if (userElo < 1200) {
    // Low intermediate: slightly easier
    eloDelta = -150;
  } else if (userElo < 1400) {
    // Intermediate: slightly easier
    eloDelta = -100;
  } else if (userElo < 1600) {
    // Upper intermediate: matched
    eloDelta = -50;
  } else if (userElo < 1800) {
    // Advanced: slight challenge
    eloDelta = 0;
  } else if (userElo < 2000) {
    // Expert: challenging
    eloDelta = +100;
  } else {
    // Master: very challenging
    eloDelta = +200;
  }

  // First 10 moves: reduce difficulty to teach opening principles
  if (turnNumber < 10) {
    eloDelta -= 100;
  }

  const engineElo = Math.min(3000, Math.max(800, userElo + eloDelta));

  // Hint level: 1 = minimal, 2 = moderate, 3 = obvious
  // Lower skill = more hints
  const hintLevel = userElo < 1000 ? 3 : userElo < 1600 ? 2 : 1;

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

