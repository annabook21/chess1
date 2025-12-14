/**
 * Turn Controller
 * 
 * Orchestrates building a turn package
 */

import { TurnPackage, Difficulty, TelemetryHints } from '@master-academy/contracts';
import { ChoiceBuilder } from '../services/choice-builder';
import { calculateDifficulty, calculateTimeBudget } from '../services/difficulty';
import { EngineClient } from '../adapters/engine-client';
import { IGameStore } from '../store/store-interface';

interface TurnControllerDeps {
  choiceBuilder: ChoiceBuilder;
  engineClient: EngineClient;
  gameStore: IGameStore;
}

export class TurnController {
  constructor(private deps: TurnControllerDeps) {}

  async buildTurnPackage(gameId: string): Promise<TurnPackage> {
    const game = await this.deps.gameStore.getGame(gameId);
    if (!game) {
      throw new Error(`Game ${gameId} not found`);
    }

    const fen = game.chess.fen();
    const sideToMove = game.chess.turn() === 'w' ? 'w' : 'b';
    
    // Set engine strength
    const difficulty = calculateDifficulty(game.userElo);
    await this.deps.engineClient.setStrength(difficulty.engineElo);

    // Get engine's best move
    const engineAnalysis = await this.deps.engineClient.analyzePosition({
      fen,
      depth: 12,
    });

    // Build 3 choices
    const choices = await this.deps.choiceBuilder.buildChoices(fen, difficulty);

    // Calculate time budget
    const moveNumber = game.chess.moveNumber();
    const timeBudgetMs = calculateTimeBudget(difficulty, moveNumber);

    const turnPackage: TurnPackage = {
      gameId,
      fen,
      sideToMove,
      choices,
      bestMove: {
        moveUci: engineAnalysis.pv[0] || choices[0]?.moveUci || '',
        eval: engineAnalysis.eval,
      },
      difficulty,
      telemetryHints: {
        timeBudgetMs,
      },
    };

    // Store current turn
    await this.deps.gameStore.updateGame(gameId, { currentTurn: turnPackage });

    return turnPackage;
  }
}

