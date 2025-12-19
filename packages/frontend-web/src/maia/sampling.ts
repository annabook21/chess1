/**
 * Probabilistic Move Selection and Scoring
 * 
 * Implements proper statistical methods for:
 * 1. Temperature-based sampling from probability distributions
 * 2. Proper scoring rules (Brier, Log) for evaluating predictions
 * 
 * Based on research:
 * - Maia achieves 46-52% move-matching accuracy
 * - Proper scoring rules incentivize honest probability reporting
 * - Temperature controls exploration vs exploitation
 */

import type { MovePrediction } from './types';

/**
 * Sample a move from the probability distribution using temperature scaling.
 * 
 * Temperature effects:
 * - τ → 0: Always pick highest probability (deterministic)
 * - τ = 1: Sample according to true probabilities
 * - τ → ∞: Uniform random selection
 * 
 * @param predictions - Array of moves with probabilities (must sum to ≤ 1)
 * @param temperature - Temperature parameter (default 1.0 for true distribution)
 * @returns Selected move prediction
 */
export function sampleMove(
  predictions: MovePrediction[],
  temperature: number = 1.0
): MovePrediction | null {
  if (predictions.length === 0) return null;
  if (predictions.length === 1) return predictions[0];
  
  // Edge case: very low temperature = deterministic
  if (temperature < 0.01) {
    return predictions[0]; // Already sorted by probability
  }
  
  // Apply temperature scaling to probabilities
  // p_i' = exp(log(p_i) / τ) / Σ exp(log(p_j) / τ)
  const scaledProbs = predictions.map(p => {
    // Avoid log(0) by using a small epsilon
    const logProb = Math.log(Math.max(p.probability, 1e-10));
    return Math.exp(logProb / temperature);
  });
  
  // Normalize
  const sum = scaledProbs.reduce((a, b) => a + b, 0);
  const normalized = scaledProbs.map(p => p / sum);
  
  // Sample from cumulative distribution
  const random = Math.random();
  let cumulative = 0;
  
  for (let i = 0; i < predictions.length; i++) {
    cumulative += normalized[i];
    if (random <= cumulative) {
      return predictions[i];
    }
  }
  
  // Fallback (shouldn't happen due to normalization)
  return predictions[predictions.length - 1];
}

/**
 * Calculate the Brier score for a prediction.
 * 
 * Brier score = (1/N) Σ (p_i - o_i)²
 * Where p_i is predicted probability and o_i is 1 if outcome i occurred, else 0.
 * 
 * For single-outcome events:
 * - Perfect prediction (p=1 for correct): Score = 0
 * - Worst prediction (p=0 for correct): Score = 1
 * - Random guess: Score ≈ 0.5
 * 
 * Lower is better.
 * 
 * @param predictions - Array of predictions with probabilities
 * @param actualMove - The move that actually occurred (UCI)
 * @returns Brier score (0-1, lower is better)
 */
export function brierScore(
  predictions: MovePrediction[],
  actualMove: string
): number {
  let score = 0;
  
  for (const pred of predictions) {
    const outcome = pred.uci === actualMove ? 1 : 0;
    const error = pred.probability - outcome;
    score += error * error;
  }
  
  // The actual outcome might not be in our predictions (if topK < total moves)
  // In that case, we missed it entirely with 0% probability
  const foundActual = predictions.some(p => p.uci === actualMove);
  if (!foundActual) {
    // We gave 0% to the actual outcome, so error = (0 - 1)² = 1
    score += 1;
  }
  
  return score;
}

/**
 * Calculate the logarithmic score (log loss) for a prediction.
 * 
 * Log score = -log(p_actual)
 * 
 * Properties:
 * - Perfect prediction (p=1): Score = 0
 * - Worse predictions: Increasingly negative scores
 * - Heavily penalizes overconfident wrong predictions
 * 
 * We return the raw score (more negative = worse).
 * For UI, you might want to transform this.
 * 
 * @param predictions - Array of predictions with probabilities
 * @param actualMove - The move that actually occurred (UCI)
 * @returns Log score (more negative is worse)
 */
