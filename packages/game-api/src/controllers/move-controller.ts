/**
 * Move Controller
 * 
 * Handles move submission and feedback generation.
 * After user moves, AI opponent responds.
 */

import { MoveRequest, MoveResponse, MoveFeedback } from '@master-academy/contracts';
import { EngineClient } from '../adapters/engine-client';
import { CoachClient } from '../adapters/coach-client';
import { GameStore } from '../store/game-store';
import { TurnController } from './turn-controller';
import { AIOpponent } from '../services/ai-opponent';
import { StyleClient } from '../adapters/style-client';

interface MoveControllerDeps {
  engineClient: EngineClient;
  coachClient: CoachClient;
  styleClient: StyleClient;
  gameStore: GameStore;
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

    // Check if game is over after user's move
    let isGameOver = await this.deps.gameStore.isGameOver(gameId);
    let nextTurn: MoveResponse['nextTurn'] = null;
    let aiMoveInfo: { moveSan: string; styleId: string; justification: string } | null = null;

    if (!isGameOver) {
      // AI OPPONENT RESPONDS
      // Get current position after user's move
      const positionAfterUserMove = (await this.deps.gameStore.getFen(gameId))!;
      
      try {
        // Generate AI opponent's move
        const aiMove = await this.aiOpponent.generateMove(positionAfterUserMove);
        
        // Make AI's move on the board
        const aiMoveSuccess = await this.deps.gameStore.makeMove(gameId, aiMove.moveUci);
        
        if (aiMoveSuccess) {
          aiMoveInfo = {
            moveSan: aiMove.moveSan,
            styleId: aiMove.styleId,
            justification: aiMove.justification,
          };
          
          console.log(`AI (${aiMove.styleId}) played: ${aiMove.moveSan}`);
        }
      } catch (error) {
        console.error('AI opponent move failed:', error);
        // Game continues even if AI fails - user can keep playing
      }

      // Check if game is over after AI's move
      isGameOver = await this.deps.gameStore.isGameOver(gameId);
      
      if (!isGameOver) {
        // Build next turn package for user's next move
        nextTurn = await this.deps.turnController.buildTurnPackage(gameId);
      }
    }

    return {
      accepted: true,
      newFen: (await this.deps.gameStore.getFen(gameId))!, // Updated FEN after AI move
      feedback: {
        ...feedback,
        aiMove: aiMoveInfo, // Include AI's move info in feedback
      },
      nextTurn,
    };
  }
}

