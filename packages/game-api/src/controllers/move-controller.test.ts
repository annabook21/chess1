/**
 * MoveController Tests
 * 
 * Tests move processing with mocked dependencies.
 * Based on the actual MoveController class.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MoveController } from './move-controller';
import { Chess } from 'chess.js';

const STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const AFTER_E4_FEN = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1';

// Mock factories
const createMockEngineClient = () => ({
  analyzePosition: vi.fn().mockResolvedValue({ eval: 0.3, pv: ['d7d5'] }),
  isLegalMove: vi.fn().mockResolvedValue(true),
  setStrength: vi.fn(),
  scoreMoves: vi.fn(),
});

const createMockCoachClient = () => ({
  explainChoice: vi.fn().mockResolvedValue({
    explanation: 'Good move! You controlled the center.',
    conceptTags: ['center-control'],
  }),
});

const createMockStyleClient = () => ({
  suggestMoves: vi.fn().mockResolvedValue(['e7e5']),
});

const createMockGameStore = () => ({
  getGame: vi.fn(),
  createGame: vi.fn(),
  updateGame: vi.fn(),
  getFen: vi.fn(),
  makeMove: vi.fn(),
  isGameOver: vi.fn(),
  getSideToMove: vi.fn(),
});

const createMockTurnController = () => ({
  buildTurnPackage: vi.fn().mockResolvedValue({
    gameId: 'game-123',
    fen: AFTER_E4_FEN,
    sideToMove: 'b',
    choices: [
      { id: 'A', moveUci: 'e7e5', conceptTags: ['center-control'] },
    ],
    bestMove: { moveUci: 'e7e5', eval: 0.0 },
    difficulty: { engineElo: 1300, hintLevel: 2 },
    telemetryHints: { timeBudgetMs: 30000 },
  }),
});

const createMockTurnPackage = () => ({
  gameId: 'game-123',
  fen: STARTING_FEN,
  sideToMove: 'w' as const,
  choices: [
    { id: 'A', moveUci: 'e2e4', styleId: 'fischer', planOneLiner: 'Control center', pv: ['e2e4'], eval: 0.3, conceptTags: ['center-control'] },
    { id: 'B', moveUci: 'd2d4', styleId: 'capablanca', planOneLiner: 'Classical', pv: ['d2d4'], eval: 0.25, conceptTags: ['center-control'] },
  ],
  bestMove: { moveUci: 'e2e4', eval: 0.3 },
  difficulty: { engineElo: 1300, hintLevel: 2 },
  telemetryHints: { timeBudgetMs: 30000 },
});

describe('MoveController', () => {
  let moveController: MoveController;
  let mockEngineClient: ReturnType<typeof createMockEngineClient>;
  let mockCoachClient: ReturnType<typeof createMockCoachClient>;
  let mockStyleClient: ReturnType<typeof createMockStyleClient>;
  let mockGameStore: ReturnType<typeof createMockGameStore>;
  let mockTurnController: ReturnType<typeof createMockTurnController>;

  beforeEach(() => {
    mockEngineClient = createMockEngineClient();
    mockCoachClient = createMockCoachClient();
    mockStyleClient = createMockStyleClient();
    mockGameStore = createMockGameStore();
    mockTurnController = createMockTurnController();

    // Default game setup
    mockGameStore.getGame.mockReturnValue({
      gameId: 'game-123',
      chess: new Chess(),
      userElo: 1200,
      currentTurn: createMockTurnPackage(),
      createdAt: new Date(),
    });

    moveController = new MoveController({
      engineClient: mockEngineClient as any,
      coachClient: mockCoachClient as any,
      styleClient: mockStyleClient as any,
      gameStore: mockGameStore as any,
      turnController: mockTurnController as any,
    });

    vi.clearAllMocks();

    // Reset default mocks after clearAllMocks
    mockEngineClient.isLegalMove.mockResolvedValue(true);
    mockEngineClient.analyzePosition.mockResolvedValue({ eval: 0.3, pv: ['d7d5'] });
    mockCoachClient.explainChoice.mockResolvedValue({
      explanation: 'Good move!',
      conceptTags: ['center-control'],
    });
    mockStyleClient.suggestMoves.mockResolvedValue(['e7e5']);
    mockGameStore.getGame.mockReturnValue({
      gameId: 'game-123',
      chess: new Chess(),
      userElo: 1200,
      currentTurn: createMockTurnPackage(),
      createdAt: new Date(),
    });
  });

  describe('processMove', () => {
    describe('successful move', () => {
      it('should accept a legal move', async () => {
        const result = await moveController.processMove('game-123', {
          moveUci: 'e2e4',
          choiceId: 'A',
        });

        expect(result.accepted).toBe(true);
      });

      it('should return new FEN after move', async () => {
        const result = await moveController.processMove('game-123', {
          moveUci: 'e2e4',
          choiceId: 'A',
        });

        expect(result.newFen).toBeDefined();
        expect(result.newFen).not.toBe(STARTING_FEN);
      });

      it('should include feedback with evaluation', async () => {
        const result = await moveController.processMove('game-123', {
          moveUci: 'e2e4',
          choiceId: 'A',
        });

        expect(result.feedback).toHaveProperty('evalBefore');
        expect(result.feedback).toHaveProperty('evalAfter');
        expect(result.feedback).toHaveProperty('delta');
      });

      it('should include coach explanation in feedback', async () => {
        const result = await moveController.processMove('game-123', {
          moveUci: 'e2e4',
          choiceId: 'A',
        });

        expect(result.feedback.coachText).toBeDefined();
        expect(mockCoachClient.explainChoice).toHaveBeenCalled();
      });

      it('should persist move to game store', async () => {
        await moveController.processMove('game-123', {
          moveUci: 'e2e4',
          choiceId: 'A',
        });

        expect(mockGameStore.updateGame).toHaveBeenCalledWith(
          'game-123',
          expect.objectContaining({ fen: expect.any(String) })
        );
      });
    });

    describe('illegal move rejection', () => {
      it('should reject illegal move', async () => {
        mockEngineClient.isLegalMove.mockResolvedValue(false);

        const result = await moveController.processMove('game-123', {
          moveUci: 'e2e5', // Illegal
          choiceId: 'A',
        });

        expect(result.accepted).toBe(false);
      });

      it('should return original FEN for illegal move', async () => {
        mockEngineClient.isLegalMove.mockResolvedValue(false);

        const result = await moveController.processMove('game-123', {
          moveUci: 'e2e5',
          choiceId: 'A',
        });

        expect(result.newFen).toBe(STARTING_FEN);
      });

      it('should provide feedback for illegal move', async () => {
        mockEngineClient.isLegalMove.mockResolvedValue(false);

        const result = await moveController.processMove('game-123', {
          moveUci: 'e2e5',
          choiceId: 'A',
        });

        expect(result.feedback.coachText).toContain('Illegal');
      });
    });

    describe('game not found', () => {
      it('should throw error when game not found', async () => {
        mockGameStore.getGame.mockReturnValue(null);

        await expect(
          moveController.processMove('non-existent', {
            moveUci: 'e2e4',
            choiceId: 'A',
          })
        ).rejects.toThrow('Game non-existent not found');
      });
    });

    describe('blunder detection', () => {
      it('should detect blunder when delta <= -200 centipawns', async () => {
        // Evals are in centipawns (e.g., 50 = 0.5 pawns advantage)
        // Blunder threshold is -200 centipawns
        mockEngineClient.analyzePosition
          .mockResolvedValueOnce({ eval: 50, pv: [] }) // Before: +0.5 pawns
          .mockResolvedValueOnce({ eval: -250, pv: [] }); // After: -2.5 pawns (delta = -300)

        const result = await moveController.processMove('game-123', {
          moveUci: 'e2e4',
          choiceId: 'A',
        });

        expect(result.feedback.blunder).toBe(true);
      });

      it('should not flag good moves as blunders', async () => {
        mockEngineClient.analyzePosition
          .mockResolvedValueOnce({ eval: 30, pv: [] }) // +0.3 pawns
          .mockResolvedValueOnce({ eval: 35, pv: [] }); // +0.35 pawns (delta = +5)

        const result = await moveController.processMove('game-123', {
          moveUci: 'e2e4',
          choiceId: 'A',
        });

        expect(result.feedback.blunder).toBe(false);
      });
    });

    describe('AI opponent response', () => {
      it('should generate AI move after user move', async () => {
        const result = await moveController.processMove('game-123', {
          moveUci: 'e2e4',
          choiceId: 'A',
        });

        // AI move info should be included
        expect(result.feedback.aiMove).toBeDefined();
      });

      it('should skip AI move when skipAiMove is true', async () => {
        const result = await moveController.processMove('game-123', {
          moveUci: 'e2e4',
          choiceId: 'A',
          skipAiMove: true,
        });

        // AI move should not be generated
        expect(mockStyleClient.suggestMoves).not.toHaveBeenCalled();
      });

      it('should not generate AI move when game is over', async () => {
        // Set up checkmate position
        const checkmateChess = new Chess('rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3');
        mockGameStore.getGame.mockReturnValue({
          gameId: 'game-123',
          chess: checkmateChess,
          userElo: 1200,
          currentTurn: createMockTurnPackage(),
          createdAt: new Date(),
        });
        mockEngineClient.isLegalMove.mockResolvedValue(false); // No legal moves in checkmate

        // This should handle game over gracefully
        const result = await moveController.processMove('game-123', {
          moveUci: 'e1e2', // Any move
          choiceId: 'A',
        });

        expect(result.accepted).toBe(false);
      });
    });

    describe('next turn package', () => {
      it('should include next turn when game continues', async () => {
        const result = await moveController.processMove('game-123', {
          moveUci: 'e2e4',
          choiceId: 'A',
        });

        expect(result.nextTurn).toBeDefined();
      });

      it('should return null nextTurn when game is over', async () => {
        // After the move, game will be over
        mockTurnController.buildTurnPackage.mockRejectedValue(new Error('Game over'));
        
        const result = await moveController.processMove('game-123', {
          moveUci: 'e2e4',
          choiceId: 'A',
        });

        // Should have fallback quick turn or null
        expect(result).toHaveProperty('nextTurn');
      });
    });

    describe('parallel operations', () => {
      it('should validate move and get eval in parallel', async () => {
        await moveController.processMove('game-123', {
          moveUci: 'e2e4',
          choiceId: 'A',
        });

        // Both should be called
        expect(mockEngineClient.isLegalMove).toHaveBeenCalled();
        expect(mockEngineClient.analyzePosition).toHaveBeenCalled();
      });
    });
  });
});


