/**
 * Lichess-style Accuracy Calculation
 * 
 * Based on Lichess's open-source implementation:
 * - Converts centipawn evaluations to win probabilities
 * - Calculates per-move accuracy based on win% change
 * - Uses harmonic mean for overall game accuracy
 * 
 * @see https://lichess.org/page/accuracy
 * @see https://gist.github.com/benediktwerner/28be8cf244b51192a39f8e7c7004a77a
 */

// Lichess formula constants
const WIN_RATE_COEFFICIENT = 0.00368208;
const ACCURACY_SCALE = 103.1668;
const ACCURACY_DECAY = 0.04354;
const ACCURACY_OFFSET = 3.1669;

/**
 * Convert centipawn evaluation to win probability percentage (0-100)
 * Uses Lichess's sigmoid function
 * 
 * Formula: Win% = 50 + 50 * (2 / (1 + exp(-0.00368208 * centipawns)) - 1)
 * 
 * @param centipawns - Engine evaluation in centipawns (positive = white advantage)
 * @returns Win probability as percentage (0-100)
 */
export function centipawnToWinPercent(centipawns: number): number {
  // Clamp extreme values to prevent numerical issues
  const clampedCp = Math.max(-1000, Math.min(1000, centipawns));
  
  const winRate = 50 + 50 * (2 / (1 + Math.exp(-WIN_RATE_COEFFICIENT * clampedCp)) - 1);
  
  return winRate;
}

/**
 * Calculate move accuracy based on win percentage change
 * 
 * Formula: Accuracy% = 103.1668 * exp(-0.04354 * winPercentLost) - 3.1669
 * 
 * @param winPercentBefore - Win probability before the move (0-100)
 * @param winPercentAfter - Win probability after the move (0-100)
 * @returns Accuracy percentage (0-100, clamped)
 */
export function calculateMoveAccuracy(winPercentBefore: number, winPercentAfter: number): number {
  const winPercentLost = Math.max(0, winPercentBefore - winPercentAfter);
  
  const rawAccuracy = ACCURACY_SCALE * Math.exp(-ACCURACY_DECAY * winPercentLost) - ACCURACY_OFFSET;
  
  // Clamp to 0-100 range
  return Math.max(0, Math.min(100, rawAccuracy));
}

/**
 * Calculate move accuracy from centipawn evaluations
 * Convenience function that combines conversion and calculation
 * 
 * @param cpBefore - Centipawn evaluation before move
 * @param cpAfter - Centipawn evaluation after move
 * @param isBlackToMove - Whether it's Black's move (flips perspective)
 * @returns Accuracy percentage (0-100)
 */
export function calculateAccuracyFromCentipawns(
  cpBefore: number,
  cpAfter: number,
  isBlackToMove: boolean = false
): number {
  // Flip perspective for Black (their advantage is negative cp)
  const adjustedBefore = isBlackToMove ? -cpBefore : cpBefore;
  const adjustedAfter = isBlackToMove ? -cpAfter : cpAfter;
  
  const winBefore = centipawnToWinPercent(adjustedBefore);
  const winAfter = centipawnToWinPercent(adjustedAfter);
  
  return calculateMoveAccuracy(winBefore, winAfter);
}

/**
 * Calculate overall accuracy using harmonic mean
 * Lichess uses harmonic mean to give more weight to poor moves
 * 
 * @param moveAccuracies - Array of per-move accuracy percentages
 * @returns Overall accuracy percentage
 */
export function calculateOverallAccuracy(moveAccuracies: number[]): number {
  if (moveAccuracies.length === 0) return 0;
  
  // Filter out zero values (harmonic mean undefined for 0)
  const validAccuracies = moveAccuracies.filter(a => a > 0);
  
  if (validAccuracies.length === 0) return 0;
  
  // Harmonic mean: n / (1/x1 + 1/x2 + ... + 1/xn)
  const sumOfReciprocals = validAccuracies.reduce((sum, acc) => sum + (1 / acc), 0);
  const harmonicMean = validAccuracies.length / sumOfReciprocals;
  
  return Math.round(harmonicMean);
}

/**
 * Classify move quality based on accuracy percentage
 * This replaces the centipawn-based classification with accuracy-based
 * 
 * @param accuracy - Move accuracy percentage (0-100)
 * @param wasBestMove - Whether this was the engine's top choice
 * @returns Move quality classification
 */
export function getQualityFromAccuracy(
  accuracy: number,
  wasBestMove: boolean
): 'brilliant' | 'great' | 'good' | 'book' | 'inaccuracy' | 'mistake' | 'blunder' {
  // Brilliant: Best move that significantly improves position (accuracy > 100 possible in theory)
  if (wasBestMove && accuracy >= 99) return 'brilliant';
  
  // Based on typical accuracy ranges:
  // - Elite players: 90-100%
  // - Strong players: 80-90%
  // - Club players: 60-80%
  // - Beginners: < 60%
  
  if (accuracy >= 95) return 'great';
  if (accuracy >= 80) return 'good';
  if (accuracy >= 60) return 'book';
  if (accuracy >= 40) return 'inaccuracy';
  if (accuracy >= 20) return 'mistake';
  return 'blunder';
}

/**
 * Get descriptive text for accuracy level
 */
export function getAccuracyDescription(accuracy: number): string {
  if (accuracy >= 95) return 'Excellent';
  if (accuracy >= 85) return 'Very Good';
  if (accuracy >= 75) return 'Good';
  if (accuracy >= 60) return 'Average';
  if (accuracy >= 45) return 'Below Average';
  return 'Needs Work';
}

/**
 * Get color for accuracy level (for UI)
 */
export function getAccuracyColor(accuracy: number): string {
  if (accuracy >= 90) return '#4caf50'; // Green
  if (accuracy >= 75) return '#8bc34a'; // Light green
  if (accuracy >= 60) return '#ffeb3b'; // Yellow
  if (accuracy >= 45) return '#ff9800'; // Orange
  return '#f44336'; // Red
}

/**
 * Calculate accuracy difference between best move and played move
 * Useful for understanding how much a suboptimal move cost
 * 
 * @param bestMoveEval - Centipawn eval of best move
 * @param playedMoveEval - Centipawn eval of played move
 * @param positionEval - Centipawn eval of current position
 * @returns Accuracy loss (0-100, how much worse than optimal)
 */
export function calculateAccuracyLoss(
  bestMoveEval: number,
  playedMoveEval: number,
  positionEval: number
): number {
  const bestWinPercent = centipawnToWinPercent(bestMoveEval);
  const playedWinPercent = centipawnToWinPercent(playedMoveEval);
  
  const bestAccuracy = calculateMoveAccuracy(
    centipawnToWinPercent(positionEval),
    bestWinPercent
  );
  
  const playedAccuracy = calculateMoveAccuracy(
    centipawnToWinPercent(positionEval),
    playedWinPercent
  );
  
  return Math.max(0, bestAccuracy - playedAccuracy);
}
