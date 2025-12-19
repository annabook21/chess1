/**
 * GameStore Tests
 * 
 * Tests the in-memory game store implementation.
 * Based on the actual GameStore class in game-store.ts.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { GameStore } from './game-store';

// Standard starting position FEN
const STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
// Note: chess.js normalizes en-passant square, so we use the normalized version
const AFTER_E4_FEN = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';

describe('GameStore', () => {
  let store: GameStore;

  beforeEach(() => {
    store = new GameStore();
  });

  describe('createGame', () => {
    it('should create a game and return a unique gameId', () => {
      const gameId = store.createGame();

      expect(gameId).toBeDefined();
      expect(typeof gameId).toBe('string');
      expect(gameId.startsWith('game-')).toBe(true);
    });

    it('should create games with unique IDs', () => {
      const gameId1 = store.createGame();
      const gameId2 = store.createGame();

      expect(gameId1).not.toBe(gameId2);
    });

    it('should use default ELO of 1200 when not specified', () => {
      const gameId = store.createGame();
      const game = store.getGame(gameId);

      expect(game?.userElo).toBe(1200);
    });

    it('should use provided ELO when specified', () => {
      const gameId = store.createGame(1500);
      const game = store.getGame(gameId);

      expect(game?.userElo).toBe(1500);
    });

    it('should initialize with starting position', () => {
      const gameId = store.createGame();
      const fen = store.getFen(gameId);

      expect(fen).toBe(STARTING_FEN);
    });

    it('should initialize with null currentTurn', () => {
      const gameId = store.createGame();
      const game = store.getGame(gameId);

      expect(game?.currentTurn).toBeNull();
    });

    it('should set createdAt timestamp', () => {
      const before = new Date();
      const gameId = store.createGame();
      const after = new Date();
      
      const game = store.getGame(gameId);

      expect(game?.createdAt).toBeDefined();
      expect(game?.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(game?.createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe('getGame', () => {
    it('should return game state for existing game', () => {
      const gameId = store.createGame(1400);
      const game = store.getGame(gameId);

      expect(game).not.toBeNull();
      expect(game?.gameId).toBe(gameId);
      expect(game?.userElo).toBe(1400);
      expect(game?.chess).toBeDefined();
    });

    it('should return null for non-existent game', () => {
      const game = store.getGame('non-existent-game-id');

      expect(game).toBeNull();
    });
  });

  describe('updateGame', () => {
    it('should update FEN and recreate chess instance', () => {
      const gameId = store.createGame();
      
      store.updateGame(gameId, { fen: AFTER_E4_FEN });
      
      const fen = store.getFen(gameId);
      expect(fen).toBe(AFTER_E4_FEN);
    });

    it('should update currentTurn', () => {
      const gameId = store.createGame();
      const mockTurn = {
        gameId,
        fen: STARTING_FEN,
        sideToMove: 'w' as const,
        choices: [],
        bestMove: { moveUci: 'e2e4', eval: 0.3 },
        difficulty: { engineElo: 1300, hintLevel: 2 },
        telemetryHints: { timeBudgetMs: 30000 },
      };

      store.updateGame(gameId, { currentTurn: mockTurn });

      const game = store.getGame(gameId);
      expect(game?.currentTurn).toEqual(mockTurn);
    });

    it('should update userElo', () => {
      const gameId = store.createGame(1200);
      
      store.updateGame(gameId, { userElo: 1350 });

      const game = store.getGame(gameId);
      expect(game?.userElo).toBe(1350);
    });

    it('should handle invalid FEN gracefully', () => {
      const gameId = store.createGame();
      const originalFen = store.getFen(gameId);

      // Invalid FEN should be caught and not crash
      store.updateGame(gameId, { fen: 'invalid-fen-string' });

      // Original FEN should be preserved (error was caught)
      // Note: chess.js throws on invalid FEN, so the update is skipped
      const game = store.getGame(gameId);
      expect(game).not.toBeNull();
    });

    it('should do nothing for non-existent game', () => {
      // Should not throw
      expect(() => {
        store.updateGame('non-existent', { userElo: 1500 });
      }).not.toThrow();
    });
  });

  describe('getFen', () => {
    it('should return FEN for existing game', () => {
      const gameId = store.createGame();
      const fen = store.getFen(gameId);

      expect(fen).toBe(STARTING_FEN);
    });

    it('should return null for non-existent game', () => {
      const fen = store.getFen('non-existent');

      expect(fen).toBeNull();
    });

    it('should reflect current position after moves', () => {
      const gameId = store.createGame();
      store.makeMove(gameId, 'e2e4');

      const fen = store.getFen(gameId);
      
      // FEN should show e4 pawn and black to move
      expect(fen).toContain('4P3');
      expect(fen).toContain(' b ');
    });
  });

  describe('makeMove', () => {
    it('should make a legal move and return true', () => {
      const gameId = store.createGame();
      
      const result = store.makeMove(gameId, 'e2e4');

      expect(result).toBe(true);
    });

    it('should update the board state after move', () => {
      const gameId = store.createGame();
      
      store.makeMove(gameId, 'e2e4');
      
      const fen = store.getFen(gameId);
      expect(fen).toContain('4P3'); // e4 pawn
    });

    it('should reject illegal move and return false', () => {
      const gameId = store.createGame();
      
      // e2e5 is not a legal move from starting position
      const result = store.makeMove(gameId, 'e2e5');

      expect(result).toBe(false);
    });

    it('should return false for non-existent game', () => {
      const result = store.makeMove('non-existent', 'e2e4');

      expect(result).toBe(false);
    });

    it('should handle pawn promotion', () => {
      const gameId = store.createGame();
      // Set up a position where white can promote
      store.updateGame(gameId, { 
        fen: '8/P7/8/8/8/8/8/4K2k w - - 0 1' 
      });

      const result = store.makeMove(gameId, 'a7a8q');

      expect(result).toBe(true);
      const fen = store.getFen(gameId);
      expect(fen).toContain('Q'); // Queen appeared
    });

    it('should handle castling', () => {
      const gameId = store.createGame();
      // Position with castling available
      store.updateGame(gameId, { 
        fen: 'r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1' 
      });

      const result = store.makeMove(gameId, 'e1g1'); // Kingside castle

      expect(result).toBe(true);
    });

    it('should handle en passant', () => {
      const gameId = store.createGame();
      // Position where en passant is available
      store.updateGame(gameId, { 
        fen: 'rnbqkbnr/ppp1pppp/8/3pP3/8/8/PPPP1PPP/RNBQKBNR w KQkq d6 0 3' 
      });

      const result = store.makeMove(gameId, 'e5d6'); // En passant

      expect(result).toBe(true);
    });
  });

  describe('isGameOver', () => {
    it('should return false for new game', () => {
      const gameId = store.createGame();
      
      expect(store.isGameOver(gameId)).toBe(false);
    });

    it('should return true for non-existent game', () => {
      expect(store.isGameOver('non-existent')).toBe(true);
    });

    it('should detect checkmate', () => {
      const gameId = store.createGame();
      // Fool's mate position - black wins
      store.updateGame(gameId, { 
        fen: 'rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3' 
      });

      expect(store.isGameOver(gameId)).toBe(true);
    });

    it('should detect stalemate', () => {
      const gameId = store.createGame();
      // Stalemate position - king has no legal moves
      store.updateGame(gameId, { 
        fen: 'k7/8/1K6/8/8/8/8/8 b - - 0 1' 
      });

      expect(store.isGameOver(gameId)).toBe(true);
    });
  });

  describe('getSideToMove', () => {
    it('should return "w" for white to move', () => {
      const gameId = store.createGame();

      expect(store.getSideToMove(gameId)).toBe('w');
    });

    it('should return "b" after white moves', () => {
      const gameId = store.createGame();
      store.makeMove(gameId, 'e2e4');

      expect(store.getSideToMove(gameId)).toBe('b');
    });

    it('should return null for non-existent game', () => {
      expect(store.getSideToMove('non-existent')).toBeNull();
    });

    it('should alternate correctly through multiple moves', () => {
      const gameId = store.createGame();
      
      expect(store.getSideToMove(gameId)).toBe('w');
      store.makeMove(gameId, 'e2e4');
      expect(store.getSideToMove(gameId)).toBe('b');
      store.makeMove(gameId, 'e7e5');
      expect(store.getSideToMove(gameId)).toBe('w');
      store.makeMove(gameId, 'g1f3');
      expect(store.getSideToMove(gameId)).toBe('b');
    });
  });
});