export function logScore(
  predictions: MovePrediction[],
  actualMove: string
): number {
  const actual = predictions.find(p => p.uci === actualMove);
  
  if (!actual) {
    // Move not in our predictions - worst case
    // Use a small epsilon to avoid -Infinity
    return -Math.log(0.001);
  }
  
  // Clamp probability to avoid log(0)
  const prob = Math.max(actual.probability, 0.001);
  return -Math.log(prob);
}

/**
 * Convert Brier score to reward points.
 * 
 * Maps Brier score (0-1, lower is better) to points (0-100, higher is better).
 * Uses a quadratic scaling to make good predictions more rewarding.
 * 
 * @param brierScore - Brier score (0-1)
 * @returns Points (0-100)
 */
export function brierToPoints(brierScore: number): number {
  // Perfect = 0 -> 100 points
  // Terrible = 1 -> 0 points
  // Use sqrt to make improvements near perfect more rewarding
  const normalized = 1 - Math.min(1, Math.max(0, brierScore));
  return Math.round(normalized * 100);
}

/**
 * Calculate points for a prediction based on whether user picked correctly
 * AND the probability of that move.
 * 
 * This rewards:
 * 1. Picking the correct move
 * 2. Picking moves with higher probability (even if wrong)
 * 
 * @param predictions - All predictions
 * @param userPick - The move the user predicted (UCI)
 * @param actualMove - The move that actually occurred (UCI)
 * @returns Points object with breakdown
 */
export function calculatePredictionReward(
  predictions: MovePrediction[],
  userPick: string,
  actualMove: string
): {
  basePoints: number;      // Points for correct/incorrect
  probabilityBonus: number; // Bonus for picking likely moves
  totalPoints: number;     // Total reward
  isCorrect: boolean;      // Did user pick correctly?
  actualProbability: number; // Probability of what actually happened
  pickProbability: number;  // Probability of user's pick
} {
  const isCorrect = userPick === actualMove;
  
  const actualPred = predictions.find(p => p.uci === actualMove);
  const pickPred = predictions.find(p => p.uci === userPick);
  
  const actualProbability = actualPred?.probability ?? 0;
  const pickProbability = pickPred?.probability ?? 0;
  
  // Base points: 50 for correct, 0 for incorrect
  const basePoints = isCorrect ? 50 : 0;
  
  // Probability bonus: up to 50 extra points based on how likely the actual move was
  // This rewards good calibration - if you pick a 60% move and it happens, 
  // you get more bonus than if you pick a 30% move that happens
  const probabilityBonus = isCorrect 
    ? Math.round(actualProbability * 50)  // Correct: bonus scales with probability
    : Math.round(pickProbability * 10);   // Wrong: small consolation for good reasoning
  
  return {
    basePoints,
    probabilityBonus,
    totalPoints: basePoints + probabilityBonus,
    isCorrect,
    actualProbability,
    pickProbability,
  };
}

/**
 * Recommended temperature values for different use cases
 */
export const TEMPERATURE_PRESETS = {
  /** Always pick the most likely move (deterministic) */
  deterministic: 0.1,
  /** Slightly favor top moves but allow variation */
  conservative: 0.7,
  /** True probability distribution */
  realistic: 1.0,
  /** More exploration, occasional surprises */
  exploratory: 1.3,
  /** Highly random, good for training data diversity */
  random: 2.0,
} as const;

/**
 * Get a human-readable description of prediction difficulty
 * based on the entropy of the probability distribution.
 * 
 * High entropy = many viable moves = harder to predict
 * Low entropy = one clear favorite = easier to predict
 */
export function getPredictionDifficulty(
  predictions: MovePrediction[]
): 'easy' | 'medium' | 'hard' {
  if (predictions.length === 0) return 'medium';
  
  // Calculate Shannon entropy: H = -Σ p_i * log(p_i)
  let entropy = 0;
  for (const pred of predictions) {
    if (pred.probability > 0) {
      entropy -= pred.probability * Math.log2(pred.probability);
    }
  }
  
  // Max entropy for N moves is log2(N) (uniform distribution)
  // For 5 moves: max entropy ≈ 2.32
  
  if (entropy < 1.0) return 'easy';    // One clear favorite
  if (entropy < 1.8) return 'medium';  // A few contenders
  return 'hard';                        // Many viable options
}



