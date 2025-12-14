/**
 * Move Controller (OPTIMIZED)
 * 
 * Handles move submission and feedback generation.
 * After user moves, AI opponent responds.
 * 
 * OPTIMIZATIONS:
 * - Parallelize coach explanation + AI move generation
 * - Single game read, pass object through
 * - Reduced engine analysis depth for validation
 */

import { MoveRequest, MoveResponse, MoveFeedback } from '@master-academy/contracts';
import { EngineClient } from '../adapters/engine-client';
import { CoachClient } from '../adapters/coach-client';
import { IGameStore } from '../store/store-interface';
import { TurnController } from './turn-controller';
import { AIOpponent } from '../services/ai-opponent';
import { StyleClient } from '../adapters/style-client';
import { Chess } from 'chess.js';

// Reduced depth for faster validation (was 10)
const QUICK_ANALYSIS_DEPTH = 6;

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
    
    // SINGLE READ: Get game state once
    const game = await this.deps.gameStore.getGame(gameId);
    if (!game) {
      throw new Error(`Game ${gameId} not found`);
    }

    const fen = game.chess.fen();
    const currentTurn = game.currentTurn;
    if (!currentTurn) {
      throw new Error('No current turn package');
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
    // This is the BIG WIN - these were sequential before (~10s -> ~3s)
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
      isGameOverAfterUser 
        ? Promise.resolve(null) 
        : this.aiOpponent.generateMove(fenAfterUserMove).catch(err => {
            console.error('AI opponent error:', err);
            return null;
          }),
    ];

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
      // Build next turn package (this still has Bedrock calls, but user sees feedback first)
      nextTurn = await this.deps.turnController.buildTurnPackage(gameId);
    }

    console.log(`[PERF] Total time: ${Date.now() - startTime}ms`);

    return {
      accepted: true,
      newFen: finalFen,
      feedback,
      nextTurn,
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
