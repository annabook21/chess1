/**
 * Choice Builder - Strategy Pattern Implementation
 * 
 * Builds move choices for the chess trainer using the Strategy Pattern.
 * Each chess master (Fischer, Tal, Capablanca, Karpov) represents a different
 * move selection strategy with unique characteristics.
 * 
 * @module ChoiceBuilder
 * @see {@link https://en.wikipedia.org/wiki/Strategy_pattern}
 * 
 * Key optimizations:
 * 1. Local legality validation (no network calls)
 * 2. Only 3 style calls per turn (not 4)
 * 3. Parallel style calls with timeout
 * 4. Engine fallback if styles fail/timeout
 * 
 * @example
 * ```typescript
 * const builder = new ChoiceBuilder({ engineClient, styleClient });
 * const choices = await builder.buildChoices(fen, { engineElo: 1500, hintLevel: 2 }, 1);
 * ```
 */

import { Chess, Square } from 'chess.js';
import {
  MoveChoice,
  MoveChoiceWithPreview,
  MasterStyle,
  ConceptTag,
} from '@master-academy/contracts';
import { EngineClient } from '../adapters/engine-client';
import { StyleClient } from '../adapters/style-client';

// ═══════════════════════════════════════════════════════════════════════════
// STRATEGY PATTERN INTERFACES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Strategy interface for move selection algorithms.
 * Each master implements a unique approach to choosing moves.
 */
interface MoveStrategy {
  /** Unique identifier for this strategy */
  readonly id: MasterStyle;
  
  /** Human-readable name */
  readonly name: string;
  
  /** Brief description of the strategy's playstyle */
  readonly description: string;
  
  /**
   * Generate plan one-liner for this strategy's move
   * @returns A short description of the strategic intent
   */
  generatePlan(): string;
  
  /**
   * Priority weight for move selection (higher = more aggressive)
   * Used when multiple strategies suggest the same move
   */
  readonly aggressionLevel: number;
}

/**
 * Fischer Strategy - Precise, objective play
 * "I don't believe in psychology. I believe in good moves."
 */
class FischerStrategy implements MoveStrategy {
  readonly id: MasterStyle = 'fischer';
  readonly name = 'Bobby Fischer';
  readonly description = 'Precise, objective play seeking the best move';
  readonly aggressionLevel = 7;
  
  private readonly plans = [
    'Find the best move',
    'Maintain precision',
    'Punish inaccuracies',
    'Calculate concretely',
    'Exploit weaknesses objectively',
  ];
  
  generatePlan(): string {
    return this.plans[Math.floor(Math.random() * this.plans.length)];
  }
}

/**
 * Tal Strategy - Tactical, sacrificial play
 * "You must take your opponent into a deep dark forest where 2+2=5"
 */
class TalStrategy implements MoveStrategy {
  readonly id: MasterStyle = 'tal';
  readonly name = 'Mikhail Tal';
  readonly description = 'Aggressive, tactical play with sacrifices';
  readonly aggressionLevel = 10;
  
  private readonly plans = [
    'Create complications',
    'Attack the king',
    'Sacrifice for initiative',
    'Generate tactical chaos',
    'Seize the initiative',
  ];
  
  generatePlan(): string {
    return this.plans[Math.floor(Math.random() * this.plans.length)];
  }
}

/**
 * Capablanca Strategy - Simple, technical play
 * "A good player is always lucky."
 */
class CapablancaStrategy implements MoveStrategy {
  readonly id: MasterStyle = 'capablanca';
  readonly name = 'José Raúl Capablanca';
  readonly description = 'Simple, technical play aiming for endgame';
  readonly aggressionLevel = 4;
  
  private readonly plans = [
    'Simplify and outplay',
    'Build endgame edge',
    'Solid technique',
    'Improve piece placement',
    'Accumulate small advantages',
  ];
  
  generatePlan(): string {
    return this.plans[Math.floor(Math.random() * this.plans.length)];
  }
}

/**
 * Karpov Strategy - Prophylactic, positional play  
 * "The most important quality of a chess player is the ability to sense danger."
 */
class KarpovStrategy implements MoveStrategy {
  readonly id: MasterStyle = 'karpov';
  readonly name = 'Anatoly Karpov';
  readonly description = 'Prophylactic play, restricting opponent';
  readonly aggressionLevel = 5;
  
