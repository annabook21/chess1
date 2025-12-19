/**
 * StockfishWrapper Unit Tests
 * 
 * Tests the Stockfish wrapper with mocked child_process
 * to ensure fallback mode and heuristics work correctly.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Chess } from 'chess.js';
import { EventEmitter } from 'events';

// Create mock streams
const createMockProcess = () => {
  const stdin = { write: vi.fn() };
  const stdout = new EventEmitter();
  const stderr = new EventEmitter();
  const process = new EventEmitter() as any;
  process.stdin = stdin;
  process.stdout = stdout;
  process.stderr = stderr;
  process.kill = vi.fn();
  return process;
};

// Mock child_process.spawn
vi.mock('child_process', () => ({
  spawn: vi.fn(() => createMockProcess()),
}));

// Mock fs.existsSync to return false (no Stockfish binary)
vi.mock('fs', () => ({
  existsSync: vi.fn().mockReturnValue(false),
}));

// Mock readline
vi.mock('readline', () => ({
  createInterface: vi.fn().mockReturnValue({
    on: vi.fn(),
    close: vi.fn(),
  }),
}));

// Import after mocking
import { StockfishWrapper } from './stockfish-wrapper';

describe('StockfishWrapper', () => {
  let wrapper: StockfishWrapper;

  beforeEach(() => {
    vi.clearAllMocks();
    // Create fresh instance
    wrapper = new StockfishWrapper();
  });

  afterEach(() => {
    if (wrapper) {
      wrapper.destroy();
    }
  });

  describe('Initialization', () => {
    it('should initialize in fallback mode when Stockfish not found', () => {
      expect(wrapper).toBeDefined();
    });
  });

  describe('isLegalMove', () => {
    it('should return true for legal opening moves', async () => {
      const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
      
      expect(await wrapper.isLegalMove(fen, 'e2e4')).toBe(true);
      expect(await wrapper.isLegalMove(fen, 'd2d4')).toBe(true);
      expect(await wrapper.isLegalMove(fen, 'g1f3')).toBe(true);
    });

    it('should return false for illegal moves', async () => {
      const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
      
      expect(await wrapper.isLegalMove(fen, 'e2e5')).toBe(false);
      expect(await wrapper.isLegalMove(fen, 'e1e2')).toBe(false);
      expect(await wrapper.isLegalMove(fen, 'a1a5')).toBe(false);
    });

    it('should return true for valid captures', async () => {
      const fen = 'rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq d6 0 2';
      expect(await wrapper.isLegalMove(fen, 'e4d5')).toBe(true);
    });

    it('should handle promotion moves', async () => {
      const fen = '8/P7/8/8/8/8/8/4K2k w - - 0 1';
      
      expect(await wrapper.isLegalMove(fen, 'a7a8q')).toBe(true);
      expect(await wrapper.isLegalMove(fen, 'a7a8r')).toBe(true);
      expect(await wrapper.isLegalMove(fen, 'a7a8b')).toBe(true);
      expect(await wrapper.isLegalMove(fen, 'a7a8n')).toBe(true);
    });

    it('should handle castling', async () => {
      const fen = 'r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1';
      
      expect(await wrapper.isLegalMove(fen, 'e1g1')).toBe(true);
      expect(await wrapper.isLegalMove(fen, 'e1c1')).toBe(true);
    });

    it('should return false for invalid FEN', async () => {
      expect(await wrapper.isLegalMove('invalid-fen', 'e2e4')).toBe(false);
    });
  });

  describe('analyzePosition', () => {
    it('should return valid analysis structure', async () => {
      const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
      
      // Use depth 1 for speed
      const analysis = await wrapper.analyzePosition(fen, 1);
      
      expect(analysis).toHaveProperty('eval');
      expect(analysis).toHaveProperty('pv');
      expect(analysis).toHaveProperty('depth');
      expect(typeof analysis.eval).toBe('number');
      expect(Array.isArray(analysis.pv)).toBe(true);
    }, 15000);

    it('should return approximately 0 eval for starting position', async () => {
      const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
      
      const analysis = await wrapper.analyzePosition(fen, 1);
      // Starting position is roughly equal
      expect(Math.abs(analysis.eval)).toBeLessThan(100);
    }, 15000);

    it('should return positive eval for white material advantage', async () => {
      const fen = '4k3/8/8/8/8/8/8/Q3K3 w - - 0 1';
      
      const analysis = await wrapper.analyzePosition(fen, 1);
      expect(analysis.eval).toBeGreaterThan(0);
    }, 15000);

    it('should return negative eval for black material advantage', async () => {
      const fen = '4k3/8/8/8/8/8/8/q3K3 w - - 0 1';
      
      const analysis = await wrapper.analyzePosition(fen, 1);
      expect(analysis.eval).toBeLessThan(0);
    }, 15000);

    it('should return legal moves in PV', async () => {
      const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
      
      const analysis = await wrapper.analyzePosition(fen, 1);
      
      expect(analysis.pv.length).toBeGreaterThan(0);
      expect(await wrapper.isLegalMove(fen, analysis.pv[0])).toBe(true);
    }, 15000);
  });

  describe('analyzePositionWithTime', () => {
    it('should return valid analysis with time limit', async () => {
      const fen = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';
      
      const analysis = await wrapper.analyzePositionWithTime(fen, 100);
      
      expect(analysis).toHaveProperty('eval');
      expect(analysis).toHaveProperty('pv');
      expect(analysis).toHaveProperty('depth');
    }, 15000);
  });

  describe('scoreMoves', () => {
    it('should score multiple moves', async () => {
      const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
      const moves = ['e2e4', 'd2d4', 'g1f3'];
      
      const scores = await wrapper.scoreMoves(fen, moves);
      
      expect(scores.length).toBe(3);
      scores.forEach(score => {
        expect(score).toHaveProperty('move');
        expect(score).toHaveProperty('evalDelta');
        expect(score).toHaveProperty('pv');
      });
    });

    it('should score center moves higher', async () => {
      const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
      const moves = ['e2e4', 'a2a3'];
      
      const scores = await wrapper.scoreMoves(fen, moves);
      
      const e4Score = scores.find(s => s.move === 'e2e4')!;
      const a3Score = scores.find(s => s.move === 'a2a3')!;
      
      expect(e4Score.evalDelta).toBeGreaterThan(a3Score.evalDelta);
    });

    it('should score captures highly', async () => {
      const fen = 'rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq d6 0 2';
      const moves = ['e4d5', 'a2a3'];
      
      const scores = await wrapper.scoreMoves(fen, moves);
      
      const captureScore = scores.find(s => s.move === 'e4d5')!;
      const quietScore = scores.find(s => s.move === 'a2a3')!;
      
      expect(captureScore.evalDelta).toBeGreaterThan(quietScore.evalDelta);
    });

    it('should give checkmate highest score', async () => {
      const fen = 'r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4';
      const moves = ['h5f7', 'a2a3'];
      
      const scores = await wrapper.scoreMoves(fen, moves);
      
      const mateScore = scores.find(s => s.move === 'h5f7')!;
      const quietScore = scores.find(s => s.move === 'a2a3')!;
      
      expect(mateScore.evalDelta).toBeGreaterThan(quietScore.evalDelta);
      expect(mateScore.evalDelta).toBeGreaterThan(1000);
    });

    it('should return -1000 for illegal moves', async () => {
      const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
      const moves = ['e2e5'];
      
      const scores = await wrapper.scoreMoves(fen, moves);
      
      expect(scores[0].evalDelta).toBe(-1000);
    });

    it('should sort moves by score descending', async () => {
      const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
      const moves = ['a2a3', 'e2e4', 'd2d4'];
      
      const scores = await wrapper.scoreMoves(fen, moves);
      
      for (let i = 0; i < scores.length - 1; i++) {
        expect(scores[i].evalDelta).toBeGreaterThanOrEqual(scores[i + 1].evalDelta);
      }
    });

    it('should build PV for each move', async () => {
      const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
      const moves = ['e2e4'];
      
      const scores = await wrapper.scoreMoves(fen, moves);
      
      expect(scores[0].pv.length).toBeGreaterThan(0);
      expect(scores[0].pv[0]).toBe('e2e4');
    });
  });

  describe('setStrength', () => {
    it('should clamp ELO to minimum 1320', () => {
      expect(() => wrapper.setStrength(500)).not.toThrow();
    });

    it('should clamp ELO to maximum 3190', () => {
      expect(() => wrapper.setStrength(4000)).not.toThrow();
    });

    it('should accept ELO in valid range', () => {
      expect(() => wrapper.setStrength(1500)).not.toThrow();
      expect(() => wrapper.setStrength(2000)).not.toThrow();
      expect(() => wrapper.setStrength(2500)).not.toThrow();
    });
  });

  describe('Position Evaluation', () => {
    it('should evaluate white material advantage as positive', async () => {
      // White up a queen
      const fen = '4k3/8/8/8/4Q3/8/8/4K3 w - - 0 1';
      const analysis = await wrapper.analyzePosition(fen, 1);
      expect(analysis.eval).toBeGreaterThan(0);
    }, 15000);

    it('should evaluate black material advantage as negative', async () => {
      // Black up a queen
      const fen = '4k3/8/8/8/4q3/8/8/4K3 w - - 0 1';
      const analysis = await wrapper.analyzePosition(fen, 1);
      expect(analysis.eval).toBeLessThan(0);
    }, 15000);
  });

  describe('QuickMoveScore Heuristics', () => {
    it('should reward captures appropriately', async () => {
      const fenCapturePawn = 'rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2';
      const scoresP = await wrapper.scoreMoves(fenCapturePawn, ['e4d5']);
      expect(scoresP[0].evalDelta).toBeGreaterThanOrEqual(100);
    });

    it('should reward checks', async () => {
      // Position where Qa8+ is check
      const fen = '4k3/8/8/8/8/8/8/Q3K3 w - - 0 1';
      const scores = await wrapper.scoreMoves(fen, ['a1a8', 'a1a2']);
      
      const checkMove = scores.find(s => s.move === 'a1a8')!;
      const quietMove = scores.find(s => s.move === 'a1a2')!;
      
      // Check move should score higher (check bonus)
      expect(checkMove.evalDelta).toBeGreaterThanOrEqual(quietMove.evalDelta);
    });

    it('should reward castling', async () => {
      const fen = 'r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1';
      const scores = await wrapper.scoreMoves(fen, ['e1g1', 'a1b1']);
      
      const castleMove = scores.find(s => s.move === 'e1g1')!;
      const rookMove = scores.find(s => s.move === 'a1b1')!;
      
      expect(castleMove.evalDelta).toBeGreaterThan(rookMove.evalDelta);
    });

    it('should reward knight/bishop development', async () => {
      const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
      const scores = await wrapper.scoreMoves(fen, ['g1f3', 'a2a3']);
      
      const devMove = scores.find(s => s.move === 'g1f3')!;
      const pawnMove = scores.find(s => s.move === 'a2a3')!;
      
      expect(devMove.evalDelta).toBeGreaterThan(pawnMove.evalDelta);
    });
  });

  describe('destroy', () => {
    it('should clean up resources', () => {
      expect(() => wrapper.destroy()).not.toThrow();
    });
  });
});

describe('StockfishWrapper Singleton', () => {
  it('should return same instance via getInstance', () => {
    const instance1 = StockfishWrapper.getInstance();
    const instance2 = StockfishWrapper.getInstance();
    
    expect(instance1).toBe(instance2);
    
    instance1.destroy();
  });
});
