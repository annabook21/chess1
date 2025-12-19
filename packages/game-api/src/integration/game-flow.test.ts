/**
 * Game Flow Integration Tests
 * 
 * Tests the core game logic components working together.
 * Uses the in-memory GameStore for real state management.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Chess } from 'chess.js';
import { GameStore } from '../store/game-store';

describe('Game Store Integration', () => {
  let gameStore: GameStore;

  beforeEach(() => {
    gameStore = new GameStore();
  });

  describe('Full Game Lifecycle', () => {
    it('should create a game with starting position', async () => {
      const gameId = await gameStore.createGame(1200);
      
      expect(gameId).toBeTruthy();
      
      const game = await gameStore.getGame(gameId);
      expect(game).not.toBeNull();
      expect(game!.chess.fen()).toBe('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
    });

    it('should handle a complete game with multiple moves', async () => {
      const gameId = await gameStore.createGame(1200);
      
      // Make a series of moves
      const moves = [
        'e2e4', // White
        'e7e5', // Black
        'g1f3', // White
        'b8c6', // Black
      ];
      
      for (const move of moves) {
        const success = await gameStore.makeMove(gameId, move);
        expect(success).toBe(true);
      }
      
      // Verify final position
      const game = await gameStore.getGame(gameId);
      expect(game!.chess.get('e4')).toBeTruthy();
      expect(game!.chess.get('e5')).toBeTruthy();
      expect(game!.chess.get('f3')).toBeTruthy();
      expect(game!.chess.get('c6')).toBeTruthy();
    });

    it('should reject illegal moves', async () => {
      const gameId = await gameStore.createGame(1200);
      
      // Try illegal move
      const success = await gameStore.makeMove(gameId, 'e2e5');
      expect(success).toBe(false);
      
      // Position should be unchanged
      const fen = await gameStore.getFen(gameId);
      expect(fen).toBe('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
    });

    it('should track side to move correctly', async () => {
      const gameId = await gameStore.createGame(1200);
      
      // Initially white to move
      let side = await gameStore.getSideToMove(gameId);
      expect(side).toBe('w');
      
      // After white moves, black to move
      await gameStore.makeMove(gameId, 'e2e4');
      side = await gameStore.getSideToMove(gameId);
      expect(side).toBe('b');
      
      // After black moves, white to move again
      await gameStore.makeMove(gameId, 'e7e5');
      side = await gameStore.getSideToMove(gameId);
      expect(side).toBe('w');
    });

    it('should detect game over', async () => {
      const gameId = await gameStore.createGame(1200);
      
      // Initially not game over
      let isOver = await gameStore.isGameOver(gameId);
      expect(isOver).toBe(false);
      
      // Play fool's mate
      await gameStore.makeMove(gameId, 'f2f3');
      await gameStore.makeMove(gameId, 'e7e5');
      await gameStore.makeMove(gameId, 'g2g4');
      await gameStore.makeMove(gameId, 'd8h4');
      
      // Now it's checkmate
      isOver = await gameStore.isGameOver(gameId);
      expect(isOver).toBe(true);
    });

    it('should handle promotion', async () => {
      const gameId = await gameStore.createGame(1200);
      
      // Set up a position where white can promote
      const game = await gameStore.getGame(gameId);
      game!.chess.load('8/P7/8/8/8/8/8/4K2k w - - 0 1');
      await gameStore.updateGame(gameId, { fen: game!.chess.fen() });
      
      // Make promotion move
      const success = await gameStore.makeMove(gameId, 'a7a8q');
      expect(success).toBe(true);
      
      // Verify queen is on a8
      const gameAfter = await gameStore.getGame(gameId);
      const piece = gameAfter!.chess.get('a8');
      expect(piece?.type).toBe('q');
    });

    it('should handle castling', async () => {
      const gameId = await gameStore.createGame(1200);
      
      // Set up a position where white can castle kingside
      const game = await gameStore.getGame(gameId);
      game!.chess.load('r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1');
      await gameStore.updateGame(gameId, { fen: game!.chess.fen() });
      
      // Castle kingside
      const success = await gameStore.makeMove(gameId, 'e1g1');
      expect(success).toBe(true);
      
      // Verify king and rook positions
      const gameAfter = await gameStore.getGame(gameId);
      expect(gameAfter!.chess.get('g1')?.type).toBe('k');
      expect(gameAfter!.chess.get('f1')?.type).toBe('r');
    });

    it('should handle en passant', async () => {
      const gameId = await gameStore.createGame(1200);
      
      // Set up en passant position
      const game = await gameStore.getGame(gameId);
      game!.chess.load('rnbqkbnr/pppp1ppp/8/4pP2/8/8/PPPPP1PP/RNBQKBNR w KQkq e6 0 3');
      await gameStore.updateGame(gameId, { fen: game!.chess.fen() });
      
      // En passant capture
      const success = await gameStore.makeMove(gameId, 'f5e6');
      expect(success).toBe(true);
      
      // Verify the captured pawn is gone
      const gameAfter = await gameStore.getGame(gameId);
      expect(gameAfter!.chess.get('e5')).toBeUndefined();
      expect(gameAfter!.chess.get('e6')?.type).toBe('p');
    });
  });

  describe('Game Not Found', () => {
    it('should return null for non-existent game', async () => {
      const game = await gameStore.getGame('non-existent');
      expect(game).toBeNull();
    });

    it('should return false for move on non-existent game', async () => {
      const success = await gameStore.makeMove('non-existent', 'e2e4');
      expect(success).toBe(false);
    });

    it('should return null FEN for non-existent game', async () => {
      const fen = await gameStore.getFen('non-existent');
      expect(fen).toBeNull();
    });
  });

  describe('Multiple Games', () => {
    it('should handle multiple concurrent games', async () => {
      const gameId1 = await gameStore.createGame(1200);
      const gameId2 = await gameStore.createGame(1500);
      const gameId3 = await gameStore.createGame(1800);
      
      // Make different moves in each game
      await gameStore.makeMove(gameId1, 'e2e4');
      await gameStore.makeMove(gameId2, 'd2d4');
      await gameStore.makeMove(gameId3, 'c2c4');
      
      // Verify each game has correct state
      const game1 = await gameStore.getGame(gameId1);
      const game2 = await gameStore.getGame(gameId2);
      const game3 = await gameStore.getGame(gameId3);
      
      expect(game1!.chess.get('e4')).toBeTruthy();
      expect(game2!.chess.get('d4')).toBeTruthy();
      expect(game3!.chess.get('c4')).toBeTruthy();
    });
  });
});

describe('Chess Logic Integration', () => {
  describe('Move Validation', () => {
    it('should validate all legal moves from starting position', () => {
      const chess = new Chess();
      const moves = chess.moves({ verbose: true });
      
      // White has 20 legal moves in starting position
      expect(moves.length).toBe(20);
      
      // 16 pawn moves (2 each for 8 pawns)
      const pawnMoves = moves.filter(m => m.piece === 'p');
      expect(pawnMoves.length).toBe(16);
      
      // 4 knight moves (2 each for 2 knights)
      const knightMoves = moves.filter(m => m.piece === 'n');
      expect(knightMoves.length).toBe(4);
    });

    it('should correctly identify checks', () => {
      const chess = new Chess();
      
      // Scholar's mate position - checkmate
      chess.load('r1bqkb1r/pppp1Qpp/2n2n2/4p3/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 0 4');
      
      expect(chess.inCheck()).toBe(true);
      expect(chess.isCheckmate()).toBe(true);
      expect(chess.isGameOver()).toBe(true);
    });

    it('should correctly identify stalemate', () => {
      const chess = new Chess();
      
      // Classic stalemate position - king trapped in corner with no legal moves
      chess.load('k7/2Q5/1K6/8/8/8/8/8 b - - 0 1');
      
      expect(chess.inCheck()).toBe(false);
      expect(chess.isStalemate()).toBe(true);
      expect(chess.isGameOver()).toBe(true);
    });

    it('should correctly identify insufficient material', () => {
      const chess = new Chess();
      
      // King vs King
      chess.load('4k3/8/8/8/8/8/8/4K3 w - - 0 1');
      
      expect(chess.isInsufficientMaterial()).toBe(true);
    });
  });

  describe('FEN Handling', () => {
    it('should correctly parse and generate FEN', () => {
      const testFens = [
        'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
        'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3',
      ];
      
      for (const fen of testFens) {
        const chess = new Chess(fen);
        expect(chess.fen()).toBe(fen);
      }
    });
  });
});

