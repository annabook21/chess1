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
  planOneLiner: string; // Short description of the plan (master's inner monologue)
  pv: string[]; // Principal variation (sequence of UCI moves)
  eval: number; // Evaluation in centipawns (positive = white advantage)
  conceptTags: string[]; // e.g., ["development", "center", "tactics"]
  threats?: string; // What threats/plans this move creates
}

// Opponent prediction for training
export interface OpponentPrediction {
  predictedMove: string; // User's prediction in UCI
  actualMove: string; // What AI played
  wasCorrect: boolean;
  wasTopThree: boolean; // If prediction was in top 3 engine moves
  explanation: string; // Why the AI made this move
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

export interface AIMoveInfo {
  moveSan: string; // e.g., "Nf6"
  styleId: string; // Which master style the AI used
  justification: string; // Why the AI made this move
}

export interface MoveFeedback {
  evalBefore: number;
  evalAfter: number;
  delta: number; // evalAfter - evalBefore
  coachText: string; // Explanation from coach service
  conceptTags: string[];
  blunder: boolean; // true if delta <= threshold
  aiMove?: AIMoveInfo; // AI opponent's response move
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

// ============================================================================
// WEAKNESS TRACKER TYPES
// ============================================================================

/** Game phases for weakness analysis */
export type GamePhase = 'opening' | 'middlegame' | 'endgame';

/** Move quality classification */
export type MoveQuality = 'brilliant' | 'great' | 'good' | 'book' | 'inaccuracy' | 'mistake' | 'blunder';

/** A single move record for weakness analysis */
export interface MoveRecord {
  id: string;                    // Unique move ID
  gameId: string;                // Parent game ID
  moveNumber: number;            // Move number in the game
  fen: string;                   // Position before the move
  moveUci: string;               // The move played (UCI)
  moveSan: string;               // The move played (SAN)
  bestMoveUci: string;           // Engine's best move
  evalBefore: number;            // Eval before move (centipawns)
  evalAfter: number;             // Eval after move (centipawns)
  delta: number;                 // Eval change
  quality: MoveQuality;          // Move quality classification
  phase: GamePhase;              // Game phase when move was made
  conceptTags: string[];         // Concepts present in the position
  missedTactics: string[];       // Tactical themes that were missed
  timestamp: number;             // When the move was made
}

/** Weakness category with statistics */
export interface WeaknessCategory {
  id: string;                    // Category identifier
  name: string;                  // Human-readable name
  emoji: string;                 // Visual icon
  description: string;           // What this weakness means
  occurrences: number;           // Times this weakness appeared
  missRate: number;              // Percentage of times user missed it (0-100)
  avgEvalLoss: number;           // Average centipawn loss when missing
  trend: 'improving' | 'stable' | 'declining';  // Recent trend
  recentMisses: MoveRecord[];    // Last few missed opportunities
  lastPracticed?: number;        // Timestamp of last targeted practice
}

/** Overall weakness profile for a user */
export interface WeaknessProfile {
  userId: string;
  lastUpdated: number;
  totalMoves: number;
  totalGames: number;
  
  // Accuracy by phase
  phaseAccuracy: {
    opening: { total: number; accurate: number; accuracy: number };
    middlegame: { total: number; accurate: number; accuracy: number };
    endgame: { total: number; accurate: number; accuracy: number };
  };
  
  // Accuracy by concept
  conceptAccuracy: Record<string, { 
    total: number; 
    accurate: number; 
    accuracy: number;
    avgEvalLoss: number;
  }>;
  
  // Top weaknesses (sorted by impact)
  topWeaknesses: WeaknessCategory[];
  
  // Improvements (areas getting better)
  improvements: WeaknessCategory[];
  
  // Move quality distribution
  qualityDistribution: Record<MoveQuality, number>;
  
  // Recent move history for analysis
  recentMoves: MoveRecord[];
}

/** Request to update weakness tracking after a move */
export interface TrackMoveRequest {
  gameId: string;
  moveRecord: Omit<MoveRecord, 'id' | 'timestamp'>;
}

/** Drill suggestion based on weakness */
export interface WeaknessDrill {
  id: string;
  weaknessId: string;            // Which weakness this addresses
  type: 'puzzle' | 'position' | 'endgame';
  fen: string;                   // Starting position
  solution: string[];            // Correct moves (UCI)
  conceptTags: string[];         // Concepts practiced
  difficulty: number;            // 1-5 difficulty rating
  explanation: string;           // Why this drill helps
}

/** Request for targeted practice */
export interface GetDrillsRequest {
  weaknessIds?: string[];        // Specific weaknesses to target
  count?: number;                // Number of drills to return
  difficulty?: number;           // Target difficulty (1-5)
}

/** Response with targeted drills */
export interface GetDrillsResponse {
  drills: WeaknessDrill[];
  targetedWeaknesses: string[];  // Which weaknesses these address
}

