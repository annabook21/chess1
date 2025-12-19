/**
 * TurnController Tests
 * 
 * Tests turn package building with mocked dependencies.
 * Based on the actual TurnController class.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TurnController } from './turn-controller';
import { Chess } from 'chess.js';

const STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

// Mock dependencies
const createMockChoiceBuilder = () => ({
  buildChoices: vi.fn().mockResolvedValue([
    {
      id: 'A',
      moveUci: 'e2e4',
      styleId: 'fischer',
      planOneLiner: 'Control the center',
      pv: ['e2e4', 'd7d5', 'e4d5'],
      eval: 0.3,
      conceptTags: ['center-control'],
    },
    {
      id: 'B',
      moveUci: 'd2d4',
      styleId: 'capablanca',
      planOneLiner: 'Classical approach',
      pv: ['d2d4', 'd7d5'],
      eval: 0.25,
      conceptTags: ['center-control'],
    },
    {
      id: 'C',
      moveUci: 'g1f3',
      styleId: 'karpov',
      planOneLiner: 'Flexible development',
      pv: ['g1f3', 'd7d5'],
      eval: 0.2,
      conceptTags: ['development'],
    },
  ]),
});

const createMockEngineClient = () => ({
  analyzePosition: vi.fn().mockResolvedValue({
    eval: 0.3,
    pv: ['e2e4', 'd7d5', 'e4d5'],
  }),
  setStrength: vi.fn().mockResolvedValue(undefined),
  isLegalMove: vi.fn(),
  scoreMoves: vi.fn(),
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

describe('TurnController', () => {
  let turnController: TurnController;
  let mockChoiceBuilder: ReturnType<typeof createMockChoiceBuilder>;
  let mockEngineClient: ReturnType<typeof createMockEngineClient>;
  let mockGameStore: ReturnType<typeof createMockGameStore>;

  beforeEach(() => {
    mockChoiceBuilder = createMockChoiceBuilder();
    mockEngineClient = createMockEngineClient();
    mockGameStore = createMockGameStore();

    turnController = new TurnController({
      choiceBuilder: mockChoiceBuilder as any,
      engineClient: mockEngineClient as any,
      gameStore: mockGameStore as any,
    });

    vi.clearAllMocks();
  });

  describe('buildTurnPackage', () => {
    describe('with gameId only', () => {
      it('should fetch game from store', async () => {
        const chess = new Chess();
        mockGameStore.getGame.mockReturnValue({
          gameId: 'game-123',
          chess,
          userElo: 1400,
          currentTurn: null,
          createdAt: new Date(),
        });

        await turnController.buildTurnPackage('game-123');

        expect(mockGameStore.getGame).toHaveBeenCalledWith('game-123');
      });

      it('should throw if game not found', async () => {
        mockGameStore.getGame.mockReturnValue(null);

        await expect(turnController.buildTurnPackage('non-existent'))
          .rejects.toThrow('Game non-existent not found');
      });

      it('should use game userElo for difficulty', async () => {
        const chess = new Chess();
        mockGameStore.getGame.mockReturnValue({
          gameId: 'game-123',
          chess,
          userElo: 1800, // Advanced player
          currentTurn: null,
          createdAt: new Date(),
        });

        await turnController.buildTurnPackage('game-123');

        // Engine strength should be set based on userElo
        expect(mockEngineClient.setStrength).toHaveBeenCalled();
      });
    });

    describe('with chess instance provided', () => {
      it('should use provided chess instance instead of fetching', async () => {
        const chess = new Chess();

        await turnController.buildTurnPackage('game-123', chess, 1500);

        expect(mockGameStore.getGame).not.toHaveBeenCalled();
      });

      it('should use provided userElo', async () => {
        const chess = new Chess();

        const result = await turnController.buildTurnPackage('game-123', chess, 1600);

        // Difficulty should be based on 1600 elo
        expect(mockEngineClient.setStrength).toHaveBeenCalledWith(1700); // 1600 + 100
      });
    });

    describe('turn package structure', () => {
      it('should include gameId', async () => {
        const chess = new Chess();

        const result = await turnController.buildTurnPackage('game-123', chess, 1200);

        expect(result.gameId).toBe('game-123');
      });

      it('should include current FEN', async () => {
        const chess = new Chess();

        const result = await turnController.buildTurnPackage('game-123', chess, 1200);

        expect(result.fen).toBe(STARTING_FEN);
      });

      it('should include side to move', async () => {
        const chess = new Chess();

        const result = await turnController.buildTurnPackage('game-123', chess, 1200);

        expect(result.sideToMove).toBe('w');
      });

      it('should include side to move as black after white moves', async () => {
        const chess = new Chess();
        chess.move('e4');

        const result = await turnController.buildTurnPackage('game-123', chess, 1200);

        expect(result.sideToMove).toBe('b');
      });

      it('should include 3 choices from choice builder', async () => {
        const chess = new Chess();

        const result = await turnController.buildTurnPackage('game-123', chess, 1200);

        expect(result.choices).toHaveLength(3);
        expect(result.choices[0].id).toBe('A');
        expect(result.choices[1].id).toBe('B');
        expect(result.choices[2].id).toBe('C');
      });

      it('should include best move from engine analysis', async () => {
        const chess = new Chess();

        const result = await turnController.buildTurnPackage('game-123', chess, 1200);

        expect(result.bestMove.moveUci).toBe('e2e4');
        expect(result.bestMove.eval).toBe(0.3);
      });

      it('should include difficulty settings', async () => {
        const chess = new Chess();

        const result = await turnController.buildTurnPackage('game-123', chess, 1200);

        expect(result.difficulty).toHaveProperty('engineElo');
        expect(result.difficulty).toHaveProperty('hintLevel');
      });

      it('should include telemetry hints with time budget', async () => {
        const chess = new Chess();

        const result = await turnController.buildTurnPackage('game-123', chess, 1200);

        expect(result.telemetryHints).toHaveProperty('timeBudgetMs');
        expect(result.telemetryHints.timeBudgetMs).toBeGreaterThan(0);
      });
    });

    describe('engine integration', () => {
      it('should set engine strength before analysis', async () => {
        const chess = new Chess();

        await turnController.buildTurnPackage('game-123', chess, 1200);

        // setStrength should be called before analyzePosition
        const setStrengthOrder = mockEngineClient.setStrength.mock.invocationCallOrder[0];
        const analyzeOrder = mockEngineClient.analyzePosition.mock.invocationCallOrder[0];
        
        expect(setStrengthOrder).toBeLessThan(analyzeOrder);
      });

      it('should analyze position at depth 12', async () => {
        const chess = new Chess();

        await turnController.buildTurnPackage('game-123', chess, 1200);

        expect(mockEngineClient.analyzePosition).toHaveBeenCalledWith({
          fen: STARTING_FEN,
          depth: 12,
        });
      });
    });

    describe('persistence', () => {
      it('should save turn package to game store', async () => {
        const chess = new Chess();

        await turnController.buildTurnPackage('game-123', chess, 1200);

        expect(mockGameStore.updateGame).toHaveBeenCalledWith(
          'game-123',
          expect.objectContaining({
            currentTurn: expect.objectContaining({
              gameId: 'game-123',
            }),
          })
        );
      });
    });

    describe('move number for master rotation', () => {
      it('should pass turn number to choice builder', async () => {
        const chess = new Chess();
        chess.move('e4');
        chess.move('e5');
        chess.move('Nf3'); // Move 2 for white

        await turnController.buildTurnPackage('game-123', chess, 1200);

        expect(mockChoiceBuilder.buildChoices).toHaveBeenCalledWith(
          expect.any(String), // fen
          expect.any(Object), // difficulty
          2 // move number
        );
      });
    });
  });
});


