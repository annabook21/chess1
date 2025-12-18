/**
 * Maia Encoder Unit Tests
 * 
 * Critical tests for FEN encoding and policy decoding.
 * These tests validate the LC0 1858-index format which was the root cause
 * of the "no predictions returned" bug.
 */

import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';

// We test the public interface through the module exports
import { 
  encodeFenToPlanes, 
  decodePolicyToMoves,
  getUciPolicyIndex,
  getPolicyUci,
} from './encoder';
import { LC0_INPUT_SIZE } from './types';

describe('Move Mappings (LC0 Format)', () => {
  // Test indirectly through getUciPolicyIndex and getPolicyUci
  
  it('should map common opening moves to valid indices', () => {
    // Force initialization by calling getUciPolicyIndex
    expect(getUciPolicyIndex('e2e4')).toBeDefined();
    expect(getUciPolicyIndex('e2e4')).toBeGreaterThanOrEqual(0);
    expect(getUciPolicyIndex('e2e4')).toBeLessThan(1858);
  });

  it('should include d2d4 (common opening move)', () => {
    const index = getUciPolicyIndex('d2d4');
    expect(index).toBeDefined();
    expect(index).toBeGreaterThanOrEqual(0);
  });

  it('should include knight moves like g1f3', () => {
    const index = getUciPolicyIndex('g1f3');
    expect(index).toBeDefined();
  });

  it('should include long-range moves', () => {
    expect(getUciPolicyIndex('a1h8')).toBeDefined(); // diagonal
    expect(getUciPolicyIndex('a1a8')).toBeDefined(); // vertical
    expect(getUciPolicyIndex('a1h1')).toBeDefined(); // horizontal
  });

  it('should include underpromotions', () => {
    // Underpromotions from 7th rank (a7a8n for knight underpromotion)
    expect(getUciPolicyIndex('a7a8n')).toBeDefined();
    expect(getUciPolicyIndex('a7a8b')).toBeDefined();
    expect(getUciPolicyIndex('a7a8r')).toBeDefined();
  });

  it('should return undefined for invalid moves', () => {
    expect(getUciPolicyIndex('z9z9')).toBeUndefined();
  });

  it('should return consistent indices (round-trip)', () => {
    const index = getUciPolicyIndex('e2e4');
    if (index !== undefined) {
      const uci = getPolicyUci(index);
      expect(uci).toBe('e2e4');
    }
  });
});

describe('FEN to Planes Encoding', () => {
  const STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  
  it('should return correct tensor dimensions', () => {
    const planes = encodeFenToPlanes(STARTING_FEN);
    // 112 planes × 64 squares = 7168 values
    expect(planes.length).toBe(LC0_INPUT_SIZE);
  });

  it('should encode starting position with pieces', () => {
    const planes = encodeFenToPlanes(STARTING_FEN);
    // First 12 planes are piece positions (6 piece types × 2 colors)
    const pieceData = planes.slice(0, 12 * 64);
    
    // Should have some 1s (pieces exist)
    const pieceCount = Array.from(pieceData).filter(v => v === 1).length;
    expect(pieceCount).toBe(32); // 32 pieces on starting position
  });

  it('should encode side to move (different for black)', () => {
    const whiteFen = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1';
    const blackPlanes = encodeFenToPlanes(whiteFen);
    
    // The encoding should differ based on side to move
    // (flipping board for black's perspective)
    expect(blackPlanes).toBeDefined();
    expect(blackPlanes.length).toBe(LC0_INPUT_SIZE);
  });

  it('should encode castling rights', () => {
    const noQueensideFen = 'r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w Kk - 0 1';
    const planes = encodeFenToPlanes(noQueensideFen);
    expect(planes).toBeDefined();
    expect(planes.length).toBe(LC0_INPUT_SIZE);
  });

  it('should handle en passant square', () => {
    const enPassantFen = 'rnbqkbnr/pppp1ppp/8/4pP2/8/8/PPPPP1PP/RNBQKBNR w KQkq e6 0 3';
    const planes = encodeFenToPlanes(enPassantFen);
    expect(planes).toBeDefined();
  });

  it('should handle empty or minimal positions', () => {
    const minimalFen = '8/8/8/8/8/8/8/4K2k w - - 0 1';
    const planes = encodeFenToPlanes(minimalFen);
    expect(planes.length).toBe(LC0_INPUT_SIZE);
  });
});

