/**
 * Chess Engine Wrapper
 * 
 * Uses chess.js for move validation and basic analysis.
 * For MVP, Bedrock handles move generation; this provides legality checks.
 * 
 * NOTE: Full Stockfish integration would require either:
 * - A native Stockfish binary in the container
 * - stockfish.wasm with proper Node.js WASM support
 */

import { Chess } from 'chess.js';

export interface EngineAnalysis {
  eval: number; // centipawns (positive = white advantage)
  pv: string[]; // principal variation (UCI moves)
  depth: number;
  mate?: number; // mate in N moves (if found)
}

export class StockfishWrapper {
  /**
   * Analyze a position - returns basic eval based on material
   */
  async analyzePosition(fen: string, depth: number): Promise<EngineAnalysis> {
    const board = new Chess(fen);
    const evaluation = this.evaluateMaterial(board);
    const legalMoves = this.getLegalMovesUci(board);
    
    return {
      eval: evaluation,
      pv: legalMoves.slice(0, 3),
      depth: Math.min(depth, 1),
    };
  }

  /**
   * Analyze a position with time limit
   */
  async analyzePositionWithTime(fen: string, timeMs: number): Promise<EngineAnalysis> {
    return this.analyzePosition(fen, 10);
  }

  /**
   * Check if a move is legal in the given position
   */
  async isLegalMove(fen: string, moveUci: string): Promise<boolean> {
    try {
      const chess = new Chess(fen);
      const [from, to, promo] = this.parseUci(moveUci);
      const move = chess.move({ from, to, promotion: promo as any });
      return !!move;
    } catch {
      return false;
    }
  }

  /**
   * Get all legal moves in UCI format
   */
  getLegalMovesUci(board: Chess): string[] {
    const moves = board.moves({ verbose: true });
    return moves.map(m => `${m.from}${m.to}${m.promotion || ''}`);
  }

  /**
   * Score multiple moves from a position
   */
  async scoreMoves(fen: string, moves: string[]): Promise<Array<{ move: string; evalDelta: number; pv: string[] }>> {
    const board = new Chess(fen);
    const baseEval = this.evaluateMaterial(board);

    const results = moves.map(moveUci => {
      const newFen = this.makeMove(fen, moveUci);
      if (!newFen) {
        return { move: moveUci, evalDelta: -1000, pv: [] };
      }

      const newBoard = new Chess(newFen);
      const newEval = this.evaluateMaterial(newBoard);
      
      // Flip sign based on side to move
      const sideToMove = fen.split(' ')[1];
      const evalDelta = sideToMove === 'w' ? newEval - baseEval : baseEval - newEval;

      return {
        move: moveUci,
        evalDelta,
        pv: [moveUci],
      };
    });

    // Sort by evalDelta descending (best moves first)
    return results.sort((a, b) => b.evalDelta - a.evalDelta);
  }

  /**
   * Simple material evaluation in centipawns
   */
  private evaluateMaterial(board: Chess): number {
    const pieceValues: Record<string, number> = {
      p: 100, n: 320, b: 330, r: 500, q: 900, k: 0,
    };

    let eval_ = 0;
    const boardState = board.board();

    for (const row of boardState) {
      for (const square of row) {
        if (square) {
          const value = pieceValues[square.type] || 0;
          eval_ += square.color === 'w' ? value : -value;
        }
      }
    }

    return eval_;
  }

  private parseUci(uci: string): [string, string, string?] {
    const from = uci.substring(0, 2);
    const to = uci.substring(2, 4);
    const promo = uci.length > 4 ? uci[4] : undefined;
    return [from, to, promo];
  }

  private makeMove(fen: string, moveUci: string): string | null {
    try {
      const chess = new Chess(fen);
      const [from, to, promo] = this.parseUci(moveUci);
      const move = chess.move({ from, to, promotion: promo as any });
      if (!move) return null;
      return chess.fen();
    } catch {
      return null;
    }
  }

  /**
   * Set engine strength (no-op for chess.js implementation)
   */
  setStrength(elo: number): void {
    // No-op - chess.js doesn't have strength levels
  }

  destroy(): void {
    // No cleanup needed
  }
}