  private readonly plans = [
    'Restrict counterplay',
    'Accumulate advantages',
    'Prophylactic play',
    'Improve worst piece',
    'Squeeze the position',
  ];
  
  generatePlan(): string {
    return this.plans[Math.floor(Math.random() * this.plans.length)];
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// STRATEGY REGISTRY
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Registry of all available move strategies.
 * Implements the Strategy Pattern by mapping style IDs to strategy instances.
 */
const STRATEGIES: Record<MasterStyle, MoveStrategy> = {
  fischer: new FischerStrategy(),
  tal: new TalStrategy(),
  capablanca: new CapablancaStrategy(),
  karpov: new KarpovStrategy(),
  // Human-like is handled by Maia on frontend, use Capablanca as fallback
  'human-like': new CapablancaStrategy(),
};

/**
 * Master metadata for UI display
 * Single source of truth for master names, nicknames, and colors
 */
export const MASTER_METADATA: Record<MasterStyle, {
  name: string;
  nickname: string;
  iconName: string;
  color: string;
}> = {
  fischer: {
    name: 'Bobby Fischer',
    nickname: 'The Perfectionist',
    iconName: 'trophy',
    color: '#86b81b',
  },
  tal: {
    name: 'Mikhail Tal',
    nickname: 'The Magician',
    iconName: 'sword',
    color: '#d13020',
  },
  capablanca: {
    name: 'José Raúl Capablanca',
    nickname: 'The Chess Machine',
    iconName: 'crown',
    color: '#e6b100',
  },
  karpov: {
    name: 'Anatoly Karpov',
    nickname: 'The Constrictor',
    iconName: 'target',
    color: '#4a9eff',
  },
  'human-like': {
    name: 'Human-like',
    nickname: 'Like You',
    iconName: 'user',
    color: '#9c27b0',
  },
};

/**
 * Rotation of master combinations for variety across turns.
 * Each turn uses 3 masters to provide diverse choices.
 */
const TURN_MASTERS: MasterStyle[][] = [
  ['fischer', 'tal', 'capablanca'],
  ['karpov', 'fischer', 'tal'],
  ['capablanca', 'karpov', 'fischer'],
  ['tal', 'capablanca', 'karpov'],
];

/** Timeout for style service calls (ms) */
const STYLE_TIMEOUT_MS = 700;

// ═══════════════════════════════════════════════════════════════════════════
// CHOICE BUILDER
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Dependencies required by ChoiceBuilder.
 */
interface ChoiceBuilderDeps {
  /** Client for chess engine analysis */
  engineClient: EngineClient;
  /** Client for style-based move suggestions */
  styleClient: StyleClient;
}

/**
 * Difficulty settings for choice generation.
 */
interface DifficultySettings {
  /** Target engine ELO for analysis depth */
  engineElo: number;
  /** Hint level (1-3) affecting explanation detail */
  hintLevel: number;
}

/**
 * Engine analysis result structure.
 */
interface EngineAnalysis {
  /** Position evaluation in centipawns */
  eval: number;
  /** Principal variation (best line) */
  pv: string[];
}

/**
 * ChoiceBuilder - Generates move choices using the Strategy Pattern.
 * 
 * This class coordinates between the chess engine and style service
 * to generate 3 diverse move choices, each representing a different
 * chess master's approach to the position.
 * 
 * @example
 * ```typescript
 * const deps = { engineClient, styleClient };
 * const builder = new ChoiceBuilder(deps);
 * 
 * // Generate choices for a position
 * const choices = await builder.buildChoices(
 *   'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
 *   { engineElo: 1500, hintLevel: 2 },
 *   1
 * );
 * 
 * // Each choice includes strategy info
 * choices.forEach(choice => {
 *   console.log(`${choice.styleId}: ${choice.planOneLiner}`);
 * });
 * ```
 */
export class ChoiceBuilder {
  private readonly deps: ChoiceBuilderDeps;

  /**
   * Creates a new ChoiceBuilder instance.
   * @param deps - Required dependencies (engine and style clients)
   */
  constructor(deps: ChoiceBuilderDeps) {
    this.deps = deps;
  }

  /**
   * Build 3 choices for a position using the Strategy Pattern.
   * 
   * @param fen - Position in FEN notation
   * @param difficulty - Difficulty settings
   * @param turnNumber - Current turn number (for master rotation)
   * @returns Array of 3 move choices with preview data
   * 
   * @throws {Error} If no legal moves are available
   */
  async buildChoices(
    fen: string,
    difficulty: DifficultySettings,
    turnNumber: number = 0
  ): Promise<MoveChoiceWithPreview[]> {
    const totalStart = Date.now();
    
    // Pre-compute legal moves LOCALLY (no network call)
    const legalMovesUci = this.getLegalMovesUci(fen);
    const legalSet = new Set(legalMovesUci);
    
    console.log(`[TIMING] Legal moves computed locally: ${legalMovesUci.length} moves`);

    // Engine analysis (single call)
    const engineStart = Date.now();
    const engineAnalysis = await this.deps.engineClient.analyzePosition({
      fen,
      depth: 10, // Reduced depth for speed
    });
    console.log(`[TIMING] Engine analysis: ${Date.now() - engineStart}ms`);

    // Get 3 style suggestions IN PARALLEL with timeout
    const stylesStart = Date.now();
    const masters = TURN_MASTERS[turnNumber % TURN_MASTERS.length];
    
    const styleResults = await this.getStyleSuggestionsWithTimeout(
      fen, 
      masters, 
      legalSet
    );
    console.log(`[TIMING] Style suggestions (3 parallel): ${Date.now() - stylesStart}ms`);

    // Build choices from engine + style results
    const choices = await this.buildChoicesFromResults(
      fen,
      engineAnalysis,
      styleResults,
      legalMovesUci,
      masters,
      difficulty
    );

    console.log(`[TIMING] TOTAL buildChoices: ${Date.now() - totalStart}ms`);
    
    return choices;
  }

  /**
   * Get style suggestions with timeout and fallback.
   * Runs all style calls in parallel with a timeout to prevent slow responses.
   * 
   * @param fen - Position in FEN notation
   * @param masters - Array of master style IDs to query
   * @param legalSet - Set of legal moves for validation
   * @returns Map of style ID to suggested moves
   */
  private async getStyleSuggestionsWithTimeout(
    fen: string,
    masters: MasterStyle[],
    legalSet: Set<string>
  ): Promise<Map<MasterStyle, string[]>> {
    const results = new Map<MasterStyle, string[]>();
    
    // Create timeout wrapper for promises
    const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T | null> => {
      return Promise.race([
        promise,
        new Promise<null>(resolve => setTimeout(() => resolve(null), ms))
      ]);
    };

    // Run all style calls in parallel
    const stylePromises = masters.map(async (styleId) => {
      try {
        const moves = await withTimeout(
          this.deps.styleClient.suggestMoves(fen, styleId, 5),
          STYLE_TIMEOUT_MS
        );
        
        if (moves) {
          // Filter to legal moves LOCALLY
          const legalMoves = moves.filter(m => legalSet.has(m));
          return { styleId, moves: legalMoves };
        }
        return { styleId, moves: [] };
      } catch (error) {
        console.warn(`Style ${styleId} failed:`, error);
        return { styleId, moves: [] };
      }
    });

    const styleResults = await Promise.all(stylePromises);
    
    for (const { styleId, moves } of styleResults) {
      results.set(styleId, moves);
    }
    
    return results;
  }

  /**
   * Build 3 diverse choices from engine + style results.
   * Uses the Strategy Pattern to generate appropriate plan descriptions.
   *
   * @param fen - Position in FEN notation
   * @param engineAnalysis - Engine analysis results
   * @param styleResults - Style service suggestions
   * @param legalMovesUci - All legal moves in UCI format
   * @param masters - Master styles for this turn
   * @param difficulty - Difficulty settings (for hint level)
   * @returns Array of move choices with previews
   */
  private async buildChoicesFromResults(
    fen: string,
    engineAnalysis: EngineAnalysis,
    styleResults: Map<MasterStyle, string[]>,
    legalMovesUci: string[],
    masters: MasterStyle[],
    difficulty: DifficultySettings
  ): Promise<MoveChoiceWithPreview[]> {
    const choices: MoveChoiceWithPreview[] = [];
    const usedMoves = new Set<string>();
    const movesToAnalyze: string[] = [];

    // Best move from engine
    const bestMove = engineAnalysis.pv[0] || legalMovesUci[0];

    // First pass: collect all moves we'll use
    for (let i = 0; i < 3 && i < masters.length; i++) {
      const styleId = masters[i];
      const strategy = STRATEGIES[styleId];
      const styleMoves = styleResults.get(styleId) || [];

      // Try to use a style move first to let each master express their unique style
      let moveToUse: string | undefined;

      // Prefer the master's style-specific move
      for (const m of styleMoves) {
        if (!usedMoves.has(m)) {
          moveToUse = m;
          break;
        }
      }

      // Fallback to engine best move if style service failed
      if (!moveToUse && bestMove && !usedMoves.has(bestMove)) {
        moveToUse = bestMove;
      }

      // Last resort: use any unused legal move
      if (!moveToUse) {
        for (const m of legalMovesUci) {
          if (!usedMoves.has(m)) {
            moveToUse = m;
            break;
          }
        }
      }

      if (moveToUse) {
        usedMoves.add(moveToUse);
        movesToAnalyze.push(moveToUse);
      }
    }

    // Get PV for ALL moves (not just first one)
    const movePvs = await this.getPvsForMoves(fen, movesToAnalyze, engineAnalysis.pv);

    // Second pass: build choices with full PV data
    let moveIndex = 0;
    usedMoves.clear();
    
    for (let i = 0; i < 3 && i < masters.length; i++) {
      const styleId = masters[i];
      const strategy = STRATEGIES[styleId];
      const moveToUse = movesToAnalyze[moveIndex];
      
      if (moveToUse) {
        usedMoves.add(moveToUse);
        
        // Get PV for this specific move
        const movePv = movePvs.get(moveToUse) || [moveToUse];
        
        // Build pvPreview for hover visualization
        const pvPreview = this.buildPvPreview(fen, moveToUse, movePv, engineAnalysis.eval);
        
        choices.push({
          id: String.fromCharCode(65 + i), // 'A', 'B', 'C'
          moveUci: moveToUse,
          styleId: styleId,
          planOneLiner: this.enhancePlanWithHints(strategy.generatePlan(), difficulty.hintLevel, moveToUse),
          pv: movePv,
          eval: this.estimateEval(moveToUse, bestMove, engineAnalysis.eval),
          conceptTags: ['development'],
          pvPreview,
        });
        
        moveIndex++;
      }
    }

    return choices;
  }
  
  /**
   * Get principal variations for multiple moves
   * Uses scoreMoves to get accurate PVs for all moves
   */
  private async getPvsForMoves(
    fen: string,
    moves: string[],
    enginePv: string[]
  ): Promise<Map<string, string[]>> {
    const result = new Map<string, string[]>();
    const bestMove = enginePv[0];
    
    // Get non-best moves that need analysis
    const movesToScore = moves.filter(m => m !== bestMove);
    
    // Use engine's PV for best move
    if (moves.includes(bestMove)) {
      result.set(bestMove, enginePv.slice(0, 4));
    }
    
    // Score remaining moves to get their PVs
    if (movesToScore.length > 0) {
      try {
        const scoreResult = await this.deps.engineClient.scoreMoves({
          fen,
          moves: movesToScore,
        });
        
        for (const scored of scoreResult.scores) {
          result.set(scored.move, scored.pv.slice(0, 4));
        }
      } catch (error) {
        console.warn('scoreMoves failed, using computed PVs:', error);
        // Fallback: compute simple PVs for each move
        for (const move of movesToScore) {
          result.set(move, this.computeSimplePv(fen, move));
        }
      }
    }
    
    return result;
  }
  
  /**
   * Compute a simple PV for a move by finding likely opponent responses
   */
  private computeSimplePv(fen: string, moveUci: string): string[] {
    try {
      const chess = new Chess(fen);
      
      // Apply our move
      const from = moveUci.slice(0, 2) as Square;
      const to = moveUci.slice(2, 4) as Square;
      const promotion = moveUci.length > 4 ? (moveUci[4] as 'q' | 'r' | 'b' | 'n') : undefined;
      
      const moveResult = chess.move({ from, to, promotion });
      if (!moveResult) {
        return [moveUci];
      }
      
      const pv = [moveUci];
      
      // Find opponent's most likely response (simple heuristics)
      const opponentMoves = chess.moves({ verbose: true });
      if (opponentMoves.length === 0) {
        return pv; // Checkmate or stalemate
      }
      
      // Sort by move quality heuristics
      const scoredMoves = opponentMoves.map(m => ({
        move: m,
        uci: `${m.from}${m.to}${m.promotion || ''}`,
        score: this.scoreMoveSimple(m, chess),
      })).sort((a, b) => b.score - a.score);
      
      // Take the "best" opponent response
      const oppResponse = scoredMoves[0];
      pv.push(oppResponse.uci);
      
      // Apply opponent move to find our follow-up
      const oppMoveResult = chess.move({
        from: oppResponse.move.from,
        to: oppResponse.move.to,
        promotion: oppResponse.move.promotion,
      });
      
      if (oppMoveResult) {
        // Find our follow-up
        const followUpMoves = chess.moves({ verbose: true });
        if (followUpMoves.length > 0) {
          const scoredFollowUps = followUpMoves.map(m => ({
            move: m,
            uci: `${m.from}${m.to}${m.promotion || ''}`,
            score: this.scoreMoveSimple(m, chess),
          })).sort((a, b) => b.score - a.score);
          
          pv.push(scoredFollowUps[0].uci);
        }
      }
      
      return pv;
    } catch (error) {
      console.warn('Error computing simple PV:', error);
      return [moveUci];
    }
  }
  
  /**
   * Simple move scoring heuristic (not accurate, but gives reasonable responses)
   */
  private scoreMoveSimple(move: { 
    from: string; 
    to: string; 
    captured?: string;
    san: string;
    piece: string;
  }, chess: Chess): number {
    let score = 0;
    
    // Captures are good
    if (move.captured) {
      const pieceValues: Record<string, number> = {
        'p': 1, 'n': 3, 'b': 3, 'r': 5, 'q': 9, 'k': 0
      };
      score += pieceValues[move.captured] || 0;
    }
    
    // Check is good
    if (move.san.includes('+')) {
      score += 0.5;
    }
    
    // Checkmate is best
    if (move.san.includes('#')) {
      score += 100;
    }
    
    // Center control (d4, d5, e4, e5) is good
    if (['d4', 'd5', 'e4', 'e5'].includes(move.to)) {
      score += 0.2;
    }
    
    // Developing pieces in opening is good
    if (move.piece === 'n' || move.piece === 'b') {
      const rank = move.from[1];
      if (rank === '1' || rank === '8') {
        score += 0.3; // Developing from back rank
      }
    }
    
    return score;
  }

  /**
   * Enhance plan description with hints based on difficulty level.
   *
   * Hint levels:
   * - 1 (minimal): Just the base plan
   * - 2 (moderate): Add basic tactical hints
   * - 3 (obvious): Add detailed explanations and piece coordinates
   *
   * @param basePlan - Base plan from strategy
   * @param hintLevel - Hint level (1-3)
   * @param moveUci - The move in UCI notation
   * @returns Enhanced plan with appropriate hints
   */
  private enhancePlanWithHints(basePlan: string, hintLevel: number, moveUci: string): string {
    if (hintLevel === 1) {
      // Minimal hints - just the plan
      return basePlan;
    }

    // Extract move details for hints
    const from = moveUci.slice(0, 2);
    const to = moveUci.slice(2, 4);

    if (hintLevel === 2) {
      // Moderate hints - add basic tactical context
      return `${basePlan} (develops pieces and improves position)`;
    }

    if (hintLevel === 3) {
      // Obvious hints - include move coordinates and detailed explanation
      return `${basePlan} (Move from ${from} to ${to} - this develops your pieces and controls key squares)`;
    }

    return basePlan;
  }

  /**
   * Build preview data for hover visualization
   */
  private buildPvPreview(
    fen: string, 
    moveUci: string, 
    pv: string[],
    baseEval: number
  ): MoveChoiceWithPreview['pvPreview'] {
    try {
      const chess = new Chess(fen);
      
      // Parse your move
      const yourMove = {
        from: moveUci.slice(0, 2),
        to: moveUci.slice(2, 4),
      };
      
      // Get squares attacked before move
      const attackedBefore = this.getAttackedSquares(chess);
      
      // Apply your move
      const moveResult = chess.move({
        from: yourMove.from as Square,
        to: yourMove.to as Square,
        promotion: moveUci.length > 4 ? (moveUci[4] as 'q' | 'r' | 'b' | 'n') : undefined,
      });
      
      if (!moveResult) {
        return this.emptyPreview(yourMove);
      }
      
      // Get squares attacked after move
      const attackedAfter = this.getAttackedSquares(chess);
      
      // Calculate newly attacked squares
      const newlyAttacked = attackedAfter.filter(sq => !attackedBefore.includes(sq));
      const newlyDefended: string[] = [];
      
      // Get opponent's likely reply from PV
      let opponentReply: { from: string; to: string; san: string } | undefined;
      if (pv.length > 1) {
        const oppMove = pv[1];
        const oppMoveResult = chess.move({
          from: oppMove.slice(0, 2) as Square,
          to: oppMove.slice(2, 4) as Square,
          promotion: oppMove.length > 4 ? (oppMove[4] as 'q' | 'r' | 'b' | 'n') : undefined,
        });
        if (oppMoveResult) {
          opponentReply = {
            from: oppMove.slice(0, 2),
            to: oppMove.slice(2, 4),
            san: oppMoveResult.san,
          };
        }
      }
      
      // Get your follow-up from PV
      let yourFollowUp: { from: string; to: string; san: string } | undefined;
      if (pv.length > 2 && opponentReply) {
        const followUp = pv[2];
        const followMoveResult = chess.move({
          from: followUp.slice(0, 2) as Square,
          to: followUp.slice(2, 4) as Square,
          promotion: followUp.length > 4 ? (followUp[4] as 'q' | 'r' | 'b' | 'n') : undefined,
        });
        if (followMoveResult) {
          yourFollowUp = {
            from: followUp.slice(0, 2),
            to: followUp.slice(2, 4),
            san: followMoveResult.san,
          };
        }
      }
      
      return {
        yourMove,
        opponentReply,
        yourFollowUp,
        evalShift: opponentReply ? -0.2 : 0,
        newlyAttacked,
        newlyDefended,
      };
    } catch (error) {
      console.warn('Error building pvPreview:', error);
      return this.emptyPreview({ from: moveUci.slice(0, 2), to: moveUci.slice(2, 4) });
    }
  }
  
  /**
   * Get all squares attacked by the current side.
   * 
   * @param chess - Chess instance with current position
   * @returns Array of square names (e.g., ['e4', 'd5'])
   */
  private getAttackedSquares(chess: Chess): string[] {
    const attacked: string[] = [];
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const ranks = ['1', '2', '3', '4', '5', '6', '7', '8'];
    
    for (const file of files) {
      for (const rank of ranks) {
        const square = `${file}${rank}` as Square;
        if (chess.isAttacked(square, chess.turn())) {
          attacked.push(square);
        }
      }
    }
    
    return attacked;
  }
  
  /**
   * Create empty preview when calculation fails.
   * 
   * @param yourMove - The move that was attempted
   * @returns Empty preview with just the move info
   */
  private emptyPreview(yourMove: { from: string; to: string }): MoveChoiceWithPreview['pvPreview'] {
    return {
      yourMove,
      evalShift: 0,
      newlyAttacked: [],
      newlyDefended: [],
    };
  }

  /**
   * Get all legal moves in UCI format - LOCAL (no network).
   * Uses chess.js for validation to avoid unnecessary API calls.
   * 
   * @param fen - Position in FEN notation
   * @returns Array of legal moves in UCI format (e.g., ['e2e4', 'g1f3'])
   */
  private getLegalMovesUci(fen: string): string[] {
    try {
      const chess = new Chess(fen);
      const moves = chess.moves({ verbose: true });
      return moves.map(m => `${m.from}${m.to}${m.promotion || ''}`);
    } catch {
      return [];
    }
  }

  /**
   * Estimate evaluation for non-best moves.
   * Best move keeps original eval; others get a slight penalty.
   * 
   * @param move - Move being evaluated
   * @param bestMove - Engine's best move
   * @param bestEval - Engine's evaluation of best move
   * @returns Estimated evaluation for this move
   */
  private estimateEval(move: string, bestMove: string, bestEval: number): number {
    if (move === bestMove) return bestEval;
    // Non-best moves are slightly worse (rough estimate)
    return bestEval - 0.3 - Math.random() * 0.4;
  }

  /**
   * Get a strategy instance by style ID.
   * Useful for accessing strategy metadata outside of choice building.
   * 
   * @param styleId - Master style identifier
   * @returns Strategy instance
   */
  static getStrategy(styleId: MasterStyle): MoveStrategy {
    return STRATEGIES[styleId];
  }

  /**
   * Get all available strategies.
   * 
   * @returns Array of all strategy instances
   */
  static getAllStrategies(): MoveStrategy[] {
    return Object.values(STRATEGIES);
  }
}

// Export strategy interface for external use
export type { MoveStrategy, DifficultySettings, EngineAnalysis };
