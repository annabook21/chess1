/**
 * Move Controller (OPTIMIZED v2)
 * 
 * Handles move submission and feedback generation.
 * After user moves, AI opponent responds.
 * 
 * OPTIMIZATIONS:
 * - Parallelize coach explanation + AI move generation
 * - Single game read, pass object through
 * - Reduced engine analysis depth for validation
 * - Pre-compute next turn asynchronously (returns immediately)
 */

import { MoveRequest, MoveResponse, MoveFeedback, TurnPackage } from '@master-academy/contracts';
import { EngineClient } from '../adapters/engine-client';
import { CoachClient } from '../adapters/coach-client';
import { IGameStore } from '../store/store-interface';
import { TurnController } from './turn-controller';
import { AIOpponent } from '../services/ai-opponent';
import { StyleClient } from '../adapters/style-client';
import { Chess } from 'chess.js';

// Reduced depth for faster validation (was 10)
const QUICK_ANALYSIS_DEPTH = 6;

// LRU Cache with TTL for pre-computed turns (prevents memory leaks)
// Max 100 entries, 5 minute TTL
const CACHE_MAX_SIZE = 100;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface CacheEntry {
  turn: TurnPackage;
  timestamp: number;
  lastAccess: number;
}

class TurnCache {
  private cache = new Map<string, CacheEntry>();

  get(gameId: string): TurnPackage | undefined {
    const entry = this.cache.get(gameId);
    if (!entry) return undefined;

    // Check TTL
    if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
      this.cache.delete(gameId);
      return undefined;
    }

    // Update last access for LRU
    entry.lastAccess = Date.now();
    return entry.turn;
  }

  set(gameId: string, turn: TurnPackage): void {
    // Evict oldest entries if at capacity
    if (this.cache.size >= CACHE_MAX_SIZE) {
      this.evictOldest();
    }

    this.cache.set(gameId, {
      turn,
      timestamp: Date.now(),
      lastAccess: Date.now(),
    });
  }

  delete(gameId: string): void {
    this.cache.delete(gameId);
  }

  has(gameId: string): boolean {
    const entry = this.cache.get(gameId);
    if (!entry) return false;
    if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
      this.cache.delete(gameId);
      return false;
    }
    return true;
  }

  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestAccess = Infinity;

    for (const [key, entry] of this.cache) {
      // First, remove expired entries
      if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
        this.cache.delete(key);
        continue;
      }
      // Track least recently accessed
      if (entry.lastAccess < oldestAccess) {
        oldestAccess = entry.lastAccess;
        oldestKey = key;
      }
    }

    // If still at capacity, remove LRU entry
    if (this.cache.size >= CACHE_MAX_SIZE && oldestKey) {
      this.cache.delete(oldestKey);
    }
  }
}

const precomputedTurns = new TurnCache();
const precomputeInProgress = new Set<string>();

interface MoveControllerDeps {
  engineClient: EngineClient;
  coachClient: CoachClient;
  styleClient: StyleClient;
  gameStore: IGameStore;
  turnController: TurnController;
}

export class MoveController {
  private aiOpponent: AIOpponent;

  constructor(private deps: MoveControllerDeps) {
    this.aiOpponent = new AIOpponent({
      styleClient: deps.styleClient,
      engineClient: deps.engineClient,
    });
  }

