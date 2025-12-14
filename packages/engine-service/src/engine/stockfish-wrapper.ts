/**
 * Chess Engine Wrapper
 * 
 * Uses chess.js for move validation and positional analysis.
 * Includes material + positional evaluation for meaningful feedback.
 */

import { Chess, Square, PieceSymbol, Color } from 'chess.js';

export interface EngineAnalysis {
  eval: number; // centipawns (positive = white advantage)
  pv: string[]; // principal variation (UCI moves)
  depth: number;
  mate?: number; // mate in N moves (if found)
}

// Piece-square tables for positional evaluation (from white's perspective)
const PAWN_TABLE = [
  0,  0,  0,  0,  0,  0,  0,  0,
  50, 50, 50, 50, 50, 50, 50, 50,
  10, 10, 20, 30, 30, 20, 10, 10,
  5,  5, 10, 25, 25, 10,  5,  5,
  0,  0,  0, 20, 20,  0,  0,  0,
  5, -5,-10,  0,  0,-10, -5,  5,
  5, 10, 10,-20,-20, 10, 10,  5,
  0,  0,  0,  0,  0,  0,  0,  0
];

const KNIGHT_TABLE = [
  -50,-40,-30,-30,-30,-30,-40,-50,
  -40,-20,  0,  0,  0,  0,-20,-40,
  -30,  0, 10, 15, 15, 10,  0,-30,
  -30,  5, 15, 20, 20, 15,  5,-30,
  -30,  0, 15, 20, 20, 15,  0,-30,
  -30,  5, 10, 15, 15, 10,  5,-30,
  -40,-20,  0,  5,  5,  0,-20,-40,
  -50,-40,-30,-30,-30,-30,-40,-50
];

const BISHOP_TABLE = [
  -20,-10,-10,-10,-10,-10,-10,-20,
  -10,  0,  0,  0,  0,  0,  0,-10,
  -10,  0,  5, 10, 10,  5,  0,-10,
  -10,  5,  5, 10, 10,  5,  5,-10,
  -10,  0, 10, 10, 10, 10,  0,-10,
  -10, 10, 10, 10, 10, 10, 10,-10,
  -10,  5,  0,  0,  0,  0,  5,-10,
  -20,-10,-10,-10,-10,-10,-10,-20
];

const ROOK_TABLE = [
  0,  0,  0,  0,  0,  0,  0,  0,
  5, 10, 10, 10, 10, 10, 10,  5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  0,  0,  0,  5,  5,  0,  0,  0
];

const QUEEN_TABLE = [
  -20,-10,-10, -5, -5,-10,-10,-20,
  -10,  0,  0,  0,  0,  0,  0,-10,
  -10,  0,  5,  5,  5,  5,  0,-10,
  -5,  0,  5,  5,  5,  5,  0, -5,
  0,  0,  5,  5,  5,  5,  0, -5,
  -10,  5,  5,  5,  5,  5,  0,-10,
  -10,  0,  5,  0,  0,  0,  0,-10,
  -20,-10,-10, -5, -5,-10,-10,-20
];

const KING_MIDDLEGAME_TABLE = [
  -30,-40,-40,-50,-50,-40,-40,-30,
  -30,-40,-40,-50,-50,-40,-40,-30,
  -30,-40,-40,-50,-50,-40,-40,-30,
  -30,-40,-40,-50,-50,-40,-40,-30,
  -20,-30,-30,-40,-40,-30,-30,-20,
  -10,-20,-20,-20,-20,-20,-20,-10,
  20, 20,  0,  0,  0,  0, 20, 20,
  20, 30, 10,  0,  0, 10, 30, 20
];

