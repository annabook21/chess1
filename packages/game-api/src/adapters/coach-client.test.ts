/**
 * CoachClient Tests
 * 
 * Tests the HTTP client for the coach service.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import axios from 'axios';
import { CoachClient } from './coach-client';

// Mock axios
vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => ({
      post: vi.fn(),
    })),
  },
}));

describe('CoachClient', () => {
  let coachClient: CoachClient;
  let mockAxiosInstance: { post: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockAxiosInstance = {
      post: vi.fn(),
    };
    (axios.create as ReturnType<typeof vi.fn>).mockReturnValue(mockAxiosInstance);
    
    coachClient = new CoachClient('http://test-coach:3003');
    
    vi.clearAllMocks();
    // Re-setup after clearAllMocks
    (axios.create as ReturnType<typeof vi.fn>).mockReturnValue(mockAxiosInstance);
    coachClient = new CoachClient('http://test-coach:3003');
  });

  describe('constructor', () => {
    it('should create axios instance with provided base URL', () => {
      new CoachClient('http://custom-coach:8080');

      expect(axios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          baseURL: 'http://custom-coach:8080',
        })
      );
    });

    it('should use default URL from environment when not provided', () => {
      const originalEnv = process.env.COACH_SERVICE_URL;
      process.env.COACH_SERVICE_URL = 'http://env-coach:9000';

      new CoachClient();

      expect(axios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          baseURL: 'http://env-coach:9000',
        })
      );

      process.env.COACH_SERVICE_URL = originalEnv;
    });

    it('should set 15 second timeout', () => {
      new CoachClient('http://test:3003');

      expect(axios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          timeout: 15000,
        })
      );
    });
  });

  describe('explainChoice', () => {
    const STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

    const sampleRequest = {
      fen: STARTING_FEN,
      chosenMove: 'e2e4',
      bestMove: 'e2e4',
      pv: ['e2e4', 'd7d5', 'e4d5'],
      conceptTag: 'center-control',
      userSkill: 1400,
    };

    it('should POST to /coach/explain with request body', async () => {
      mockAxiosInstance.post.mockResolvedValue({
        data: {
          explanation: 'Great move! You controlled the center.',
          conceptTags: ['center-control', 'opening-principle'],
        },
      });

      await coachClient.explainChoice(sampleRequest);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/coach/explain',
        sampleRequest
      );
    });

    it('should return explanation and concept tags', async () => {
      const expectedResponse = {
        explanation: 'The King\'s Pawn opening controls central squares.',
        conceptTags: ['center-control', 'development'],
      };

      mockAxiosInstance.post.mockResolvedValue({
        data: expectedResponse,
      });

      const result = await coachClient.explainChoice(sampleRequest);

      expect(result.explanation).toBe(expectedResponse.explanation);
      expect(result.conceptTags).toEqual(expectedResponse.conceptTags);
    });

    it('should handle best move match', async () => {
      mockAxiosInstance.post.mockResolvedValue({
        data: {
          explanation: 'Excellent! You found the best move.',
          conceptTags: ['best-move'],
        },
      });

      const request = {
        ...sampleRequest,
        chosenMove: 'e2e4',
        bestMove: 'e2e4',
      };

      const result = await coachClient.explainChoice(request);

      expect(result.explanation).toContain('best');
    });

    it('should handle suboptimal move', async () => {
      mockAxiosInstance.post.mockResolvedValue({
        data: {
          explanation: 'd4 was slightly better here, but d3 is solid.',
          conceptTags: ['development'],
        },
      });

      const request = {
        ...sampleRequest,
        chosenMove: 'd2d3',
        bestMove: 'd2d4',
      };

      const result = await coachClient.explainChoice(request);

      expect(result.explanation).toBeDefined();
      expect(typeof result.explanation).toBe('string');
    });

    it('should propagate errors from coach service', async () => {
      mockAxiosInstance.post.mockRejectedValue(new Error('Coach service unavailable'));

      await expect(
        coachClient.explainChoice(sampleRequest)
      ).rejects.toThrow('Coach service unavailable');
    });

    it('should handle different user skill levels', async () => {
      mockAxiosInstance.post.mockResolvedValue({
        data: {
          explanation: 'A beginner-friendly explanation.',
          conceptTags: ['basics'],
        },
      });

      const beginnerRequest = { ...sampleRequest, userSkill: 800 };
      await coachClient.explainChoice(beginnerRequest);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/coach/explain',
        expect.objectContaining({ userSkill: 800 })
      );

      const advancedRequest = { ...sampleRequest, userSkill: 2000 };
      await coachClient.explainChoice(advancedRequest);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/coach/explain',
        expect.objectContaining({ userSkill: 2000 })
      );
    });

    it('should include principal variation in request', async () => {
      mockAxiosInstance.post.mockResolvedValue({
        data: {
          explanation: 'Following the main line...',
          conceptTags: ['theory'],
        },
      });

      const pvRequest = {
        ...sampleRequest,
        pv: ['e2e4', 'e7e5', 'g1f3', 'b8c6', 'f1b5'],
      };

      await coachClient.explainChoice(pvRequest);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/coach/explain',
        expect.objectContaining({
          pv: ['e2e4', 'e7e5', 'g1f3', 'b8c6', 'f1b5'],
        })
      );
    });
  });
});


