/**
 * StyleClient Tests
 * 
 * Tests the HTTP client for the style service.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import axios from 'axios';
import { StyleClient } from './style-client';

// Mock axios
vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => ({
      post: vi.fn(),
    })),
  },
}));

describe('StyleClient', () => {
  let styleClient: StyleClient;
  let mockAxiosInstance: { post: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockAxiosInstance = {
      post: vi.fn(),
    };
    (axios.create as ReturnType<typeof vi.fn>).mockReturnValue(mockAxiosInstance);
    
    styleClient = new StyleClient('http://test-style:3002');
    
    vi.clearAllMocks();
    // Re-setup after clearAllMocks
    (axios.create as ReturnType<typeof vi.fn>).mockReturnValue(mockAxiosInstance);
    styleClient = new StyleClient('http://test-style:3002');
  });

  describe('constructor', () => {
    it('should create axios instance with provided base URL', () => {
      new StyleClient('http://custom-url:8080');

      expect(axios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          baseURL: 'http://custom-url:8080',
        })
      );
    });

    it('should use default URL from environment when not provided', () => {
      const originalEnv = process.env.STYLE_SERVICE_URL;
      process.env.STYLE_SERVICE_URL = 'http://env-style:9000';

      new StyleClient();

      expect(axios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          baseURL: 'http://env-style:9000',
        })
      );

      process.env.STYLE_SERVICE_URL = originalEnv;
    });

    it('should set 5 second timeout', () => {
      new StyleClient('http://test:3002');

      expect(axios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          timeout: 5000,
        })
      );
    });
  });

  describe('suggestMoves', () => {
    const STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

    it('should POST to /style/suggest with correct request', async () => {
      mockAxiosInstance.post.mockResolvedValue({
        data: { moves: ['e2e4', 'd2d4', 'g1f3'] },
      });

      await styleClient.suggestMoves(STARTING_FEN, 'fischer', 3);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/style/suggest',
        {
          fen: STARTING_FEN,
          styleId: 'fischer',
          topK: 3,
        }
      );
    });

    it('should return array of move strings', async () => {
      const expectedMoves = ['e2e4', 'd2d4', 'c2c4'];
      mockAxiosInstance.post.mockResolvedValue({
        data: { moves: expectedMoves },
      });

      const result = await styleClient.suggestMoves(STARTING_FEN, 'capablanca', 3);

      expect(result).toEqual(expectedMoves);
    });

    it('should default topK to 10 when not provided', async () => {
      mockAxiosInstance.post.mockResolvedValue({
        data: { moves: [] },
      });

      await styleClient.suggestMoves(STARTING_FEN, 'tal');

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/style/suggest',
        expect.objectContaining({
          topK: 10,
        })
      );
    });

    it('should work with different master styles', async () => {
      mockAxiosInstance.post.mockResolvedValue({
        data: { moves: ['e2e4'] },
      });

      const styles: Array<'tal' | 'karpov' | 'capablanca' | 'fischer' | 'human-like'> = 
        ['tal', 'karpov', 'capablanca', 'fischer', 'human-like'];

      for (const style of styles) {
        await styleClient.suggestMoves(STARTING_FEN, style, 1);
        
        expect(mockAxiosInstance.post).toHaveBeenCalledWith(
          '/style/suggest',
          expect.objectContaining({ styleId: style })
        );
      }
    });

    it('should propagate errors from style service', async () => {
      mockAxiosInstance.post.mockRejectedValue(new Error('Style service timeout'));

      await expect(
        styleClient.suggestMoves(STARTING_FEN, 'fischer', 3)
      ).rejects.toThrow('Style service timeout');
    });

    it('should handle empty response', async () => {
      mockAxiosInstance.post.mockResolvedValue({
        data: { moves: [] },
      });

      const result = await styleClient.suggestMoves(STARTING_FEN, 'karpov', 5);

      expect(result).toEqual([]);
    });
  });
});


