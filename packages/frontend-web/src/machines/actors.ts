/**
 * XState Actors (fromPromise services)
 * 
 * These actors handle async operations for the game state machine.
 * Using XState v5's fromPromise pattern with proper input/output types.
 */

import { fromPromise, fromCallback } from 'xstate';
import { Chess } from 'chess.js';
import { createGame, getTurn, submitMove } from '../api/client';
import type { TurnPackage, MoveRequest, MoveResponse, MoveChoice } from '@master-academy/contracts';
import type { GameContext, MaiaRating } from './types';

// ============================================================================
// ACTOR INPUT/OUTPUT TYPES
// ============================================================================

/** Input for creating a new game */
export interface CreateGameInput {
  playerRating: number;
  playerColor: 'white' | 'black';
}

/** Output from game creation */
export interface CreateGameOutput {
  gameId: string;
  turnPackage: TurnPackage;
}

/** Input for submitting a move */
export interface SubmitMoveInput {
  gameId: string;
  moveUci: string;
  choiceId: string;
  currentFen: string;
  skipAiMove?: boolean;
  opponentMoveUci?: string;
}

/** Output from move submission (wrapped for easier handling) */
export interface SubmitMoveOutput {
  response: MoveResponse;
  fenAfterMove: string;
}

/** Input for fetching turn package */
export interface FetchTurnInput {
  gameId: string;
}

/** Input for generating choices from position */
export interface GenerateChoicesInput {
  fen: string;
  limit?: number;
}

// ============================================================================
// GAME API ACTORS
// ============================================================================

/**
 * Create a new game on the server
 * 
 * Usage in machine:
 * ```
 * invoke: {
 *   src: 'createGameActor',
 *   input: ({ context }) => ({ 
 *     playerRating: context.playerStats.skillRating,
 *     playerColor: context.playerColor 
 *   }),
 *   onDone: { target: 'playing', actions: 'handleGameCreated' },
 *   onError: { target: 'error', actions: 'handleError' }
 * }
 * ```
 */
export const createGameActor = fromPromise<CreateGameOutput, CreateGameInput>(
  async ({ input, signal }) => {
    console.log('[createGameActor] Creating game with rating:', input.playerRating);
    
    try {
      // Create the game
      const { gameId } = await createGame(input.playerRating);
      
      // Check for abort
      if (signal?.aborted) {
        throw new Error('Game creation aborted');
      }
      
      // Fetch the initial turn package
      const turnPackage = await getTurn(gameId);
      
      console.log('[createGameActor] Game created:', gameId, {
        fen: turnPackage.fen,
        sideToMove: turnPackage.sideToMove,
        choicesCount: turnPackage.choices?.length ?? 0,
        choices: turnPackage.choices?.map(c => c.moveUci),
      });
      
      return { gameId, turnPackage };
    } catch (error) {
      console.error('[createGameActor] Failed to create game:', error);
      throw error;
    }
  }
);

/**
 * Submit a move to the server
 * 
 * Handles the complex flow of:
 * 1. Sending the player's move
 * 2. Receiving feedback
 * 3. Getting the next turn package (or game over)
 */
export const submitMoveActor = fromPromise<SubmitMoveOutput, SubmitMoveInput>(
  async ({ input, signal }) => {
    console.log('[submitMoveActor] Submitting move:', input.moveUci);
    
    try {
      // Build the move request
      const moveRequest: MoveRequest = {
        moveUci: input.moveUci,
        choiceId: input.choiceId,
        skipAiMove: input.skipAiMove,
        currentFen: input.currentFen,
        opponentMoveUci: input.opponentMoveUci,
      };
      
      // Submit to server
      const response = await submitMove(input.gameId, moveRequest);
      
      // Check for abort
      if (signal?.aborted) {
        throw new Error('Move submission aborted');
      }
      
      // Calculate the FEN after the player's move (before AI response)
      let fenAfterMove = input.currentFen;
      try {
        const chess = new Chess(input.currentFen);
        const from = input.moveUci.slice(0, 2);
        const to = input.moveUci.slice(2, 4);
        const promotion = input.moveUci.length > 4 ? input.moveUci[4] : undefined;
        chess.move({ from, to, promotion: promotion as any });
        fenAfterMove = chess.fen();
      } catch (e) {
        console.warn('[submitMoveActor] Could not calculate fenAfterMove:', e);
      }
      
      console.log('[submitMoveActor] Move accepted:', response.accepted);
      
      return { response, fenAfterMove };
    } catch (error) {
      console.error('[submitMoveActor] Failed to submit move:', error);
      throw error;
    }
  }
);

