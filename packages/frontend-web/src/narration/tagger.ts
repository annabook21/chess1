/**
 * Narration Tagger
 * Pure functions to derive narration tags from engine facts
 * 
 * This is deterministic and testable - no randomness or LLM calls.
 */

import { TaggerInput, TaggerOutput, NarrationTag } from './types';

// Re-export types for convenience
export type { TaggerInput, TaggerOutput, NarrationTag } from './types';

// Thresholds in centipawns
const THRESHOLDS = {
  BLUNDER: -200,      // Losing 2+ pawns worth
  MISTAKE: -100,      // Losing 1+ pawn worth  
  INACCURACY: -50,    // Losing half pawn
  GOOD: 50,           // Gaining half pawn
  GREAT: 150,         // Gaining 1.5+ pawns
  BRILLIANT: 300,     // Gaining 3+ pawns (sacrifices, etc.)
};

/** Calculate eval delta from perspective of player who moved */
export const calcEvalDelta = (
  evalBefore: number,
  evalAfter: number,
  isPlayerMove: boolean
): number => {
  const delta = evalAfter - evalBefore;
  // If it's opponent's move, flip the perspective
  return isPlayerMove ? delta : -delta;
};

/** Determine severity from eval delta */
export const getSeverity = (
  delta: number
): TaggerOutput['severity'] => {
  if (delta >= THRESHOLDS.GREAT) return 'great';
  if (delta >= THRESHOLDS.GOOD) return 'good';
  if (delta <= THRESHOLDS.BLUNDER) return 'terrible';
  if (delta <= THRESHOLDS.MISTAKE) return 'bad';
  return 'neutral';
};

/** Get primary tag based on eval delta and move properties */
export const getPrimaryTag = (
  input: TaggerInput,
  delta: number
): NarrationTag => {
  const { isCapture, isCheck, isMate, conceptTags } = input;
  
  // Check for mate first
  if (isMate) {
    return delta > 0 ? 'FOUND_BRILLIANT_MOVE' : 'BLUNDER_HANGS_MATE';
  }
  
  // Check for brilliant moves (sacrifices that work)
  if (delta >= THRESHOLDS.BRILLIANT) {
    if (isCapture) return 'FOUND_TACTIC';
    return 'FOUND_BRILLIANT_MOVE';
  }
  
  // Check for great moves
  if (delta >= THRESHOLDS.GREAT) {
    if (conceptTags?.includes('fork')) return 'TACTIC_FORK';
    if (conceptTags?.includes('pin')) return 'TACTIC_PIN';
    if (conceptTags?.includes('discovery')) return 'TACTIC_DISCOVERY';
    if (isCheck) return 'FOUND_MATE_THREAT';
    return 'FOUND_BEST_MOVE';
  }
  
  // Check for good moves
  if (delta >= THRESHOLDS.GOOD) {
    return 'FOUND_BEST_MOVE';
  }
  
  // Check for blunders
  if (delta <= THRESHOLDS.BLUNDER) {
    if (isCapture) return 'BLUNDER_HANGS_PIECE';
    return 'BLUNDER_POSITIONAL';
  }
  
  // Check for mistakes
  if (delta <= THRESHOLDS.MISTAKE) {
    return 'MISTAKE_MISSED_TACTIC';
  }
  
  // Check for inaccuracies
  if (delta <= THRESHOLDS.INACCURACY) {
    return 'INACCURACY_SUBOPTIMAL';
  }
  
  // Neutral move - check concept tags for flavor
  if (conceptTags?.includes('development')) return 'POS_IMPROVE_WORST_PIECE';
  if (conceptTags?.includes('center_control')) return 'POS_CONTROL_CENTER';
  if (conceptTags?.includes('king_safety')) return 'POS_KING_SAFETY';
  
  return 'FOUND_BEST_MOVE';
};

/** Get secondary tags based on context */
export const getSecondaryTags = (
  input: TaggerInput,
  _delta: number
): NarrationTag[] => {
  const tags: NarrationTag[] = [];
  const { conceptTags, isCheck, moveNumber } = input;
  
  // Add tactical themes from concept tags
  if (conceptTags?.includes('fork')) tags.push('TACTIC_FORK');
  if (conceptTags?.includes('pin')) tags.push('TACTIC_PIN');
  if (conceptTags?.includes('skewer')) tags.push('TACTIC_SKEWER');
  if (conceptTags?.includes('discovery')) tags.push('TACTIC_DISCOVERY');
  
  // Add positional themes
  if (conceptTags?.includes('development')) tags.push('POS_IMPROVE_WORST_PIECE');
  if (conceptTags?.includes('open_file')) tags.push('POS_OPEN_FILE');
  if (conceptTags?.includes('pawn_structure')) tags.push('POS_PAWN_STRUCTURE');
  
  // Check-related
  if (isCheck) tags.push('KING_SAFETY_CRACKED');
  
  // Opening vs endgame
  if (moveNumber <= 10) tags.push('OPENING_THEORY');
  if (moveNumber >= 30) tags.push('ENDGAME_CONVERSION');
  
  return tags;
};

/** Main tagger function - pure, deterministic */
export const tagMove = (input: TaggerInput): TaggerOutput => {
  const delta = calcEvalDelta(input.evalBefore, input.evalAfter, input.isPlayerMove);
  const severity = getSeverity(delta);
  const primaryTag = getPrimaryTag(input, delta);
  const secondaryTags = getSecondaryTags(input, delta);
  
  return {
    primaryTag,
    secondaryTags,
    evalDelta: delta,
    severity,
  };
};

export default tagMove;


