/**
 * Coach Service API Routes
 */

import { Router, Request, Response } from 'express';
import { Chess } from 'chess.js';
import { ExplainChoiceRequest, ExplainChoiceResponse } from '@master-academy/contracts';
import { buildCoachPrompt, refineConceptTags } from '../prompts/coach-prompts';
import { BedrockClient } from '../clients/bedrock-client';

const router = Router();
const bedrockClient = new BedrockClient();

// Response cache
interface CacheEntry {
  explanation: string;
  conceptTags: string[];
  timestamp: number;
}

const explanationCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_SIZE = 100;

// Rate limiting state (simple in-memory for single instance)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10;

/**
 * Simple rate limiting middleware
 */
function rateLimiter(req: Request, res: Response, next: Function) {
  const clientIp = req.ip || 'unknown';
  const now = Date.now();

  let rateLimitEntry = rateLimitMap.get(clientIp);

  // Reset if window expired
  if (!rateLimitEntry || now > rateLimitEntry.resetTime) {
    rateLimitEntry = {
      count: 0,
      resetTime: now + RATE_LIMIT_WINDOW_MS,
    };
    rateLimitMap.set(clientIp, rateLimitEntry);
  }

  // Check limit
  if (rateLimitEntry.count >= RATE_LIMIT_MAX_REQUESTS) {
    return res.status(429).json({
      error: 'Too many explanation requests. Please wait a moment.',
      retryAfter: Math.ceil((rateLimitEntry.resetTime - now) / 1000),
    });
  }

  rateLimitEntry.count++;
  next();
}

/**
 * Timeout wrapper for async operations
 */
async function generateWithTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  fallback: T
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) =>
      setTimeout(() => {
        console.warn('[COACH] Request timed out, using fallback');
        resolve(fallback);
      }, timeoutMs)
    ),
  ]);
}

/**
 * Get fallback explanation based on evalDelta
 */
function getFallbackExplanation(request: ExplainChoiceRequest): string {
  const evalDelta = request.evalAfter - request.evalBefore;

  if (evalDelta < -200) {
    return `Your move ${request.chosenMove} was a significant blunder, losing material or position. The computer's best move was ${request.bestMove}, which would have maintained a better position. Review the tactical situation carefully.`;
  } else if (evalDelta < -50) {
    return `Your move ${request.chosenMove} was inaccurate. The better move was ${request.bestMove}. Try to calculate one or two moves deeper to find stronger continuations.`;
  } else {
    return `Your move ${request.chosenMove} was reasonable but not the strongest. The computer prefers ${request.bestMove}. Both moves are playable at your level.`;
  }
}

/**
 * Validate UCI move format
 */
function isValidUCIMove(move: string): boolean {
  const uciRegex = /^[a-h][1-8][a-h][1-8][qrbn]?$/;
  return uciRegex.test(move);
}

/**
 * POST /coach/explain
 * Generate coaching explanation for a move choice
 */
