/**
 * Narrator
 * Main narration engine - selects templates and interpolates variables
 */

import { NarrationContext, NarrationResult, TemplateVars, NarrationTag } from './types';
import { selectTemplate, generateSeed } from './templateLoader';

const PIECE_NAMES: Record<string, string> = {
  p: 'pawn',
  n: 'knight',
  b: 'bishop',
  r: 'rook',
  q: 'queen',
  k: 'king',
  P: 'Pawn',
  N: 'Knight',
  B: 'Bishop',
  R: 'Rook',
  Q: 'Queen',
  K: 'King',
};

const PIECE_VALUES: Record<string, string> = {
  p: '1',
  n: '3',
  b: '3',
  r: '5',
  q: '9',
  k: '∞',
};

/** Build template variables from context */
const buildVars = (context: NarrationContext): TemplateVars => {
  const { input, tags } = context;
  
  return {
    piece: PIECE_NAMES[input.pieceType] || input.pieceType,
    square: input.toSquare,
    fromSquare: input.fromSquare,
    toSquare: input.toSquare,
    evalDelta: Math.abs(tags.evalDelta).toString(),
    concept: input.conceptTags?.[0]?.replace(/_/g, ' ') || 'tactic',
    pieceValue: PIECE_VALUES[input.pieceType.toLowerCase()] || '?',
    moveNumber: input.moveNumber.toString(),
  };
};

/** Interpolate variables into template */
const interpolate = (template: string, vars: TemplateVars): string => {
  let result = template;
  
  for (const [key, value] of Object.entries(vars)) {
    if (value !== undefined) {
      result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
    }
  }
  
  // Remove any remaining unresolved placeholders
  result = result.replace(/\{[^}]+\}/g, '');
  
  return result;
};

/** Get fallback text when no template found */
const getFallbackText = (tag: NarrationTag): string => {
  const fallbacks: Partial<Record<NarrationTag, string>> = {
    BLUNDER_HANGS_PIECE: '*The spirit winces* A piece left unguarded...',
    FOUND_BEST_MOVE: '*The spirit nods* A worthy move, young one.',
    FOUND_TACTIC: '*The spirit grins* You found the tactical shot!',
    FOUND_BRILLIANT_MOVE: '*The castle trembles with approval* Brilliant!',
    MISTAKE_MISSED_TACTIC: '*The spirit sighs* There was more to find...',
    TACTIC_FORK: '*The spirit cackles* A double attack!',
    POS_IMPROVE_WORST_PIECE: '*The spirit approves* Piece improvement noted.',
    KING_SAFETY_CRACKED: '*Thunder rumbles* The king is in danger!',
  };
  
  return fallbacks[tag] || '*The spirit watches silently*';
};

/** Main narration function */
export const narrate = (context: NarrationContext): NarrationResult => {
  const { tags, gameId, turnNumber } = context;
  const packId = 'castle_spirit';
  
  // Generate deterministic seed for template selection
  const seed = generateSeed(gameId, turnNumber);
  
  // Try to get template for primary tag
  let template = selectTemplate(packId, tags.primaryTag, seed);
  let usedTag = tags.primaryTag;
  
  // Fall back to secondary tags if no template found
  if (!template && tags.secondaryTags.length > 0) {
    for (const secondaryTag of tags.secondaryTags) {
      template = selectTemplate(packId, secondaryTag, seed);
      if (template) {
        usedTag = secondaryTag;
        break;
      }
    }
  }
  
  // Build variables
  const vars = buildVars(context);
  
  // Interpolate or use fallback
  const text = template 
    ? interpolate(template.content, vars)
    : getFallbackText(usedTag);
  
  return {
    text,
    tag: usedTag,
    tone: context.tone,
    templateId: template?.variant || 'fallback',
  };
};

/** Get narration for prediction outcome */
export const narratePrediction = (
  correct: boolean,
  predictedMove: string,
  actualMove: string,
  streak: number
): string => {
  if (correct) {
    if (streak >= 5) {
      return `*The spirit bows deeply* FIVE in a row! You read minds like the ancient seers of this castle!`;
    }
    if (streak >= 3) {
      return `*The spirit claps spectral hands* A streak of ${streak}! You're becoming one with the shadows!`;
    }
    return `*The spirit nods approvingly* Correct! You predicted ${predictedMove} - the very move they played!`;
  }
  
  return `*The spirit shrugs ethereally* You foresaw ${predictedMove}, but they played ${actualMove}. The mists obscure all futures...`;
};

export default narrate;


