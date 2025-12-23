/**
 * Engine Service API Routes
 */

import { Router, Request, Response } from 'express';
import { StockfishWrapper } from '../engine/stockfish-wrapper';
import {
  AnalyzePositionRequest,
  AnalyzePositionResponse,
  ScoreMovesRequest,
  ScoreMovesResponse,
} from '@master-academy/contracts';

const router = Router();
const engine = StockfishWrapper.getInstance();

/**
 * POST /analyze
 * Analyze a position to a given depth or time
 */
router.post('/analyze', async (req: Request, res: Response) => {
  try {
    const { fen, depth, timeMs }: AnalyzePositionRequest = req.body;

    if (!fen) {
      return res.status(400).json({ error: 'fen is required' });
    }

    // Cap depth and time to prevent abuse
    const cappedDepth = depth ? Math.min(depth, 20) : undefined;
    const cappedTime = timeMs ? Math.min(timeMs, 10000) : undefined; // 10s max

    let analysis;
    if (cappedDepth) {
      analysis = await engine.analyzePosition(fen, cappedDepth);
    } else if (cappedTime) {
      analysis = await engine.analyzePositionWithTime(fen, cappedTime);
    } else {
      return res.status(400).json({ error: 'depth or timeMs is required' });
    }

    const response: AnalyzePositionResponse = {
      eval: analysis.eval,
      pv: analysis.pv,
      depth: analysis.depth,
    };

    res.json(response);
  } catch (error) {
    console.error('Error analyzing position:', error);
    res.status(500).json({ error: 'Failed to analyze position' });
  }
});

/**
 * GET /is-legal
 * Check if a move is legal
 */
router.get('/is-legal', async (req: Request, res: Response) => {
  try {
    const { fen, moveUci } = req.query;

    if (!fen || !moveUci || typeof fen !== 'string' || typeof moveUci !== 'string') {
      return res.status(400).json({ error: 'fen and moveUci query params are required' });
    }

    const isLegal = await engine.isLegalMove(fen, moveUci);
    res.json({ isLegal });
  } catch (error) {
    console.error('Error checking move legality:', error);
    res.status(500).json({ error: 'Failed to check move legality' });
  }
});

/**
 * POST /score-moves
 * Score multiple moves from a position
 */
router.post('/score-moves', async (req: Request, res: Response) => {
  try {
    const { fen, moves }: ScoreMovesRequest = req.body;

    if (!fen || !Array.isArray(moves) || moves.length === 0) {
      return res.status(400).json({ error: 'fen and moves array are required' });
    }

    const scores = await engine.scoreMoves(fen, moves);
    const response: ScoreMovesResponse = { scores };
    res.json(response);
  } catch (error) {
    console.error('Error scoring moves:', error);
    res.status(500).json({ error: 'Failed to score moves' });
  }
});

/**
 * POST /set-strength
 * Set engine strength (ELO)
 */
router.post('/set-strength', (req: Request, res: Response) => {
  try {
    const { elo } = req.body;

    if (typeof elo !== 'number' || elo < 800 || elo > 3000) {
      return res.status(400).json({ error: 'elo must be a number between 800 and 3000' });
    }

    engine.setStrength(elo);
    res.json({ success: true });
  } catch (error) {
    console.error('Error setting engine strength:', error);
    res.status(500).json({ error: 'Failed to set engine strength' });
  }
});

export default router;