  async processMove(gameId: string, request: MoveRequest): Promise<MoveResponse> {
    const startTime = Date.now();
    
    // Check if we have a pre-computed turn from a previous move
    const cachedTurn = precomputedTurns.get(gameId);
    if (cachedTurn) {
      console.log(`[PERF] Using pre-computed turn for ${gameId}`);
      precomputedTurns.delete(gameId);
    }
    
    // SINGLE READ: Get game state once
    const game = await this.deps.gameStore.getGame(gameId);
    if (!game) {
      throw new Error(`Game ${gameId} not found`);
    }

    const fen = game.chess.fen();
    
    // Get current turn - from cache, game state, or build on demand
    let currentTurn = cachedTurn || game.currentTurn;
    if (!currentTurn) {
      // Build turn package on demand (DynamoDB doesn't store it anymore)
      console.log(`[PERF] Building turn package on demand for ${gameId}`);
      currentTurn = await this.deps.turnController.buildTurnPackage(gameId, game.chess, game.userElo);
    }

    console.log(`[PERF] Game loaded: ${Date.now() - startTime}ms`);

    // PARALLEL: Validate move + get eval before (both fast operations)
    const [isLegal, evalBefore] = await Promise.all([
      this.deps.engineClient.isLegalMove(fen, request.moveUci),
      this.deps.engineClient.analyzePosition({ fen, depth: QUICK_ANALYSIS_DEPTH }),
    ]);

    console.log(`[PERF] Validation + eval: ${Date.now() - startTime}ms`);

    if (!isLegal) {
      return {
        accepted: false,
        newFen: fen,
        feedback: {
          evalBefore: 0,
          evalAfter: 0,
          delta: 0,
          coachText: 'Illegal move. Please try again.',
          conceptTags: [],
          blunder: false,
        },
        nextTurn: null,
      };
    }

    // Make the user's move (uses game.chess directly to avoid extra read)
    const userMoveSuccess = this.makeLocalMove(game.chess, request.moveUci);
    if (!userMoveSuccess) {
      return {
        accepted: false,
        newFen: fen,
        feedback: {
          evalBefore: evalBefore.eval,
          evalAfter: evalBefore.eval,
          delta: 0,
          coachText: 'Failed to make move.',
          conceptTags: [],
          blunder: false,
        },
        nextTurn: null,
      };
    }

    const fenAfterUserMove = game.chess.fen();
    
    // Persist user's move
    await this.deps.gameStore.updateGame(gameId, { fen: fenAfterUserMove });
    
    console.log(`[PERF] User move applied: ${Date.now() - startTime}ms`);

    // Get chosen choice for context
    const chosenChoice = currentTurn.choices.find(c => c.id === request.choiceId);
    const conceptTag = chosenChoice?.conceptTags[0] || 'development';

    // Check if game is over after user's move (use local chess instance)
    const isGameOverAfterUser = game.chess.isGameOver();

    // PARALLEL: Get eval after + coach explanation + AI move (if game not over)
    // Skip AI move generation if frontend handles it (e.g., using Maia)
    const shouldGenerateAiMove = !isGameOverAfterUser && !request.skipAiMove;
    
    const parallelPromises: [
      Promise<{ eval: number; pv: string[] }>,
      Promise<{ explanation: string; conceptTags: string[] }>,
      Promise<{ moveUci: string; moveSan: string; styleId: string; justification: string } | null>
    ] = [
      this.deps.engineClient.analyzePosition({ fen: fenAfterUserMove, depth: QUICK_ANALYSIS_DEPTH }),
      this.deps.coachClient.explainChoice({
        fen,
        chosenMove: request.moveUci,
        bestMove: currentTurn.bestMove.moveUci,
        pv: chosenChoice?.pv || [],
        conceptTag,
        userSkill: game.userElo,
      }),
      shouldGenerateAiMove 
        ? this.aiOpponent.generateMove(fenAfterUserMove).catch(err => {
            console.error('AI opponent error:', err);
            return null;
          })
        : Promise.resolve(null),
    ];
    
    if (request.skipAiMove) {
      console.log('[PERF] Skipping backend AI move generation (frontend handles it)');
    }

    const [evalAfter, coachResponse, aiMoveResult] = await Promise.all(parallelPromises);

    console.log(`[PERF] Parallel ops done: ${Date.now() - startTime}ms`);

    // Calculate delta (from perspective of side that just moved)
    const sideToMove = currentTurn.sideToMove;
    const delta = sideToMove === 'w'
      ? evalAfter.eval - evalBefore.eval
      : evalBefore.eval - evalAfter.eval;

    // Determine if blunder (threshold: -200 centipawns)
    const blunder = delta <= -200;

    let aiMoveInfo: { moveSan: string; styleId: string; justification: string } | undefined;
    let finalFen = fenAfterUserMove;

    // Apply AI move if generated
    if (aiMoveResult && !isGameOverAfterUser) {
      const aiMoveSuccess = this.makeLocalMove(game.chess, aiMoveResult.moveUci);
      if (aiMoveSuccess) {
        finalFen = game.chess.fen();
        await this.deps.gameStore.updateGame(gameId, { fen: finalFen });
        
        aiMoveInfo = {
          moveSan: aiMoveResult.moveSan,
          styleId: aiMoveResult.styleId,
          justification: aiMoveResult.justification,
        };
        console.log(`[PERF] AI (${aiMoveResult.styleId}) played: ${aiMoveResult.moveSan}`);
      }
    }

    console.log(`[PERF] AI move applied: ${Date.now() - startTime}ms`);

    const feedback: MoveFeedback = {
      evalBefore: evalBefore.eval,
      evalAfter: evalAfter.eval,
      delta,
      coachText: coachResponse.explanation,
      conceptTags: coachResponse.conceptTags,
      blunder,
      aiMove: aiMoveInfo,
    };

    // Check if game is over after AI's move
    const isGameOver = game.chess.isGameOver();
    let nextTurn: MoveResponse['nextTurn'] = null;

    if (!isGameOver) {
      // Wait for full turn package - provides better UX with real analysis
      try {
        nextTurn = await this.deps.turnController.buildTurnPackage(
          gameId, 
          game.chess,  // Pass updated local chess instance
          game.userElo
        );
        console.log(`[PERF] Full turn package built: ${Date.now() - startTime}ms`);
      } catch (err) {
        console.error('Turn build error:', err);
        // Fallback to quick package only if full package fails
        nextTurn = this.buildQuickTurnPackage(gameId, game.chess);
      }
    }

    console.log(`[PERF] Total time (before async precompute): ${Date.now() - startTime}ms`);

    return {
      accepted: true,
      newFen: finalFen,
      feedback,
      nextTurn,
    };
  }

