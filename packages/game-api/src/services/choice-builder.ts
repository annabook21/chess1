/**
 * Choice Builder - Optimized
 * 
 * Key optimizations:
 * 1. Local legality validation (no network calls)
 * 2. Only 3 style calls (not 4)
 * 3. Parallel style calls with timeout
 * 4. Engine fallback if styles fail/timeout
 */

import { Chess } from 'chess.js';
import {
  MoveChoice,
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
   */
  async buildChoices(
    fen: string,
    difficulty: { engineElo: number; hintLevel: number },
    turnNumber: number = 0
  ): Promise<MoveChoice[]> {
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
   */
  private buildChoicesFromResults(
    fen: string,
    engineAnalysis: { eval: number; pv: string[] },
    styleResults: Map<MasterStyle, string[]>,
    legalMovesUci: string[],
    masters: MasterStyle[]
  ): MoveChoice[] {
    const choices: MoveChoice[] = [];
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
        
        choices.push({
          id: String.fromCharCode(65 + i), // 'A', 'B', 'C'
          moveUci: moveToUse,
          styleId: styleId,
          planOneLiner: this.generatePlanOneLiner(styleId),
          pv: i === 0 ? engineAnalysis.pv.slice(0, 4) : [moveToUse],
          eval: this.estimateEval(moveToUse, bestMove, engineAnalysis.eval),
          conceptTags: ['development'],
        });
      }
    }

    return choices;
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
