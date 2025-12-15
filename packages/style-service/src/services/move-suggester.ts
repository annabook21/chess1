/**
 * Move Suggester - Optimized
 * ONE Bedrock call returns 3-5 moves (not topK separate calls)
 */

import { MasterStyle } from '@master-academy/contracts';
import { Chess } from 'chess.js';
import { anthropicPredictMultiple, MultiMoveResult } from '../models/anthropic';

export interface StyleSuggestion {
  moves: string[]; // UCI format
  planOneLiner: string;
  threatSummary: string;
}

export class MoveSuggester {
  /**
   * Get style-appropriate moves in ONE Bedrock call
   * Returns 3-5 UCI moves, empty array on failure
   */
  async suggestMoves(fen: string, styleId: MasterStyle, _topK: number = 5): Promise<string[]> {
    const start = Date.now();
    
    // Pre-compute legal moves locally (no network call)
    const legalMovesUci = this.getLegalMovesUci(fen);
    
    try {
      const result = await anthropicPredictMultiple(fen, styleId, legalMovesUci);
      
      console.log(`[TIMING] suggestMoves ${styleId}: ${Date.now() - start}ms, got ${result.moves.length} moves`);
      
      return result.moves;
    } catch (error) {
      console.error(`MoveSuggester.suggestMoves failed for ${styleId}:`, error);
      return [];
    }
  }

  /**
   * Get full style suggestion including plan and threats
   */
  async suggestMovesWithPlan(fen: string, styleId: MasterStyle): Promise<StyleSuggestion> {
    const start = Date.now();
    const legalMovesUci = this.getLegalMovesUci(fen);
    
    try {
      const result = await anthropicPredictMultiple(fen, styleId, legalMovesUci);
      
      console.log(`[TIMING] suggestMovesWithPlan ${styleId}: ${Date.now() - start}ms`);
      
      return {
        moves: result.moves,
        planOneLiner: result.planOneLiner,
        threatSummary: result.threatSummary,
      };
    } catch (error) {
      console.error(`MoveSuggester.suggestMovesWithPlan failed for ${styleId}:`, error);
      return { moves: [], planOneLiner: '', threatSummary: '' };
    }
  }

  /**
   * Get all legal moves in UCI format using chess.js (LOCAL - no network)
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
}
