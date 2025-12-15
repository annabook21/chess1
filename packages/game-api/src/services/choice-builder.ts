/**
 * Choice Builder - Optimized
 * 
 * Key optimizations:
 * 1. Local legality validation (no network calls)
 * 2. Only 3 style calls (not 4)
 * 3. Parallel style calls with timeout
 * 4. Engine fallback if styles fail/timeout
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

// Only 3 masters per turn for speed
const TURN_MASTERS: MasterStyle[][] = [
  ['fischer', 'tal', 'capablanca'],
  ['karpov', 'fischer', 'tal'],
  ['capablanca', 'karpov', 'fischer'],
  ['tal', 'capablanca', 'karpov'],
];

// Timeout for style calls (ms)
const STYLE_TIMEOUT_MS = 700;

interface ChoiceBuilderDeps {
  engineClient: EngineClient;
  styleClient: StyleClient;
}

export class ChoiceBuilder {
  constructor(private deps: ChoiceBuilderDeps) {}

  /**
   * Build 3 choices for a position - FAST
   * Now returns MoveChoiceWithPreview with hover preview data
   */
  async buildChoices(
    fen: string,
    difficulty: { engineElo: number; hintLevel: number },
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
    const choices = this.buildChoicesFromResults(
      fen,
      engineAnalysis,
      styleResults,
      legalMovesUci,
      masters
    );

    console.log(`[TIMING] TOTAL buildChoices: ${Date.now() - totalStart}ms`);
    
    return choices;
  }

  /**
   * Get style suggestions with timeout and fallback
   */
  private async getStyleSuggestionsWithTimeout(
    fen: string,
    masters: MasterStyle[],
    legalSet: Set<string>
  ): Promise<Map<MasterStyle, string[]>> {
    const results = new Map<MasterStyle, string[]>();
    
    // Create timeout wrapper
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
   * Build 3 diverse choices from engine + style results
   * Now includes pvPreview for hover visualization
   */
  private buildChoicesFromResults(
    fen: string,
    engineAnalysis: { eval: number; pv: string[] },
    styleResults: Map<MasterStyle, string[]>,
    legalMovesUci: string[],
    masters: MasterStyle[]
  ): MoveChoiceWithPreview[] {
    const choices: MoveChoiceWithPreview[] = [];
    const usedMoves = new Set<string>();

    // Best move from engine
    const bestMove = engineAnalysis.pv[0] || legalMovesUci[0];

    // Create choice for each master
    for (let i = 0; i < 3 && i < masters.length; i++) {
      const styleId = masters[i];
      const styleMoves = styleResults.get(styleId) || [];
      
      // Try to use a style move, fallback to engine moves
      let moveToUse: string | undefined;
      
      // First choice: use engine best move for "best" master
      if (i === 0 && bestMove && !usedMoves.has(bestMove)) {
        moveToUse = bestMove;
      } else {
        // Look for unused style move
        for (const m of styleMoves) {
          if (!usedMoves.has(m)) {
            moveToUse = m;
            break;
          }
        }
      }
      
      // Fallback to any unused legal move
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
        
        // Get PV for this move (use engine PV for first choice, simulate for others)
        const movePv = i === 0 ? engineAnalysis.pv.slice(0, 4) : [moveToUse];
        
        // Build pvPreview for hover visualization
        const pvPreview = this.buildPvPreview(fen, moveToUse, movePv, engineAnalysis.eval);
        
        choices.push({
          id: String.fromCharCode(65 + i), // 'A', 'B', 'C'
          moveUci: moveToUse,
          styleId: styleId,
          planOneLiner: this.generatePlanOneLiner(styleId),
          pv: movePv,
          eval: this.estimateEval(moveToUse, bestMove, engineAnalysis.eval),
          conceptTags: ['development'],
          pvPreview,
        });
      }
    }

    return choices;
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
      
      // Get squares attacked after move (now from opponent's perspective)
      const attackedAfter = this.getAttackedSquares(chess);
      
      // Calculate newly attacked/defended
      const newlyAttacked = attackedAfter.filter(sq => !attackedBefore.includes(sq));
      const newlyDefended: string[] = []; // Would need more complex analysis
      
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
        evalShift: opponentReply ? -0.2 : 0, // Rough estimate
        newlyAttacked,
        newlyDefended,
      };
    } catch (error) {
      console.warn('Error building pvPreview:', error);
      return this.emptyPreview({ from: moveUci.slice(0, 2), to: moveUci.slice(2, 4) });
    }
  }
  
  /**
   * Get all squares attacked by the current side
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
   * Create empty preview when calculation fails
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
   * Get all legal moves in UCI format - LOCAL (no network)
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
   * Estimate evaluation (rough - actual would need scoring call)
   */
  private estimateEval(move: string, bestMove: string, bestEval: number): number {
    if (move === bestMove) return bestEval;
    // Non-best moves are slightly worse (rough estimate)
    return bestEval - 0.3 - Math.random() * 0.4;
  }

  /**
   * Generate style-appropriate plan text
   */
  private generatePlanOneLiner(styleId: MasterStyle): string {
    const plans: Record<MasterStyle, string[]> = {
      capablanca: ['Simplify and outplay', 'Build endgame edge', 'Solid technique'],
      tal: ['Create complications', 'Attack the king', 'Sacrifice for initiative'],
      karpov: ['Restrict counterplay', 'Accumulate advantages', 'Prophylactic play'],
      fischer: ['Find the best move', 'Maintain precision', 'Punish inaccuracies'],
    };
    const options = plans[styleId];
    return options[Math.floor(Math.random() * options.length)];
  }
}
