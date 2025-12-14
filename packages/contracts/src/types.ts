/**
 * Master Academy Chess - Shared Types
 * 
 * These types define the contract between frontend and backend services.
 * Breaking changes require version bumps.
 */

export type Side = 'w' | 'b';

export type MasterStyle = 'capablanca' | 'tal' | 'karpov' | 'fischer';

export interface MoveChoice {
  id: string; // 'A', 'B', 'C'
  moveUci: string; // e.g., "e2e4"
  styleId: MasterStyle;
  planOneLiner: string; // Short description of the plan
  pv: string[]; // Principal variation (sequence of UCI moves)
  eval: number; // Evaluation in centipawns (positive = white advantage)
  conceptTags: string[]; // e.g., ["development", "center", "tactics"]
}

export interface BestMove {
  moveUci: string;
  eval: number;
}

export interface Difficulty {
  engineElo: number; // Target engine strength
  hintLevel: number; // 0-5, affects how obvious the best move is
}

export interface TelemetryHints {
  timeBudgetMs: number; // Suggested time for this move
}

export interface TurnPackage {
  gameId: string;
  fen: string;
  sideToMove: Side;
  choices: MoveChoice[];
  bestMove: BestMove;
  difficulty: Difficulty;
  telemetryHints: TelemetryHints;
}

export interface MoveRequest {
  moveUci: string;
  choiceId: string;
}

export interface MoveFeedback {
  evalBefore: number;
  evalAfter: number;
  delta: number; // evalAfter - evalBefore
  coachText: string; // Explanation from coach service
  conceptTags: string[];
  blunder: boolean; // true if delta <= threshold
}

export interface MoveResponse {
  accepted: boolean;
  newFen: string;
  feedback: MoveFeedback;
  nextTurn: TurnPackage | null; // null if game over
}

// Engine Service Types
export interface AnalyzePositionRequest {
  fen: string;
  depth?: number;
  timeMs?: number;
}

export interface AnalyzePositionResponse {
  eval: number; // centipawns
  pv: string[]; // principal variation (UCI moves)
  depth: number;
}

export interface ScoreMovesRequest {
  fen: string;
  moves: string[]; // UCI moves
}

export interface ScoreMovesResponse {
  scores: Array<{
    move: string;
    evalDelta: number; // change from current position
    pv: string[];
  }>;
}

// Style Service Types
export interface SuggestMovesRequest {
  fen: string;
  styleId: MasterStyle;
  topK: number; // how many moves to return
}

export interface SuggestMovesResponse {
  moves: string[]; // UCI moves, ordered by style preference
}

// Coach Service Types
export interface ExplainChoiceRequest {
  fen: string;
  chosenMove: string; // UCI
  bestMove: string; // UCI
  pv: string[]; // principal variation
  conceptTag: string;
  userSkill: number; // approximate ELO
}

export interface ExplainChoiceResponse {
  explanation: string; // Short coaching text
  conceptTags: string[]; // Refined tags
}

// Concept Tags (controlled vocabulary)
export const TACTICS_TAGS = [
  'fork',
  'pin',
  'skewer',
  'deflection',
  'discovered_attack',
  'double_attack',
  'removing_defender',
  'back_rank',
  'windmill',
] as const;

export const STRATEGY_TAGS = [
  'development',
  'center_control',
  'open_file',
  'outpost',
  'pawn_break',
  'king_safety',
  'piece_activity',
  'weak_square',
  'pawn_structure',
  'improve_worst_piece',
] as const;

export const ENDGAME_TAGS = [
  'opposition',
  'rook_activity',
  'passed_pawn',
  'king_activity',
  'zugzwang',
  'pawn_promotion',
] as const;

export type ConceptTag = 
  | typeof TACTICS_TAGS[number]
  | typeof STRATEGY_TAGS[number]
  | typeof ENDGAME_TAGS[number];

