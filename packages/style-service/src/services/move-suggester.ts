import { MasterStyle } from '@master-academy/contracts';
import { predictNextMove } from '../models';

export class MoveSuggester {
  async suggestMoves(fen: string, styleId: MasterStyle, topK: number): Promise<string[]> {
    const moves: string[] = [];
    
    for (let i = 0; i < topK; i++) {
      try {
        const result = await predictNextMove(fen, styleId);
        if (result.move && !moves.includes(result.move)) {
          moves.push(result.move);
        }
      } catch (error) {
        console.error(`Failed to get move suggestion ${i + 1}:`, error);
      }
    }

    return moves;
  }
}

