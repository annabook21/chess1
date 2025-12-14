/**
 * Bedrock Client for Style Service
 * 
 * Wraps the model-specific implementations for backwards compatibility
 */

import { MasterStyle } from '@master-academy/contracts';
import { Chess } from 'chess.js';
import { predictNextMove } from '../models';

export class BedrockStyleClient {
  /**
   * Generate moves in a master's style using Bedrock
   * Returns moves in UCI format
   */
  async generateMovesInStyle(
    fen: string,
    styleId: MasterStyle,
    legalMoves: string[],
    topK: number
  ): Promise<string[]> {
    const results: string[] = [];

    for (let i = 0; i < topK && i < 3; i++) {
      try {
        const result = await predictNextMove(fen, styleId);
        
        if (!result.move) continue;

        // Convert SAN to UCI
        const board = new Chess(fen);
        try {
          const move = board.move(result.move);
          if (move) {
            const uci = `${move.from}${move.to}${move.promotion || ''}`;
            if (legalMoves.includes(uci) && !results.includes(uci)) {
              results.push(uci);
            }
          }
        } catch {
          // Invalid move from model, skip
        }
      } catch (error) {
        console.error(`Bedrock error (attempt ${i + 1}):`, error);
      }
    }

    // If no valid moves from Bedrock, return random legal moves
    if (results.length === 0) {
      const shuffled = [...legalMoves].sort(() => Math.random() - 0.5);
      return shuffled.slice(0, topK);
    }

    return results;
  }
}