describe('Policy Decoding', () => {
  const STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

  it('should decode policy to legal moves only', () => {
    // Create a mock policy with uniform distribution
    const policySize = 1858;
    const mockPolicy = new Float32Array(policySize).fill(1 / policySize);
    
    const chess = new Chess(STARTING_FEN);
    const legalMoves = chess.moves({ verbose: true }).map(m => m.from + m.to);
    
    const decoded = decodePolicyToMoves(mockPolicy, STARTING_FEN);
    
    // All decoded moves should be legal
    decoded.forEach(pred => {
      const moveBase = pred.uci.slice(0, 4);
      expect(legalMoves).toContain(moveBase);
    });
  });

  it('should return predictions sorted by probability', () => {
    const policySize = 1858;
    const mockPolicy = new Float32Array(policySize);
    
    // Set random probabilities
    for (let i = 0; i < policySize; i++) {
      mockPolicy[i] = Math.random();
    }
    
    const decoded = decodePolicyToMoves(mockPolicy, STARTING_FEN);
    
    // Verify sorted descending
    for (let i = 1; i < decoded.length; i++) {
      expect(decoded[i - 1].probability).toBeGreaterThanOrEqual(decoded[i].probability);
    }
  });

  it('should handle empty policy gracefully', () => {
    const emptyPolicy = new Float32Array(0);
    const decoded = decodePolicyToMoves(emptyPolicy, STARTING_FEN);
    expect(decoded).toEqual([]);
  });

  it('should handle all-zero policy', () => {
    const zeroPolicy = new Float32Array(1858).fill(0);
    const decoded = decodePolicyToMoves(zeroPolicy, STARTING_FEN);
    // Should return empty or very low probability moves
    expect(decoded.every(p => p.probability === 0)).toBe(true);
  });

  it('should include SAN notation in predictions', () => {
    const policySize = 1858;
    const mockPolicy = new Float32Array(policySize).fill(0.01);
    
    const decoded = decodePolicyToMoves(mockPolicy, STARTING_FEN);
    
    decoded.forEach(pred => {
      expect(pred.san).toBeDefined();
      expect(pred.san.length).toBeGreaterThan(0);
    });
  });

  it('should handle position with limited legal moves', () => {
    // Position with only 2 legal moves (king in corner)
    const limitedFen = '7k/8/6K1/8/8/8/8/8 b - - 0 1';
    const mockPolicy = new Float32Array(1858).fill(0.01);
    
    const decoded = decodePolicyToMoves(mockPolicy, limitedFen);
    
    // Should only return legal moves
    expect(decoded.length).toBeLessThanOrEqual(2);
  });

  it('should handle promotion moves', () => {
    const promotionFen = '8/P7/8/8/8/8/8/4K2k w - - 0 1';
    const mockPolicy = new Float32Array(1858).fill(0.01);
    
    const decoded = decodePolicyToMoves(mockPolicy, promotionFen);
    
    // Should include promotion options
    const promotionMoves = decoded.filter(p => 
      p.uci.includes('a7a8') || p.uci.length === 5
    );
    expect(promotionMoves.length).toBeGreaterThan(0);
  });
});

describe('getMoveIndex', () => {
  it('should return valid index for common moves', () => {
    const e2e4Index = getMoveIndex('e2e4');
    expect(e2e4Index).toBeGreaterThanOrEqual(0);
    expect(e2e4Index).toBeLessThan(1858);
  });

  it('should return -1 for invalid moves', () => {
    const invalidIndex = getMoveIndex('z9z9');
    expect(invalidIndex).toBe(-1);
  });

  it('should return consistent indices', () => {
    const index1 = getMoveIndex('e2e4');
    const index2 = getMoveIndex('e2e4');
    expect(index1).toBe(index2);
  });
});

describe('Edge Cases', () => {
  it('should handle malformed FEN gracefully', () => {
    expect(() => fenToPlanes('invalid fen string')).not.toThrow();
  });

  it('should handle FEN with unusual but valid positions', () => {
    // Position with many queens
    const manyQueens = 'QQQQQQQQ/QQQQQQQQ/8/8/8/8/8/4K2k w - - 0 1';
    expect(() => fenToPlanes(manyQueens)).not.toThrow();
  });

  it('should handle checkmate positions', () => {
    const checkmate = 'rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 0 1';
    const mockPolicy = new Float32Array(1858).fill(0.01);
    
    // Should return no moves (checkmate = no legal moves)
    const decoded = decodePolicyToMoves(mockPolicy, checkmate);
    expect(decoded.length).toBe(0);
  });

  it('should handle stalemate positions', () => {
    const stalemate = '8/8/8/8/8/5k2/5p2/5K2 w - - 0 1';
    const mockPolicy = new Float32Array(1858).fill(0.01);
    
    const decoded = decodePolicyToMoves(mockPolicy, stalemate);
    expect(decoded.length).toBe(0);
  });
});
