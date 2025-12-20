/**
 * AI Opponent Service
 * 
 * Generates AI opponent moves using Bedrock, following AWS demo patterns.
 * The AI plays as a "rival master" with its own style.
 */

import { StyleClient } from '../adapters/style-client';
import { EngineClient } from '../adapters/engine-client';
import { MasterStyle } from '@master-academy/contracts';
import { Chess } from 'chess.js';

// Rotate through masters for variety
const OPPONENT_STYLES: MasterStyle[] = ['tal', 'karpov', 'capablanca', 'fischer'];

interface AIOpponentDeps {
  styleClient: StyleClient;
  engineClient: EngineClient;
}

export interface AIMove {
  moveUci: string;
  moveSan: string;
  styleId: MasterStyle;
  justification: string;
}

export class AIOpponent {
  constructor(private deps: AIOpponentDeps) {}

  /**
   * Generate AI opponent's move for the current position.
   * Uses Bedrock to generate a master-style move with retry logic.
   * Falls back to engine best move if Bedrock fails.
   */
  async generateMove(fen: string): Promise<AIMove> {
    const chess = new Chess(fen);
    const legalMoves = chess.moves({ verbose: true });
    
    if (legalMoves.length === 0) {
      throw new Error('No legal moves available');
    }

    // Rotate through opponent styles based on move number from FEN
    // This makes style selection deterministic per-game and avoids shared counter issues
    const moveNumber = chess.moveNumber();
    const styleId = OPPONENT_STYLES[moveNumber % OPPONENT_STYLES.length];

    // Try to get a Bedrock-generated move (2 attempts max to avoid timeout)
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const suggestedMoves = await this.deps.styleClient.suggestMoves(fen, styleId, 1);
        
        if (suggestedMoves.length > 0) {
          const moveUci = suggestedMoves[0];
          
          // Quick legality check using local chess.js (no API call needed)
          const from = moveUci.substring(0, 2);
          const to = moveUci.substring(2, 4);
          const promotion = moveUci.length > 4 ? moveUci[4] : undefined;
          
          const testChess = new Chess(fen);
          try {
            const moveResult = testChess.move({ from, to, promotion: promotion as any });
            
            if (moveResult) {
              return {
                moveUci,
                moveSan: moveResult.san,
                styleId,
                justification: this.generateJustification(styleId, moveResult.san),
              };
            }
          } catch {
            // Move was illegal, try next attempt
            console.log(`Bedrock suggested illegal move ${moveUci}, retrying...`);
          }
        }
      } catch (error) {
        console.error(`AI move attempt ${attempt + 1} failed:`, error);
      }
    }

    // Fallback: Use engine's best move (reduced depth for speed)
    console.log('AI falling back to engine move');
    const analysis = await this.deps.engineClient.analyzePosition({ fen, depth: 6 });
    let bestMoveUci = analysis.pv[0];
    
    // Validate engine's best move
    if (bestMoveUci) {
      const from = bestMoveUci.substring(0, 2);
      const to = bestMoveUci.substring(2, 4);
      const promotion = bestMoveUci.length > 4 ? bestMoveUci[4] : undefined;
      
      try {
        const moveResult = chess.move({ from, to, promotion: promotion as any });
        if (moveResult) {
          return {
            moveUci: bestMoveUci,
            moveSan: moveResult.san,
            styleId: 'fischer',
            justification: 'Playing the objectively strongest continuation.',
          };
        }
      } catch {
        console.error(`Engine returned invalid move ${bestMoveUci}, using random fallback`);
      }
    }
    
    // Final fallback: random legal move (always valid)
    const randomMoveUci = this.getRandomLegalMove(chess);
    const from = randomMoveUci.substring(0, 2);
    const to = randomMoveUci.substring(2, 4);
    const promotion = randomMoveUci.length > 4 ? randomMoveUci[4] : undefined;
    
    // Reset chess instance (previous move attempt may have failed mid-way)
    const freshChess = new Chess(fen);
    const moveResult = freshChess.move({ from, to, promotion: promotion as any });
    
    return {
      moveUci: randomMoveUci,
      moveSan: moveResult?.san || randomMoveUci,
      styleId: 'fischer',
      justification: 'Playing a solid continuation.',
    };
  }

  private getRandomLegalMove(chess: Chess): string {
    const moves = chess.moves({ verbose: true });
    const randomMove = moves[Math.floor(Math.random() * moves.length)];
    return `${randomMove.from}${randomMove.to}${randomMove.promotion || ''}`;
  }

  private generateJustification(styleId: MasterStyle, moveSan: string): string {
    const justifications: Record<MasterStyle, string[]> = {
      tal: [
        'Creating complications and attacking chances.',
        'Sacrificing material for initiative.',
        'Keeping the position sharp and tactical.',
      ],
      karpov: [
        'Restricting your options while improving my position.',
        'Building pressure methodically.',
        'Accumulating small advantages.',
      ],
      capablanca: [
        'Simplifying toward a favorable endgame.',
        'Improving piece coordination.',
        'Controlling key squares.',
      ],
      fischer: [
        'Playing the most precise move.',
        'Following opening principles strictly.',
        'Maintaining the initiative.',
      ],
      'human-like': [
        'This felt like the natural move.',
        'Developing my pieces naturally.',
        'A solid, intuitive choice.',
      ],
    };

    const options = justifications[styleId] || justifications.fischer;
    return options[Math.floor(Math.random() * options.length)];
  }
}