/**
 * Fetch turn package from server
 */
export const fetchTurnActor = fromPromise<TurnPackage, FetchTurnInput>(
  async ({ input, signal }) => {
    console.log('[fetchTurnActor] Fetching turn for game:', input.gameId);
    
    try {
      const turnPackage = await getTurn(input.gameId);
      
      if (signal?.aborted) {
        throw new Error('Fetch aborted');
      }
      
      return turnPackage;
    } catch (error) {
      console.error('[fetchTurnActor] Failed to fetch turn:', error);
      throw error;
    }
  }
);

// ============================================================================
// GAME LOGIC ACTORS
// ============================================================================

/**
 * Generate choices from legal moves (for free play or fallback)
 * This is a pure computation, not async, but we wrap it for consistency
 */
export const generateChoicesActor = fromPromise<MoveChoice[], GenerateChoicesInput>(
  async ({ input }) => {
    const { fen, limit = 3 } = input;
    
    try {
      const chess = new Chess(fen);
      const moves = chess.moves({ verbose: true });
      
      return moves.slice(0, limit).map((move, idx) => ({
        id: String.fromCharCode(65 + idx), // A, B, C
        moveUci: `${move.from}${move.to}${move.promotion || ''}`,
        styleId: (['fischer', 'tal', 'capablanca'] as const)[idx % 3],
        planOneLiner: 'Analyzing position...',
        pv: [`${move.from}${move.to}`],
        eval: 0,
        conceptTags: ['development'] as string[],
      }));
    } catch (error) {
      console.error('[generateChoicesActor] Failed to generate choices:', error);
      return [];
    }
  }
);

// ============================================================================
// UTILITY FUNCTIONS (non-actor helpers)
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
    console.error('[applyMove] Failed:', error);
    return { success: false, newFen: fen, san: '' };
  }
}

/**
 * Get a random legal move (fallback when Maia fails)
 */
export function getRandomLegalMove(fen: string): { 
  moveUci: string; 
  moveSan: string; 
  probability: number 
} | null {
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
 * Check if a move is legal
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
 * Get all legal moves for a position
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
 * Build choices from legal moves (for free play mode or after Maia)
 */
export function buildChoicesFromFen(
  fen: string,
  limit: number = 3
): MoveChoice[] {
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

/**
 * Check if game is over from FEN
 */
export function checkGameOver(fen: string): { 
  isOver: boolean; 
  result: 'checkmate' | 'stalemate' | 'draw' | null;
  winner: 'white' | 'black' | null;
} {
  try {
    const chess = new Chess(fen);
    
    if (chess.isCheckmate()) {
      // The side to move is in checkmate, so the other side wins
      const winner = chess.turn() === 'w' ? 'black' : 'white';
      return { isOver: true, result: 'checkmate', winner };
    }
    
    if (chess.isStalemate()) {
      return { isOver: true, result: 'stalemate', winner: null };
    }
    
    if (chess.isDraw()) {
      return { isOver: true, result: 'draw', winner: null };
    }
    
    return { isOver: false, result: null, winner: null };
  } catch {
    return { isOver: false, result: null, winner: null };
  }
}

/**
 * Determine game end state for player
 */
export function getGameEndState(
  fen: string, 
  playerColor: 'white' | 'black'
): 'victory' | 'defeat' | 'draw' | null {
  const { isOver, result, winner } = checkGameOver(fen);
  
  if (!isOver) return null;
  
  if (result === 'checkmate') {
    return winner === playerColor ? 'victory' : 'defeat';
  }
  
  return 'draw';
}
