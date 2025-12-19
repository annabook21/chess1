/**
 * EngineClient Tests
 * 
 * Tests the HTTP client for the engine service.
 * Based on the actual EngineClient class.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import axios from 'axios';
import { EngineClient } from './engine-client';

// Mock axios
vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => ({
      post: vi.fn(),
      get: vi.fn(),
    })),
  },
}));

const STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

describe('EngineClient', () => {
  let engineClient: EngineClient;
  let mockAxiosInstance: { post: ReturnType<typeof vi.fn>; get: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockAxiosInstance = {
      post: vi.fn(),
      get: vi.fn(),
    };
    (axios.create as ReturnType<typeof vi.fn>).mockReturnValue(mockAxiosInstance);
    
    engineClient = new EngineClient('http://test-engine:3001');
    
    vi.clearAllMocks();
    // Re-setup after clearAllMocks
    (axios.create as ReturnType<typeof vi.fn>).mockReturnValue(mockAxiosInstance);
    engineClient = new EngineClient('http://test-engine:3001');
  });

  describe('constructor', () => {
    it('should create axios instance with provided base URL', () => {
      new EngineClient('http://custom-url:8080');

      expect(axios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          baseURL: 'http://custom-url:8080',
        })
      );
    });

    it('should use default URL from environment when not provided', () => {
      const originalEnv = process.env.ENGINE_SERVICE_URL;
      process.env.ENGINE_SERVICE_URL = 'http://env-url:9000';

      new EngineClient();

      expect(axios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          baseURL: 'http://env-url:9000',
        })
      );

      process.env.ENGINE_SERVICE_URL = originalEnv;
    });

    it('should set 30 second timeout', () => {
      new EngineClient('http://test:3001');

      expect(axios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          timeout: 30000,
        })
      );
    });
  });

  describe('analyzePosition', () => {
    it('should POST to /engine/analyze with request body', async () => {
      mockAxiosInstance.post.mockResolvedValue({
        data: { eval: 0.3, pv: ['e2e4', 'd7d5'] },
      });

      await engineClient.analyzePosition({ fen: STARTING_FEN, depth: 12 });

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/engine/analyze',
        { fen: STARTING_FEN, depth: 12 }
      );
    });

    it('should return eval and principal variation', async () => {
      mockAxiosInstance.post.mockResolvedValue({
        data: { eval: 0.5, pv: ['e2e4', 'e7e5', 'g1f3'] },
      });

      const result = await engineClient.analyzePosition({ fen: STARTING_FEN, depth: 10 });

      expect(result.eval).toBe(0.5);
      expect(result.pv).toEqual(['e2e4', 'e7e5', 'g1f3']);
    });

    it('should propagate errors from engine service', async () => {
      mockAxiosInstance.post.mockRejectedValue(new Error('Engine timeout'));

      await expect(
        engineClient.analyzePosition({ fen: STARTING_FEN, depth: 12 })
      ).rejects.toThrow('Engine timeout');
    });
  });

  describe('isLegalMove', () => {
    it('should GET /engine/is-legal with query params', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: { isLegal: true },
      });

      await engineClient.isLegalMove(STARTING_FEN, 'e2e4');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/engine/is-legal',
        { params: { fen: STARTING_FEN, moveUci: 'e2e4' } }
      );
    });

    it('should return true for legal move', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: { isLegal: true },
      });

      const result = await engineClient.isLegalMove(STARTING_FEN, 'e2e4');

      expect(result).toBe(true);
    });

    it('should return false for illegal move', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: { isLegal: false },
      });

      const result = await engineClient.isLegalMove(STARTING_FEN, 'e2e5');

      expect(result).toBe(false);
    });
  });

  describe('scoreMoves', () => {
    it('should POST to /engine/score-moves', async () => {
      const mockScores = {
        scores: [
          { move: 'e2e4', score: 0.3 },
          { move: 'd2d4', score: 0.25 },
        ],
      };
      mockAxiosInstance.post.mockResolvedValue({ data: mockScores });

      const request = {
        fen: STARTING_FEN,
        moves: ['e2e4', 'd2d4'],
        depth: 10,
      };

      await engineClient.scoreMoves(request);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/engine/score-moves',
        request
      );
    });

    it('should return scores for each move', async () => {
      const mockScores = {
        scores: [
          { move: 'e2e4', score: 0.3 },
          { move: 'd2d4', score: 0.25 },
        ],
      };
      mockAxiosInstance.post.mockResolvedValue({ data: mockScores });

      const result = await engineClient.scoreMoves({
        fen: STARTING_FEN,
        moves: ['e2e4', 'd2d4'],
      });

      expect(result.scores).toHaveLength(2);
      expect(result.scores[0].move).toBe('e2e4');
      expect(result.scores[0].evalDelta).toBe(0.3);
    });
  });

  describe('setStrength', () => {
    it('should POST to /engine/set-strength with ELO', async () => {
      mockAxiosInstance.post.mockResolvedValue({ data: {} });

      await engineClient.setStrength(1500);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/engine/set-strength',
        { elo: 1500 }
      );
    });

    it('should not throw on success', async () => {
      mockAxiosInstance.post.mockResolvedValue({ data: {} });

      await expect(engineClient.setStrength(2000)).resolves.toBeUndefined();
    });
  });
});