export class StockfishWrapper {
  /**
   * Analyze a position - returns eval based on material + position
   */
  async analyzePosition(fen: string, depth: number): Promise<EngineAnalysis> {
    const board = new Chess(fen);
    const evaluation = this.evaluate(board);
    const legalMoves = this.getLegalMovesUci(board);
    
    // Check for checkmate/stalemate
    if (board.isCheckmate()) {
      const turn = board.turn();
      return {
        eval: turn === 'w' ? -10000 : 10000,
        pv: [],
        depth: 1,
        mate: 0,
      };
    }
    
    if (board.isStalemate() || board.isDraw()) {
      return { eval: 0, pv: [], depth: 1 };
    }
    
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
    const baseEval = this.evaluate(board);
    const sideToMove = board.turn();

    const results = moves.map(moveUci => {
      const newFen = this.makeMove(fen, moveUci);
      if (!newFen) {
        return { move: moveUci, evalDelta: -1000, pv: [] };
      }

      const newBoard = new Chess(newFen);
      const newEval = this.evaluate(newBoard);
      
      // Flip sign based on side to move
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
   * Full evaluation: material + positional factors
   */
  private evaluate(board: Chess): number {
    let score = 0;
    
    // Material evaluation
    score += this.evaluateMaterial(board);
    
    // Piece-square tables (positional)
    score += this.evaluatePieceSquares(board);
    
    // Mobility (number of legal moves)
    score += this.evaluateMobility(board);
    
    // Center control
    score += this.evaluateCenterControl(board);
    
    // Development in opening
    score += this.evaluateDevelopment(board);
    
    return score;
  }

  /**
   * Material evaluation in centipawns
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

  /**
   * Piece-square table evaluation
   */
  private evaluatePieceSquares(board: Chess): number {
    let score = 0;
    const boardState = board.board();
    
    const tables: Record<PieceSymbol, number[]> = {
      p: PAWN_TABLE,
      n: KNIGHT_TABLE,
      b: BISHOP_TABLE,
      r: ROOK_TABLE,
      q: QUEEN_TABLE,
      k: KING_MIDDLEGAME_TABLE,
    };

    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = boardState[row][col];
        if (piece) {
          const table = tables[piece.type];
          if (table) {
            // White pieces use table as-is, black pieces mirror it
            const tableIndex = piece.color === 'w' 
              ? row * 8 + col 
              : (7 - row) * 8 + col;
            const posValue = table[tableIndex] || 0;
            score += piece.color === 'w' ? posValue : -posValue;
          }
        }
      }
    }

    return score;
  }

  /**
   * Mobility evaluation (scaled down to not dominate)
   */
  private evaluateMobility(board: Chess): number {
    const currentTurn = board.turn();
    const ourMoves = board.moves().length;
    
    // Switch turns to count opponent moves
    const fen = board.fen();
    const parts = fen.split(' ');
    parts[1] = currentTurn === 'w' ? 'b' : 'w';
    
    try {
      const oppBoard = new Chess(parts.join(' '));
      const theirMoves = oppBoard.moves().length;
      const mobilityDiff = ourMoves - theirMoves;
      
      // Scale: each extra move = ~2 centipawns
      const mobilityScore = mobilityDiff * 2;
      return currentTurn === 'w' ? mobilityScore : -mobilityScore;
    } catch {
      return 0;
    }
  }

  /**
   * Center control evaluation
   */
  private evaluateCenterControl(board: Chess): number {
    const centerSquares: Square[] = ['d4', 'd5', 'e4', 'e5'];
    const extendedCenter: Square[] = ['c3', 'c4', 'c5', 'c6', 'd3', 'd6', 'e3', 'e6', 'f3', 'f4', 'f5', 'f6'];
    
    let score = 0;
    
    for (const sq of centerSquares) {
      const piece = board.get(sq);
      if (piece) {
        const value = piece.type === 'p' ? 15 : 10;
        score += piece.color === 'w' ? value : -value;
      }
    }
    
    for (const sq of extendedCenter) {
      const piece = board.get(sq);
      if (piece) {
        const value = piece.type === 'p' ? 5 : 3;
        score += piece.color === 'w' ? value : -value;
      }
    }

    return score;
  }

  /**
   * Development evaluation (early game)
   */
  private evaluateDevelopment(board: Chess): number {
    const fen = board.fen();
    const moveCount = parseInt(fen.split(' ')[5]) || 1;
    
    // Only matters in opening (first 15 moves)
    if (moveCount > 15) return 0;
    
    let score = 0;
    const boardState = board.board();
    
    // Penalty for unmoved minor pieces
    const whiteBackRank = boardState[7];
    const blackBackRank = boardState[0];
    
    // White knights on b1/g1
    if (whiteBackRank[1]?.type === 'n') score -= 15;
    if (whiteBackRank[6]?.type === 'n') score -= 15;
    
    // White bishops on c1/f1
    if (whiteBackRank[2]?.type === 'b') score -= 15;
    if (whiteBackRank[5]?.type === 'b') score -= 15;
    
    // Black knights on b8/g8
    if (blackBackRank[1]?.type === 'n') score += 15;
    if (blackBackRank[6]?.type === 'n') score += 15;
    
    // Black bishops on c8/f8
    if (blackBackRank[2]?.type === 'b') score += 15;
    if (blackBackRank[5]?.type === 'b') score += 15;

    return score;
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
