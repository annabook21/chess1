/**
 * Game API Routes
 */

import { Router, Request, Response } from 'express';
import { TurnController } from '../controllers/turn-controller';
import { MoveController } from '../controllers/move-controller';
import { GameStore } from '../store/game-store';
import { DynamoGameStore } from '../store/dynamo-game-store';
import { IGameStore } from '../store/store-interface';
import { ChoiceBuilder } from '../services/choice-builder';
import { EngineClient } from '../adapters/engine-client';
import { StyleClient } from '../adapters/style-client';
import { CoachClient } from '../adapters/coach-client';
import { MoveRequest } from '@master-academy/contracts';

const router = Router();

// Initialize dependencies (in production, use DI container)
const gameStore: IGameStore = process.env.DDB_TABLE_NAME
  ? new DynamoGameStore(process.env.DDB_TABLE_NAME)
  : new GameStore();
const engineClient = new EngineClient();
const styleClient = new StyleClient();
const coachClient = new CoachClient();
const choiceBuilder = new ChoiceBuilder({ engineClient, styleClient });
const turnController = new TurnController({
  choiceBuilder,
  engineClient,
  gameStore: gameStore as any,
});
const moveController = new MoveController({
  engineClient,
  coachClient,
  styleClient,
  gameStore: gameStore as any,
  turnController,
});

/**
 * POST /game
 * Create a new game
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const userElo = req.body.userElo || 1200;
    const gameId = await gameStore.createGame(userElo);
    res.json({ gameId });
  } catch (error) {
    console.error('Error creating game:', error);
    res.status(500).json({ error: 'Failed to create game' });
  }
});

/**
 * GET /game/:gameId/turn
 * Get current turn package
 */
router.get('/:gameId/turn', async (req: Request, res: Response) => {
  try {
    const { gameId } = req.params;
    const turnPackage = await turnController.buildTurnPackage(gameId);
    res.json(turnPackage);
  } catch (error) {
    console.error('Error building turn package:', error);
    res.status(500).json({ error: 'Failed to build turn package' });
  }
});

/**
 * POST /game/:gameId/move
 * Submit a move
 */
router.post('/:gameId/move', async (req: Request, res: Response) => {
  try {
    const { gameId } = req.params;
    const moveRequest: MoveRequest = req.body;

    if (!moveRequest.moveUci || !moveRequest.choiceId) {
      return res.status(400).json({ error: 'moveUci and choiceId are required' });
    }

    const response = await moveController.processMove(gameId, moveRequest);
    res.json(response);
  } catch (error) {
    console.error('Error processing move:', error);
    res.status(500).json({ error: 'Failed to process move' });
  }
});

export default router;

