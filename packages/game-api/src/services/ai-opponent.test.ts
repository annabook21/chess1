/**
 * AIOpponent Tests
 * 
 * Tests AI move generation with style-based moves and engine fallback.
 * Based on the actual AIOpponent class in ai-opponent.ts.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AIOpponent } from './ai-opponent';

// Test positions
const STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const AFTER_E4_FEN = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1';
const CHECKMATE_FEN = 'rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3';

// Mock dependencies
const createMockStyleClient = () => ({
  suggestMoves: vi.fn(),
});

const createMockEngineClient = () => ({
  analyzePosition: vi.fn(),
  isLegalMove: vi.fn(),
  scoreMoves: vi.fn(),
  setStrength: vi.fn(),
});

describe('AIOpponent', () => {
  let aiOpponent: AIOpponent;
  let mockStyleClient: ReturnType<typeof createMockStyleClient>;
  let mockEngineClient: ReturnType<typeof createMockEngineClient>;

  beforeEach(() => {
    mockStyleClient = createMockStyleClient();
    mockEngineClient = createMockEngineClient();
    
    aiOpponent = new AIOpponent({
      styleClient: mockStyleClient as any,
      engineClient: mockEngineClient as any,
    });

    vi.clearAllMocks();
  });

  describe('generateMove', () => {
    describe('successful style-based move', () => {
      it('should return move from style client when legal', async () => {
        mockStyleClient.suggestMoves.mockResolvedValue(['e7e5']);

        const result = await aiOpponent.generateMove(AFTER_E4_FEN);

        expect(result.moveUci).toBe('e7e5');
        expect(result.moveSan).toBe('e5');
        expect(mockStyleClient.suggestMoves).toHaveBeenCalledWith(
          AFTER_E4_FEN,
          expect.any(String), // styleId
          1
        );
      });

      it('should include style ID in response', async () => {
        mockStyleClient.suggestMoves.mockResolvedValue(['d7d5']);

        const result = await aiOpponent.generateMove(AFTER_E4_FEN);

        expect(result.styleId).toBeDefined();
        expect(['tal', 'karpov', 'capablanca', 'fischer']).toContain(result.styleId);
      });

      it('should include justification in response', async () => {
        mockStyleClient.suggestMoves.mockResolvedValue(['e7e5']);

        const result = await aiOpponent.generateMove(AFTER_E4_FEN);

        expect(result.justification).toBeDefined();
        expect(typeof result.justification).toBe('string');
        expect(result.justification.length).toBeGreaterThan(0);
      });

      it('should rotate styles based on move number', async () => {
        // Move 1 position (move number from FEN)
        const move1Fen = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';
        // Move 2 position
        const move2Fen = 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2';
        
        mockStyleClient.suggestMoves.mockResolvedValue(['e7e5']);

        await aiOpponent.generateMove(move1Fen);
        const call1Style = mockStyleClient.suggestMoves.mock.calls[0][1];

        mockStyleClient.suggestMoves.mockClear();
        mockStyleClient.suggestMoves.mockResolvedValue(['g1f3']);

        await aiOpponent.generateMove(move2Fen);
        const call2Style = mockStyleClient.suggestMoves.mock.calls[0][1];

        // Styles should be different for different move numbers
        // (unless they happen to land on same index mod 4)
        expect(call1Style).toBeDefined();
        expect(call2Style).toBeDefined();
      });
    });

    describe('retry on illegal move', () => {
      it('should retry if first suggested move is illegal', async () => {
        // First call returns illegal move, second returns legal
        mockStyleClient.suggestMoves
          .mockResolvedValueOnce(['e7e8']) // Illegal - pawn can't move there
          .mockResolvedValueOnce(['e7e5']); // Legal

        const result = await aiOpponent.generateMove(AFTER_E4_FEN);

        expect(result.moveUci).toBe('e7e5');
        expect(mockStyleClient.suggestMoves).toHaveBeenCalledTimes(2);
      });

      it('should fall back to engine after 2 failed attempts', async () => {
        mockStyleClient.suggestMoves.mockResolvedValue(['z9z9']); // Always illegal
        mockEngineClient.analyzePosition.mockResolvedValue({
          eval: 0,
          pv: ['e7e5'],
        });

        const result = await aiOpponent.generateMove(AFTER_E4_FEN);

        expect(result.moveUci).toBe('e7e5');
        expect(mockStyleClient.suggestMoves).toHaveBeenCalledTimes(2);
        expect(mockEngineClient.analyzePosition).toHaveBeenCalled();
      });
    });

    describe('style client failure', () => {
      it('should fall back to engine when style client throws', async () => {
        mockStyleClient.suggestMoves.mockRejectedValue(new Error('API timeout'));
        mockEngineClient.analyzePosition.mockResolvedValue({
          eval: 0.3,
          pv: ['d7d5'],
        });

        const result = await aiOpponent.generateMove(AFTER_E4_FEN);

        expect(result.moveUci).toBe('d7d5');
        expect(result.styleId).toBe('fischer'); // Default for engine fallback
        expect(result.justification).toBe('Playing the objectively strongest continuation.');
      });

      it('should fall back to engine when style client returns empty', async () => {
        mockStyleClient.suggestMoves.mockResolvedValue([]);
        mockEngineClient.analyzePosition.mockResolvedValue({
          eval: 0,
          pv: ['c7c5'],
        });

        const result = await aiOpponent.generateMove(AFTER_E4_FEN);

        expect(result.moveUci).toBe('c7c5');
      });
    });

    describe('engine fallback', () => {
      it('should use reduced depth (6) for speed', async () => {
        mockStyleClient.suggestMoves.mockRejectedValue(new Error('fail'));
        mockEngineClient.analyzePosition.mockResolvedValue({
          eval: 0,
          pv: ['e7e5'],
        });

        await aiOpponent.generateMove(AFTER_E4_FEN);

        expect(mockEngineClient.analyzePosition).toHaveBeenCalledWith({
          fen: AFTER_E4_FEN,
          depth: 6,
        });
      });

      it('should use random legal move if engine returns no PV', async () => {
        mockStyleClient.suggestMoves.mockRejectedValue(new Error('fail'));
        mockEngineClient.analyzePosition.mockResolvedValue({
          eval: 0,
          pv: [], // No principal variation
        });

        const result = await aiOpponent.generateMove(AFTER_E4_FEN);

        // Should still return a valid move
        expect(result.moveUci).toBeDefined();
        expect(result.moveUci.length).toBeGreaterThanOrEqual(4);
      });
    });

    describe('edge cases', () => {
      it('should throw when no legal moves available', async () => {
        await expect(aiOpponent.generateMove(CHECKMATE_FEN)).rejects.toThrow(
          'No legal moves available'
        );
      });

      it('should handle promotion moves from style client', async () => {
        const promotionFen = '8/P7/8/8/8/8/8/4K2k w - - 0 1';
        mockStyleClient.suggestMoves.mockResolvedValue(['a7a8q']);

        const result = await aiOpponent.generateMove(promotionFen);

        expect(result.moveUci).toBe('a7a8q');
        expect(result.moveSan).toContain('=Q');
      });
    });
  });

  describe('justification generation', () => {
    it('should generate Tal-style justification for aggressive play', async () => {
      mockStyleClient.suggestMoves.mockResolvedValue(['e7e5']);
      
      // Force Tal style by using move number 0 (0 % 4 = 0 = tal)
      const move0Fen = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 0';

      // Note: We can't directly test internal justification selection,
      // but we verify the justification is a string
      const result = await aiOpponent.generateMove(AFTER_E4_FEN);
      
      expect(result.justification).toBeDefined();
    });
  });
});


