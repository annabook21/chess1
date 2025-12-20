/**
 * XState Chess Game Services
 * 
 * Async operations for the game state machine.
 * These are invoked as services in XState.
 */

import { fromPromise } from 'xstate';
import { Chess } from 'chess.js';
import { createGame, getTurn, submitMove } from '../api/client';
import type { TurnPackage, MoveRequest, MoveResponse } from '@master-academy/contracts';
import type { GameContext, MaiaRating } from './types';

// ============================================================================
// API SERVICES
// ============================================================================

/**
 * Create a new game on the server
 */
export const createGameService = fromPromise<
  { gameId: string; turnPackage: TurnPackage },
  { playerRating: number }
>(async ({ input }) => {
  const { gameId } = await createGame(input.playerRating);
  const turnPackage = await getTurn(gameId);
  return { gameId, turnPackage };
});

/**
 * Submit a move to the server
 */
export const submitMoveService = fromPromise<
  MoveResponse,
  { 
    gameId: string; 
    moveRequest: MoveRequest;
  }
>(async ({ input }) => {
  const response = await submitMove(input.gameId, input.moveRequest);
  return response;
});

/**
 * Fetch turn package from server
 */
export const fetchTurnService = fromPromise<
  TurnPackage,
  { gameId: string }
>(async ({ input }) => {
  return await getTurn(input.gameId);
});

// ============================================================================
// MAIA SERVICES
// ============================================================================

/**
 * Generate a move using Maia neural network
 * This will be called from the MaiaContext
 */
export interface MaiaMoveResult {
  moveUci: string;
  moveSan: string;
  probability: number;
}

/**
 * Parameters for Maia move generation
 */
export interface MaiaMoveParams {
  fen: string;
  targetRating: MaiaRating;
  predict: (fen: string) => Promise<{
    predictions: Array<{
      uci: string;
      san?: string;
      probability: number;
    }>;
  }>;
  sampleMove: (
    predictions: Array<{ uci: string; probability: number }>,
    temperature: { temperature: number; topK: number }
  ) => { uci: string; san?: string; probability: number } | null;
}

/**
 * Generate Maia move service
 * Note: This needs to receive the predict function from MaiaContext
 */
export const generateMaiaMoveService = fromPromise<
  MaiaMoveResult,
  MaiaMoveParams
>(async ({ input }) => {
  const { fen, predict, sampleMove } = input;
  
  // Run Maia inference
  const result = await predict(fen);
  
  if (result.predictions.length === 0) {
    throw new Error('Maia returned no predictions');
  }
  
  // Sample a move based on probability distribution
  const sampled = sampleMove(
    result.predictions,
    { temperature: 1.0, topK: 5 }
  );
  
  if (!sampled) {
    throw new Error('Failed to sample move from Maia predictions');
  }
  
  // Convert UCI to SAN if not provided
  let san = sampled.san;
  if (!san) {
    try {
      const chess = new Chess(fen);
      const from = sampled.uci.slice(0, 2);
      const to = sampled.uci.slice(2, 4);
      const promotion = sampled.uci.length > 4 ? sampled.uci[4] : undefined;
      const move = chess.move({ from, to, promotion: promotion as any });
      san = move?.san || sampled.uci;
    } catch {
      san = sampled.uci;
    }
  }
  
  return {
    moveUci: sampled.uci,
    moveSan: san,
    probability: sampled.probability,
  };
});

// ============================================================================
// GAME LOGIC HELPERS
// ============================================================================

/**
 * Apply a move and return the new FEN
 */
export function applyMove(
  fen: string,
  moveUci: string
): { success: boolean; newFen: string; san: string } {
  try {
    const chess = new Chess(fen);
    const from = moveUci.slice(0, 2);
    const to = moveUci.slice(2, 4);
    const promotion = moveUci.length > 4 ? moveUci[4] : undefined;
    
    const move = chess.move({ 
      from, 
      to, 
      promotion: promotion as 'q' | 'r' | 'b' | 'n' | undefined 
    });
    
    if (!move) {
      return { success: false, newFen: fen, san: '' };
    }
    
    return { success: true, newFen: chess.fen(), san: move.san };
  } catch (error) {
    console.error('Failed to apply move:', error);
    return { success: false, newFen: fen, san: '' };
  }
}

/**
 * Get a random legal move (fallback when Maia fails)
 */
export function getRandomLegalMove(fen: string): MaiaMoveResult | null {
  try {
    const chess = new Chess(fen);
    const moves = chess.moves({ verbose: true });
    
    if (moves.length === 0) {
      return null;
    }
    
    const randomMove = moves[Math.floor(Math.random() * moves.length)];
    const uci = `${randomMove.from}${randomMove.to}${randomMove.promotion || ''}`;
    
    return {
      moveUci: uci,
      moveSan: randomMove.san,
      probability: 1 / moves.length,
    };
  } catch {
    return null;
  }
}

/**
 * Validate a move is legal
 */
export function isMoveLegal(fen: string, moveUci: string): boolean {
  try {
    const chess = new Chess(fen);
    const from = moveUci.slice(0, 2);
    const to = moveUci.slice(2, 4);
    const promotion = moveUci.length > 4 ? moveUci[4] : undefined;
    
    const move = chess.move({ 
      from, 
      to, 
      promotion: promotion as 'q' | 'r' | 'b' | 'n' | undefined 
    });
    
    return move !== null;
  } catch {
    return false;
  }
}

/**
 * Get legal moves for the current position
 */
export function getLegalMoves(fen: string): Array<{ uci: string; san: string }> {
  try {
    const chess = new Chess(fen);
    const moves = chess.moves({ verbose: true });
    
    return moves.map(m => ({
      uci: `${m.from}${m.to}${m.promotion || ''}`,
      san: m.san,
    }));
  } catch {
    return [];
  }
}

/**
 * Build choices from legal moves (for free play mode)
 */
export function buildChoicesFromLegalMoves(
  fen: string,
  limit: number = 3
): GameContext['choices'] {
  const moves = getLegalMoves(fen);
  
  return moves.slice(0, limit).map((move, idx) => ({
    id: String.fromCharCode(65 + idx), // A, B, C
    moveUci: move.uci,
    styleId: (['fischer', 'tal', 'capablanca'] as const)[idx % 3],
    planOneLiner: 'Analyzing position...',
    pv: [move.uci],
    eval: 0,
    conceptTags: ['development'],
  }));
}
