/**
 * Narration System Types
 * Core types for the narration engine
 */

/** Tags that can be assigned to moves based on engine analysis */
export type NarrationTag =
  // Blunders and mistakes
  | 'BLUNDER_HANGS_PIECE'
  | 'BLUNDER_HANGS_MATE'
  | 'BLUNDER_POSITIONAL'
  | 'MISTAKE_MISSED_TACTIC'
  | 'INACCURACY_SUBOPTIMAL'
  
  // Good moves
  | 'FOUND_BEST_MOVE'
  | 'FOUND_ONLY_MOVE'
  | 'FOUND_BRILLIANT_MOVE'
  | 'FOUND_TACTIC'
  | 'FOUND_MATE_THREAT'
  
  // Tactical themes
  | 'TACTIC_FORK'
  | 'TACTIC_PIN'
  | 'TACTIC_SKEWER'
  | 'TACTIC_DISCOVERY'
  | 'TACTIC_SACRIFICE'
  
  // Positional themes
  | 'POS_IMPROVE_WORST_PIECE'
  | 'POS_CONTROL_CENTER'
  | 'POS_KING_SAFETY'
  | 'POS_PAWN_STRUCTURE'
  | 'POS_OPEN_FILE'
  
  // Special situations
  | 'KING_SAFETY_CRACKED'
  | 'MATERIAL_ADVANTAGE'
  | 'MATERIAL_DISADVANTAGE'
  | 'ENDGAME_CONVERSION'
  | 'OPENING_THEORY'
  
  // Prediction outcomes
  | 'PREDICTION_CORRECT'
  | 'PREDICTION_WRONG'
  | 'PREDICTION_CLOSE';

/** Input context for tagging a move */
export interface TaggerInput {
  evalBefore: number;      // Centipawns before move
  evalAfter: number;       // Centipawns after move
  isCapture: boolean;
  isCheck: boolean;
  isMate: boolean;
  pieceType: string;       // 'p', 'n', 'b', 'r', 'q', 'k'
  fromSquare: string;
  toSquare: string;
  conceptTags?: string[];  // Tags from engine analysis
  isPlayerMove: boolean;
  moveNumber: number;
}

/** Output from tagger */
export interface TaggerOutput {
  primaryTag: NarrationTag;
  secondaryTags: NarrationTag[];
  evalDelta: number;
  severity: 'neutral' | 'good' | 'great' | 'bad' | 'terrible';
}

/** Context for rendering narration */
export interface NarrationContext {
  tags: TaggerOutput;
  input: TaggerInput;
  gameId: string;
  turnNumber: number;
  playerColor: 'white' | 'black';
  tone: 'whimsical' | 'gothic' | 'ruthless';
}

/** Rendered narration output */
export interface NarrationResult {
  text: string;
  tag: NarrationTag;
  tone: string;
  templateId: string;
}

/** Template variables for interpolation */
export interface TemplateVars {
  piece?: string;
  square?: string;
  fromSquare?: string;
  toSquare?: string;
  evalDelta?: string;
  concept?: string;
  pieceValue?: string;
  moveNumber?: string;
}
