/**
 * API Client Tests
 * 
 * Tests for the game API client including:
 * - createGame
 * - getTurn
 * - submitMove
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';
import { createGame, getTurn, submitMove } from './client';
import type { TurnPackage, MoveRequest, MoveResponse } from '@master-academy/contracts';

// Mock axios
vi.mock('axios', () => {
  const mockAxios = {
    create: vi.fn(() => mockAxios),
    get: vi.fn(),
    post: vi.fn(),
    defaults: { headers: { common: {} } },
  };
  return { default: mockAxios };
});

// ============================================================================
// TEST FIXTURES
// ============================================================================

const MOCK_GAME_ID = 'test-game-123';

const MOCK_TURN_PACKAGE: TurnPackage = {
  fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
  turnNumber: 1,
  choices: [
    {
      id: 'A',
      moveUci: 'e7e5',
      styleId: 'fischer',
      planOneLiner: 'Mirror the center',
      pv: ['e7e5', 'g1f3'],
      eval: 0,
      conceptTags: ['opening'],
    },
    {
      id: 'B',
      moveUci: 'd7d5',
      styleId: 'tal',
      planOneLiner: 'Counter in the center',
      pv: ['d7d5', 'e4d5'],
      eval: -10,
      conceptTags: ['gambit'],
    },
    {
      id: 'C',
      moveUci: 'e7e6',
      styleId: 'capablanca',
      planOneLiner: 'Solid French setup',
      pv: ['e7e6', 'd2d4'],
      eval: 5,
      conceptTags: ['solid'],
    },
  ],
  masterMoves: {
    white: {
      name: 'The Player',
      styleId: 'capablanca',
      moveUci: 'e2e4',
      justification: 'A strong opening move',
    },
  },
  status: {
    isCheck: false,
    isCheckmate: false,
    isStalemate: false,
    isDraw: false,
    winner: undefined,
  },
};

const MOCK_MOVE_REQUEST: MoveRequest = {
  choiceId: 'A',
  startTime: Date.now(),
  endTime: Date.now() + 5000,
};

const MOCK_MOVE_RESPONSE: MoveResponse = {
  success: true,
  feedback: {
    userMove: {
      moveSan: 'e5',
      evalDelta: 0,
      isBest: true,
    },
    aiMove: {
      moveSan: 'Nf3',
      styleId: 'fischer',
      justification: 'Developing the knight',
    },
    reasoning: 'Good opening play',
    suggestedStudy: null,
  },
  nextTurn: MOCK_TURN_PACKAGE,
};

// ============================================================================
// createGame Tests
// ============================================================================

describe('API Client', () => {
  const mockedAxios = axios as any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createGame', () => {
    it('should create a new game with default ELO', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: { gameId: MOCK_GAME_ID },
      });

      const result = await createGame();

      expect(mockedAxios.post).toHaveBeenCalledWith('/game', { userElo: 1200 });
      expect(result).toEqual({ gameId: MOCK_GAME_ID });
    });

    it('should create a game with custom ELO', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: { gameId: MOCK_GAME_ID },
      });

      const result = await createGame(1500);

      expect(mockedAxios.post).toHaveBeenCalledWith('/game', { userElo: 1500 });
      expect(result).toEqual({ gameId: MOCK_GAME_ID });
    });

    it('should propagate errors', async () => {
      mockedAxios.post.mockRejectedValueOnce(new Error('Network error'));

      await expect(createGame()).rejects.toThrow('Network error');
    });
  });

  // ============================================================================
  // getTurn Tests
  // ============================================================================

  describe('getTurn', () => {
    it('should get turn data for a game', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: MOCK_TURN_PACKAGE,
      });

      const result = await getTurn(MOCK_GAME_ID);

      expect(mockedAxios.get).toHaveBeenCalledWith(`/game/${MOCK_GAME_ID}/turn`);
      expect(result).toEqual(MOCK_TURN_PACKAGE);
    });

    it('should return choices array', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: MOCK_TURN_PACKAGE,
      });

      const result = await getTurn(MOCK_GAME_ID);

      expect(Array.isArray(result.choices)).toBe(true);
      expect(result.choices.length).toBe(3);
    });

    it('should return FEN string', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: MOCK_TURN_PACKAGE,
      });

      const result = await getTurn(MOCK_GAME_ID);

      expect(typeof result.fen).toBe('string');
      expect(result.fen).toContain('rnbqkbnr');
    });

    it('should propagate 404 errors', async () => {
      mockedAxios.get.mockRejectedValueOnce({
        response: { status: 404 },
        message: 'Game not found',
      });

      await expect(getTurn('invalid-id')).rejects.toMatchObject({
        message: 'Game not found',
      });
    });
  });

  // ============================================================================
  // submitMove Tests
  // ============================================================================

  describe('submitMove', () => {
    it('should submit a move and get response', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: MOCK_MOVE_RESPONSE,
      });

      const result = await submitMove(MOCK_GAME_ID, MOCK_MOVE_REQUEST);

      expect(mockedAxios.post).toHaveBeenCalledWith(
        `/game/${MOCK_GAME_ID}/move`,
        MOCK_MOVE_REQUEST
      );
      expect(result).toEqual(MOCK_MOVE_RESPONSE);
    });

    it('should return success flag', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: MOCK_MOVE_RESPONSE,
      });

      const result = await submitMove(MOCK_GAME_ID, MOCK_MOVE_REQUEST);

      expect(result.success).toBe(true);
    });

    it('should return feedback', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: MOCK_MOVE_RESPONSE,
      });

      const result = await submitMove(MOCK_GAME_ID, MOCK_MOVE_REQUEST);

      expect(result.feedback).toHaveProperty('userMove');
      expect(result.feedback).toHaveProperty('aiMove');
      expect(result.feedback).toHaveProperty('reasoning');
    });

    it('should return nextTurn data', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: MOCK_MOVE_RESPONSE,
      });

      const result = await submitMove(MOCK_GAME_ID, MOCK_MOVE_REQUEST);

      expect(result.nextTurn).toHaveProperty('fen');
      expect(result.nextTurn).toHaveProperty('choices');
    });

    it('should handle move validation errors', async () => {
      mockedAxios.post.mockRejectedValueOnce({
        response: { 
          status: 400,
          data: { error: 'Invalid move' },
        },
        message: 'Request failed with status code 400',
      });

      await expect(submitMove(MOCK_GAME_ID, MOCK_MOVE_REQUEST)).rejects.toMatchObject({
        message: 'Request failed with status code 400',
      });
    });

    it('should handle server errors', async () => {
      mockedAxios.post.mockRejectedValueOnce({
        response: { status: 500 },
        message: 'Internal server error',
      });

      await expect(submitMove(MOCK_GAME_ID, MOCK_MOVE_REQUEST)).rejects.toMatchObject({
        message: 'Internal server error',
      });
    });

    it('should handle timeout errors', async () => {
      mockedAxios.post.mockRejectedValueOnce({
        code: 'ECONNABORTED',
        message: 'timeout of 30000ms exceeded',
      });

      await expect(submitMove(MOCK_GAME_ID, MOCK_MOVE_REQUEST)).rejects.toMatchObject({
        code: 'ECONNABORTED',
      });
    });
  });

  // ============================================================================
  // Request Format Tests
  // ============================================================================

  describe('request format', () => {
    it('should call proper endpoints', async () => {
      mockedAxios.post.mockResolvedValueOnce({ data: { gameId: 'test' } });
      await createGame();
      
      // Verify the post was called with expected path
      expect(mockedAxios.post).toHaveBeenCalledWith('/game', expect.any(Object));
    });

    it('should use correct path format for game operations', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: MOCK_TURN_PACKAGE });
      await getTurn('game-123');
      
      // Verify the path includes the game ID
      expect(mockedAxios.get).toHaveBeenCalledWith('/game/game-123/turn');
    });
  });
});