router.post('/explain', rateLimiter, async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    const request: ExplainChoiceRequest = req.body;

    // Validate required fields
    if (!request.fen || !request.chosenMove || !request.bestMove) {
      return res.status(400).json({ error: 'fen, chosenMove, and bestMove are required' });
    }

    // Validate evalBefore and evalAfter
    if (typeof request.evalBefore !== 'number' || typeof request.evalAfter !== 'number') {
      return res.status(400).json({ error: 'evalBefore and evalAfter must be numbers' });
    }

    // Validate FEN
    let chess: Chess;
    try {
      chess = new Chess(request.fen);
    } catch {
      return res.status(400).json({ error: 'Invalid FEN' });
    }

    // Validate move formats
    if (!isValidUCIMove(request.chosenMove)) {
      return res.status(400).json({ error: 'Invalid chosenMove format (must be UCI)' });
    }
    if (!isValidUCIMove(request.bestMove)) {
      return res.status(400).json({ error: 'Invalid bestMove format (must be UCI)' });
    }

    // Validate chosen move is legal in this position
    try {
      const chosenFrom = request.chosenMove.slice(0, 2);
      const chosenTo = request.chosenMove.slice(2, 4);
      const chosenPromo = request.chosenMove.length > 4 ? request.chosenMove[4] : undefined;

      const testChess = new Chess(request.fen);
      const move = testChess.move({ from: chosenFrom, to: chosenTo, promotion: chosenPromo as any });
      if (!move) {
        return res.status(400).json({ error: 'chosenMove is not legal in this position' });
      }
    } catch {
      return res.status(400).json({ error: 'Failed to validate chosenMove legality' });
    }

    // Create cache key
    const cacheKey = `${request.fen}:${request.chosenMove}:${request.bestMove}`;

    // Check cache
    const cached = explanationCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      const duration = Date.now() - startTime;
      console.log('[COACH] Cache hit', { duration, cacheKey: cacheKey.substring(0, 30) });

      return res.json({
        explanation: cached.explanation,
        conceptTags: cached.conceptTags,
        requestContext: {
          chosenMove: request.chosenMove,
          timestamp: Date.now(),
        },
      });
    }

    // Calculate evalDelta for concept refinement
    const evalDelta = request.evalAfter - request.evalBefore;

    // Build prompt
    const prompt = buildCoachPrompt(request);

    // Estimate tokens (rough: 1 token ≈ 4 chars)
    const estimatedTokens = prompt.length / 4;
    if (estimatedTokens > 1500) {
      console.warn('[COACH] Prompt is large:', estimatedTokens, 'tokens');
    }

    // Generate explanation with timeout and context
    const explanation = await generateWithTimeout(
      bedrockClient.generateText(prompt, {
        context: {
          chosenMove: request.chosenMove,
          bestMove: request.bestMove,
          evalDelta,
        },
      }),
      15000, // 15 second timeout
      getFallbackExplanation(request)
    );

    // Refine concept tags with actual evalDelta
    const conceptTags = refineConceptTags(
      request.conceptTag || 'general',
      evalDelta,
      request.pv || []
    );

    // Cache the result
    explanationCache.set(cacheKey, {
      explanation,
      conceptTags,
      timestamp: Date.now(),
    });

    // Clean up old cache entries if cache is too large
    if (explanationCache.size > MAX_CACHE_SIZE) {
      const now = Date.now();
      for (const [key, entry] of explanationCache.entries()) {
        if (now - entry.timestamp > CACHE_TTL_MS) {
          explanationCache.delete(key);
        }
      }
    }

    const duration = Date.now() - startTime;
    console.log('[COACH] Explanation generated', {
      duration,
      cached: false,
      chosenMove: request.chosenMove,
      evalDelta,
      conceptTag: request.conceptTag,
    });

    const response: ExplainChoiceResponse = {
      explanation,
      conceptTags,
      requestContext: {
        chosenMove: request.chosenMove,
        timestamp: Date.now(),
      },
    };

    res.json(response);
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error('[COACH] Error after', duration, 'ms:', error);

    const request: ExplainChoiceRequest = req.body;

    // Classify error
    if (error.name === 'ValidationException') {
      return res.status(400).json({
        error: 'Invalid request parameters',
        details: error.message,
      });
    }

    if (error.name === 'ThrottlingException') {
      return res.status(429).json({
        error: 'Too many requests. Please wait a moment and try again.',
        retryAfter: 5,
      });
    }

    if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
      return res.status(504).json({
        error: 'Request timed out. The position may be too complex to analyze quickly.',
      });
    }

    // Return fallback explanation instead of generic error
    try {
      const fallbackResponse: ExplainChoiceResponse = {
        explanation: getFallbackExplanation(request),
        conceptTags: [request.conceptTag || 'general'],
        requestContext: {
          chosenMove: request.chosenMove,
          timestamp: Date.now(),
        },
      };

      return res.json(fallbackResponse);
    } catch {
      // If even fallback fails, return generic error
      res.status(500).json({
        error: 'Failed to generate explanation. Please try again.',
      });
    }
  }
});

export default router;
