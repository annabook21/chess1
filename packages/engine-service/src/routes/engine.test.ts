/**
 * Engine Service Routes Integration Tests
 * 
 * Tests the Express routes with mocked Stockfish wrapper.
 */

import { describe, it, expect, beforeEach, vi, beforeAll, afterAll } from 'vitest';
import express, { Express } from 'express';
import request from 'supertest';

// Mock the StockfishWrapper
vi.mock('../engine/stockfish-wrapper', () => {
  const mockWrapper = {
    analyzePosition: vi.fn().mockResolvedValue({
      eval: 30,
      pv: ['e2e4', 'e7e5'],
      depth: 15,
    }),
    analyzePositionWithTime: vi.fn().mockResolvedValue({
      eval: 25,
      pv: ['d2d4'],
      depth: 10,
    }),
    isLegalMove: vi.fn().mockImplementation((fen: string, move: string) => {
      // Simple mock - e2e4 is always legal, e2e5 is illegal
      return Promise.resolve(move === 'e2e4');
    }),
    scoreMoves: vi.fn().mockResolvedValue([
      { move: 'e2e4', evalDelta: 30, pv: ['e2e4', 'e7e5'] },
      { move: 'd2d4', evalDelta: 25, pv: ['d2d4', 'd7d5'] },
    ]),
    setStrength: vi.fn(),
  };

  return {
    StockfishWrapper: {
      getInstance: vi.fn().mockReturnValue(mockWrapper),
    },
  };
});

import engineRoutes from './engine';
import { StockfishWrapper } from '../engine/stockfish-wrapper';

describe('Engine Routes', () => {
  let app: Express;
  let mockEngine: ReturnType<typeof StockfishWrapper.getInstance>;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/engine', engineRoutes);
    
    mockEngine = StockfishWrapper.getInstance();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /engine/analyze', () => {
    it('should analyze position with depth', async () => {
      const response = await request(app)
        .post('/engine/analyze')
        .send({ fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', depth: 15 });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('eval');
      expect(response.body).toHaveProperty('pv');
      expect(response.body).toHaveProperty('depth');
      expect(mockEngine.analyzePosition).toHaveBeenCalledWith(
        'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        15
      );
    });

    it('should analyze position with time limit', async () => {
      const response = await request(app)
        .post('/engine/analyze')
        .send({ fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', timeMs: 1000 });

      expect(response.status).toBe(200);
      expect(mockEngine.analyzePositionWithTime).toHaveBeenCalledWith(
        'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        1000
      );
    });

    it('should return 400 when FEN is missing', async () => {
      const response = await request(app)
        .post('/engine/analyze')
        .send({ depth: 15 });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('fen is required');
    });

    it('should return 400 when neither depth nor timeMs provided', async () => {
      const response = await request(app)
        .post('/engine/analyze')
        .send({ fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('depth or timeMs is required');
    });

    it('should return 500 on engine error', async () => {
      vi.mocked(mockEngine.analyzePosition).mockRejectedValueOnce(new Error('Engine error'));

      const response = await request(app)
        .post('/engine/analyze')
        .send({ fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', depth: 15 });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to analyze position');
    });
  });

  describe('GET /engine/is-legal', () => {
    it('should return true for legal move', async () => {
      const response = await request(app)
        .get('/engine/is-legal')
        .query({ fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', moveUci: 'e2e4' });

      expect(response.status).toBe(200);
      expect(response.body.isLegal).toBe(true);
    });

    it('should return false for illegal move', async () => {
      const response = await request(app)
        .get('/engine/is-legal')
        .query({ fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', moveUci: 'e2e5' });

      expect(response.status).toBe(200);
      expect(response.body.isLegal).toBe(false);
    });

    it('should return 400 when fen is missing', async () => {
      const response = await request(app)
        .get('/engine/is-legal')
        .query({ moveUci: 'e2e4' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('fen and moveUci query params are required');
    });

    it('should return 400 when moveUci is missing', async () => {
      const response = await request(app)
        .get('/engine/is-legal')
        .query({ fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('fen and moveUci query params are required');
    });

    it('should return 500 on engine error', async () => {
      vi.mocked(mockEngine.isLegalMove).mockRejectedValueOnce(new Error('Check error'));

      const response = await request(app)
        .get('/engine/is-legal')
        .query({ fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', moveUci: 'e2e4' });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to check move legality');
    });
  });

  describe('POST /engine/score-moves', () => {
    it('should score multiple moves', async () => {
      const response = await request(app)
        .post('/engine/score-moves')
        .send({
          fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
          moves: ['e2e4', 'd2d4'],
        });

      expect(response.status).toBe(200);
      expect(response.body.scores).toHaveLength(2);
      expect(response.body.scores[0]).toHaveProperty('move');
      expect(response.body.scores[0]).toHaveProperty('evalDelta');
      expect(response.body.scores[0]).toHaveProperty('pv');
    });

    it('should return 400 when fen is missing', async () => {
      const response = await request(app)
        .post('/engine/score-moves')
        .send({ moves: ['e2e4'] });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('fen and moves array are required');
    });

    it('should return 400 when moves is empty', async () => {
      const response = await request(app)
        .post('/engine/score-moves')
        .send({ fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', moves: [] });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('fen and moves array are required');
    });

    it('should return 400 when moves is not an array', async () => {
      const response = await request(app)
        .post('/engine/score-moves')
        .send({ fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', moves: 'e2e4' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('fen and moves array are required');
    });

    it('should return 500 on engine error', async () => {
      vi.mocked(mockEngine.scoreMoves).mockRejectedValueOnce(new Error('Score error'));

      const response = await request(app)
        .post('/engine/score-moves')
        .send({
          fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
          moves: ['e2e4'],
        });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to score moves');
    });
  });

  describe('POST /engine/set-strength', () => {
    it('should set engine strength', async () => {
      const response = await request(app)
        .post('/engine/set-strength')
        .send({ elo: 1500 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(mockEngine.setStrength).toHaveBeenCalledWith(1500);
    });

    it('should return 400 for ELO below minimum', async () => {
      const response = await request(app)
        .post('/engine/set-strength')
        .send({ elo: 500 });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('elo must be a number between 800 and 3000');
    });

    it('should return 400 for ELO above maximum', async () => {
      const response = await request(app)
        .post('/engine/set-strength')
        .send({ elo: 3500 });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('elo must be a number between 800 and 3000');
    });

    it('should return 400 for non-numeric ELO', async () => {
      const response = await request(app)
        .post('/engine/set-strength')
        .send({ elo: 'strong' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('elo must be a number between 800 and 3000');
    });

    it('should accept ELO at boundaries', async () => {
      const response1 = await request(app)
        .post('/engine/set-strength')
        .send({ elo: 800 });
      expect(response1.status).toBe(200);

      const response2 = await request(app)
        .post('/engine/set-strength')
        .send({ elo: 3000 });
      expect(response2.status).toBe(200);
    });
  });
});
