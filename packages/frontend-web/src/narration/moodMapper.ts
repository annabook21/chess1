/**
 * Mood Mapper
 * Maps narration tags to Spirit moods for visual expression
 * Pure functions, easily testable
 */

import { NarrationTag, TaggerOutput } from './types';
import { SpiritMood } from '../ui/castle/SpiritPortrait';

/**
 * Map a primary narration tag to the Spirit's mood
 */
export const tagToMood = (tag: NarrationTag): SpiritMood => {
  // Blunders and mistakes - Spirit is disappointed/dismayed
  if (tag.startsWith('BLUNDER_')) {
    return 'dismayed';
  }
  if (tag.startsWith('MISTAKE_') || tag === 'INACCURACY_SUBOPTIMAL') {
    return 'concerned';
  }

  // Great moves - Spirit is impressed
  if (tag === 'FOUND_BRILLIANT_MOVE' || tag === 'FOUND_MATE_THREAT') {
    return 'impressed';
  }
  if (tag === 'FOUND_BEST_MOVE' || tag === 'FOUND_ONLY_MOVE') {
    return 'pleased';
  }
  if (tag === 'FOUND_TACTIC') {
    return 'impressed';
  }

  // Tactical themes - Spirit is excited
  if (tag.startsWith('TACTIC_')) {
    return 'excited';
  }

  // Positional themes - Spirit is thoughtful/neutral
  if (tag.startsWith('POS_')) {
    return 'thinking';
  }

  // King safety - Spirit is concerned
  if (tag === 'KING_SAFETY_CRACKED') {
    return 'concerned';
  }

  // Material changes
  if (tag === 'MATERIAL_ADVANTAGE') {
    return 'pleased';
  }
  if (tag === 'MATERIAL_DISADVANTAGE') {
    return 'concerned';
  }

  // Predictions
  if (tag === 'PREDICTION_CORRECT') {
    return 'excited';
  }
  if (tag === 'PREDICTION_WRONG') {
    return 'concerned';
  }
  if (tag === 'PREDICTION_CLOSE') {
    return 'thinking';
  }

  // Endgame and opening - neutral/thinking
  if (tag === 'ENDGAME_CONVERSION' || tag === 'OPENING_THEORY') {
    return 'thinking';
  }

  return 'neutral';
};

/**
 * Map tagger output to Spirit mood based on severity and tag
 */
export const taggerOutputToMood = (output: TaggerOutput): SpiritMood => {
  // First check severity for strong signals
  switch (output.severity) {
    case 'terrible':
      return 'dismayed';
    case 'bad':
      return 'concerned';
    case 'great':
      return 'impressed';
    case 'good':
      return 'pleased';
    default:
      // Fall back to tag-based mood
      return tagToMood(output.primaryTag);
  }
};

/**
 * Map eval delta to mood intensity modifier
 * Returns a value from 0-1 indicating how intense the mood should be
 */
export const evalDeltaToIntensity = (delta: number): number => {
  const absDelta = Math.abs(delta);
  
  if (absDelta >= 300) return 1.0;    // Huge swing
  if (absDelta >= 200) return 0.85;   // Major
  if (absDelta >= 100) return 0.7;    // Significant
  if (absDelta >= 50) return 0.5;     // Notable
  if (absDelta >= 20) return 0.3;     // Minor
  return 0.1;                          // Negligible
};

/**
 * Determine if the Spirit should speak for this move
 * Some moves are too routine to comment on
 */
export const shouldNarrate = (output: TaggerOutput): boolean => {
  // Always narrate significant moves
  if (output.severity !== 'neutral') {
    return true;
  }
  
  // Always narrate tactics
  if (output.primaryTag.startsWith('TACTIC_')) {
    return true;
  }
  
  // Narrate blunders and great finds
  if (
    output.primaryTag.startsWith('BLUNDER_') ||
    output.primaryTag.startsWith('FOUND_')
  ) {
    return true;
  }
  
  // Skip routine positional moves sometimes
  const routineChance = 0.3;
  if (output.primaryTag.startsWith('POS_')) {
    return Math.random() < routineChance;
  }
  
  // Narrate predictions
  if (output.primaryTag.startsWith('PREDICTION_')) {
    return true;
  }
  
  // Default: narrate ~50% of neutral moves
  return Math.random() < 0.5;
};

/**
 * Get a mood-appropriate animation class suffix
 */
export const getMoodAnimation = (mood: SpiritMood): string => {
  switch (mood) {
    case 'impressed':
    case 'excited':
      return 'glow';
    case 'dismayed':
      return 'shake';
    case 'concerned':
      return 'worry';
    case 'pleased':
      return 'nod';
    case 'thinking':
      return 'ponder';
    default:
      return 'idle';
  }
};