  /**
   * Pre-compute the next turn package in the background
   */
  private async precomputeNextTurn(gameId: string, fen: string): Promise<void> {
    // Prevent duplicate computations
    if (precomputeInProgress.has(gameId)) {
      console.log(`[PRECOMPUTE] Already computing for ${gameId}`);
      return;
    }

    precomputeInProgress.add(gameId);
    const startTime = Date.now();
    
    try {
      console.log(`[PRECOMPUTE] Starting for ${gameId}`);
      const turnPackage = await this.deps.turnController.buildTurnPackage(gameId);
      
      // Cache the result
      precomputedTurns.set(gameId, turnPackage);
      console.log(`[PRECOMPUTE] Completed for ${gameId} in ${Date.now() - startTime}ms`);
      
      // Store in DB for persistence
      await this.deps.gameStore.updateGame(gameId, { currentTurn: turnPackage });
    } catch (error) {
      console.error(`[PRECOMPUTE] Failed for ${gameId}:`, error);
    } finally {
      precomputeInProgress.delete(gameId);
    }
  }

  /**
   * Build a quick turn package with minimal choices
   * This is returned immediately while full package is computed in background
   */
  private buildQuickTurnPackage(gameId: string, chess: Chess): TurnPackage {
    const fen = chess.fen();
    const legalMoves = chess.moves({ verbose: true });
    const sideToMove = chess.turn() === 'w' ? 'w' : 'b';

    // Get 3 random legal moves as placeholder choices
    const shuffled = [...legalMoves].sort(() => Math.random() - 0.5);
    const topMoves = shuffled.slice(0, 3);

    const quickChoices = topMoves.map((move, idx) => ({
      id: String.fromCharCode(65 + idx), // A, B, C
      moveUci: `${move.from}${move.to}${move.promotion || ''}`,
      styleId: (['fischer', 'tal', 'capablanca'] as const)[idx],
      planOneLiner: 'Analyzing...',
      pv: [`${move.from}${move.to}`],
      eval: 0,
      conceptTags: ['development'],
    }));

    return {
      gameId,
      fen,
      sideToMove,
      choices: quickChoices,
      bestMove: {
        moveUci: quickChoices[0]?.moveUci || '',
        eval: 0,
      },
      difficulty: {
        engineElo: 1400,
        hintLevel: 2,
      },
      telemetryHints: {
        timeBudgetMs: 250,
      },
    };
  }

  /**
   * Make a move on a local chess.js instance (avoids DynamoDB read)
   */
  private makeLocalMove(chess: Chess, moveUci: string): boolean {
    try {
      const from = moveUci.substring(0, 2);
      const to = moveUci.substring(2, 4);
      const promotion = moveUci.length > 4 ? moveUci[4] : undefined;
      const move = chess.move({ from, to, promotion: promotion as 'q' | 'r' | 'b' | 'n' | undefined });
      return !!move;
    } catch {
      return false;
    }
  }
}
