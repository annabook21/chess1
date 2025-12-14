/**
 * Move Controller
 * 
 * Handles move submission and feedback generation
 */

import { MoveRequest, MoveResponse, MoveFeedback } from '@master-academy/contracts';
import { EngineClient } from '../adapters/engine-client';
import { CoachClient } from '../adapters/coach-client';
import { GameStore } from '../store/game-store';
import { TurnController } from './turn-controller';

interface MoveControllerDeps {
  engineClient: EngineClient;
  coachClient: CoachClient;
  gameStore: GameStore;
  turnController: TurnController;
}

export class MoveController {
  constructor(private deps: MoveControllerDeps) {}

  async processMove(gameId: string, request: MoveRequest): Promise<MoveResponse> {
    const game = await this.deps.gameStore.getGame(gameId);
    if (!game) {
      throw new Error(`Game ${gameId} not found`);
    }

    const fen = game.chess.fen();
    const currentTurn = game.currentTurn;
    if (!currentTurn) {
      throw new Error('No current turn package');
    }

    // Validate move is legal
    const isLegal = await this.deps.engineClient.isLegalMove(fen, request.moveUci);
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

    // Get evaluation before move
    const evalBefore = await this.deps.engineClient.analyzePosition({
      fen,
      depth: 10,
    });

    // Make the move
    const moveSuccess = await this.deps.gameStore.makeMove(gameId, request.moveUci);
    if (!moveSuccess) {
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

    const newFen = (await this.deps.gameStore.getFen(gameId))!;

    // Get evaluation after move
    const evalAfter = await this.deps.engineClient.analyzePosition({
      fen: newFen,
      depth: 10,
    });

    // Calculate delta (from perspective of side that just moved)
    const sideToMove = currentTurn.sideToMove;
    const delta = sideToMove === 'w'
      ? evalAfter.eval - evalBefore.eval
      : evalBefore.eval - evalAfter.eval;

    // Determine if blunder (threshold: -200 centipawns)
    const blunder = delta <= -200;

    // Get chosen choice for context
    const chosenChoice = currentTurn.choices.find(c => c.id === request.choiceId);
    const conceptTag = chosenChoice?.conceptTags[0] || 'development';

    // Get coach explanation
    const coachResponse = await this.deps.coachClient.explainChoice({
      fen,
      chosenMove: request.moveUci,
      bestMove: currentTurn.bestMove.moveUci,
      pv: chosenChoice?.pv || [],
      conceptTag,
      userSkill: game.userElo,
    });

    const feedback: MoveFeedback = {
      evalBefore: evalBefore.eval,
      evalAfter: evalAfter.eval,
      delta,
      coachText: coachResponse.explanation,
      conceptTags: coachResponse.conceptTags,
      blunder,
    };

    // Check if game is over
    const isGameOver = await this.deps.gameStore.isGameOver(gameId);
    let nextTurn: MoveResponse['nextTurn'] = null;

    if (!isGameOver) {
      // Build next turn package
      nextTurn = await this.deps.turnController.buildTurnPackage(gameId);
    }

    return {
      accepted: true,
      newFen,
      feedback,
      nextTurn,
    };
  }
}

