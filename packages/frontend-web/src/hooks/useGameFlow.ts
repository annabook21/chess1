/**
 * useGameFlow - Custom hook for managing chess game flow
 * 
 * Extracted from App.tsx to:
 * 1. Reduce component complexity
 * 2. Properly handle async operations with AbortController
 * 3. Eliminate stale closure issues
 * 4. Consolidate duplicate Maia move generation logic
 * 
 * Best practices followed:
 * - AbortController for cancellable async operations
 * - Functional state updates to avoid stale closures
 * - Single responsibility for game flow logic
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { Chess } from 'chess.js';
import { createGame, getTurn, submitMove } from '../api/client';
import { TurnPackage, MoveRequest, MoveResponse } from '@master-academy/contracts';
import { useMaiaContext, sampleMove, TEMPERATURE_PRESETS } from '../maia';
import type { MovePrediction } from '../maia';

// Types
type MaiaRating = 1100 | 1200 | 1300 | 1400 | 1500 | 1600 | 1700 | 1800 | 1900;
type OpponentType = 'ai-master' | 'human-like';
type PlayerColor = 'white' | 'black';

interface MaiaMoveResult {
  moveUci: string;
  moveSan: string;
  probability: number;
  allPredictions: MovePrediction[];
}

interface GameFlowState {
  gameId: string | null;
  turnPackage: TurnPackage | null;
  optimisticFen: string | null;
  loading: boolean;
  error: string | null;
}

interface GameFlowConfig {
  opponentType: OpponentType;
  maiaOpponentRating: MaiaRating;
  playerColor: PlayerColor;
  predictionEnabled: boolean;
  onShowPrediction: (show: boolean) => void;
  onPendingResponse: (response: MoveResponse | null) => void;
  onMaiaPredictions: (predictions: MovePrediction[]) => void;
  onFenBeforeAiMove: (fen: string | null) => void;
}

/**
 * Generates a Maia opponent move using probability-based sampling
 * This is a standalone function to avoid duplicate code
 */
export async function generateMaiaMove(
  fen: string,
  targetRating: MaiaRating,
  maiaContext: ReturnType<typeof useMaiaContext>,
  maiaLoadRef: React.MutableRefObject<{ rating: MaiaRating | null; promise: Promise<void> | null; timeoutId: ReturnType<typeof setTimeout> | null }>,
  signal?: AbortSignal
): Promise<MaiaMoveResult | null> {
  // Check if aborted before starting
  if (signal?.aborted) return null;

  console.log('[Maia Opponent] generateMaiaMove called', {
    targetRating,
    hasPendingLoad: !!maiaLoadRef.current.promise,
    pendingRating: maiaLoadRef.current.rating,
  });

  // Ensure model is loaded
  try {
    if (maiaLoadRef.current.promise) {
      console.log('[Maia Opponent] Waiting for pending model load...');
      await maiaLoadRef.current.promise;
      console.log('[Maia Opponent] Pending load completed');
    }

    if (signal?.aborted) return null;

    // If we still need to load, trigger load now
    if (!maiaLoadRef.current.promise || maiaLoadRef.current.rating !== targetRating) {
      console.log('[Maia Opponent] Loading model now for rating', targetRating);
      const loadPromise = maiaContext.loadModel(targetRating);
      maiaLoadRef.current = { rating: targetRating, promise: loadPromise, timeoutId: null };
      await loadPromise;
      console.log('[Maia Opponent] Model loaded successfully');
    }
  } catch (err) {
    console.error('[Maia Opponent] Failed to load model:', err);
    return null;
  }

  if (signal?.aborted) return null;

  try {
    const result = await maiaContext.predict(fen);

    if (signal?.aborted) return null;

    if (result.predictions.length > 0) {
      const sampledMove = sampleMove(result.predictions, TEMPERATURE_PRESETS.realistic);

      if (sampledMove) {
        const probDisplay = sampledMove.probability >= 0.001
          ? `${(sampledMove.probability * 100).toFixed(1)}%`
          : `${(sampledMove.probability * 100).toFixed(3)}%`;
        console.log('[Maia Opponent] Sampled move:', sampledMove.san,
          `(${probDisplay})`,
          'from', result.predictions.length, 'candidates');

        return {
          moveUci: sampledMove.uci,
          moveSan: sampledMove.san,
          probability: sampledMove.probability,
          allPredictions: result.predictions,
        };
      }
    }
    console.warn('[Maia Opponent] No predictions returned');
  } catch (err) {
    console.error('[Maia Opponent] Prediction failed:', err);
  }
  return null;
}

/**
 * Applies a Maia move or falls back to random legal move
 * Returns the updated FEN and move info
 */
export function applyMaiaOrFallbackMove(
  maiaMove: MaiaMoveResult | null,
  fenAfterUserMove: string,
  maiaOpponentRating: MaiaRating
): {
  success: boolean;
  newFen: string;
  sideToMove: 'w' | 'b';
  moveUci: string;
  aiMoveInfo: {
    moveSan: string;
    styleId: string;
    justification: string;
    color: 'w' | 'b';
  };
  predictions: MovePrediction[];
} | null {
  const chessAfterMaia = new Chess(fenAfterUserMove);
  // Determine AI color - the side to move in fenAfterUserMove is the AI's turn
  const aiColor = chessAfterMaia.turn();

  if (maiaMove) {
    const maiaFrom = maiaMove.moveUci.slice(0, 2);
    const maiaTo = maiaMove.moveUci.slice(2, 4);
    const maiaPromo = maiaMove.moveUci.length > 4 ? maiaMove.moveUci[4] : undefined;

    try {
      const moveResult = chessAfterMaia.move({
        from: maiaFrom,
        to: maiaTo,
        promotion: maiaPromo as 'q' | 'r' | 'b' | 'n' | undefined,
      });

      if (!moveResult) {
        throw new Error(`Move validation failed: ${maiaMove.moveUci}`);
      }

      const probPercent = (maiaMove.probability * 100).toFixed(0);
      return {
        success: true,
        newFen: chessAfterMaia.fen(),
        sideToMove: chessAfterMaia.turn(),
        moveUci: maiaMove.moveUci,
        aiMoveInfo: {
          moveSan: maiaMove.moveSan,
          styleId: 'capablanca',
          justification: `A ~${maiaOpponentRating} rated player played this move (${probPercent}% predicted).`,
          color: aiColor,
        },
        predictions: maiaMove.allPredictions,
      };
    } catch (maiaError) {
      console.error('[App] Maia move invalid, using fallback:', maiaError);
      // Fall through to fallback logic
    }
  }

  // Fallback: pick a random legal move
  const legalMoves = chessAfterMaia.moves({ verbose: true });
  if (legalMoves.length === 0) {
    // Game over - no legal moves
    return null;
  }

  const randomMove = legalMoves[Math.floor(Math.random() * legalMoves.length)];
  chessAfterMaia.load(fenAfterUserMove); // Reset to apply fallback
  chessAfterMaia.move(randomMove);

  const fallbackUci = randomMove.from + randomMove.to + (randomMove.promotion || '');
  console.log('[App] Fallback move applied:', randomMove.san);

  return {
    success: true,
    newFen: chessAfterMaia.fen(),
    sideToMove: chessAfterMaia.turn(),
    moveUci: fallbackUci,
    aiMoveInfo: {
      moveSan: randomMove.san,
      styleId: 'capablanca',
      justification: 'The opponent contemplates briefly before making a move.',
      color: aiColor,
    },
    predictions: [],
  };
}

/**
 * Check if the game is over (checkmate, stalemate, draw)
 */
export function checkGameOver(fen: string): {
  isOver: boolean;
  type: 'checkmate' | 'stalemate' | 'draw' | null;
  loserColor: 'w' | 'b' | null;
} {
  try {
    const chess = new Chess(fen);
    if (chess.isCheckmate()) {
      return {
        isOver: true,
        type: 'checkmate',
        loserColor: chess.turn(),
      };
    }
    if (chess.isStalemate()) {
      return {
        isOver: true,
        type: 'stalemate',
        loserColor: null,
      };
    }
    if (chess.isDraw()) {
      return {
        isOver: true,
        type: 'draw',
        loserColor: null,
      };
    }
  } catch (e) {
    console.error('[GameFlow] Error checking game-over:', e);
  }
  return { isOver: false, type: null, loserColor: null };
}

/**
 * Custom hook for game flow management
 * Handles API calls, optimistic updates, and async state properly
 */
export function useGameFlow(config: GameFlowConfig) {
  const {
    opponentType,
    maiaOpponentRating,
    playerColor,
    predictionEnabled,
    onShowPrediction,
    onPendingResponse,
    onMaiaPredictions,
    onFenBeforeAiMove,
  } = config;

  // State
  const [state, setState] = useState<GameFlowState>({
    gameId: null,
    turnPackage: null,
    optimisticFen: null,
    loading: false,
    error: null,
  });

  // Refs for async tracking
  const abortControllerRef = useRef<AbortController | null>(null);
  const pendingMoveFenRef = useRef<string | null>(null);
  const pendingOpponentMoveRef = useRef<string | null>(null);

  // Maia context and loading ref
  const maiaContext = useMaiaContext();
  const maiaLoadRef = useRef<{ rating: MaiaRating | null; promise: Promise<void> | null; timeoutId: ReturnType<typeof setTimeout> | null }>({
    rating: null,
    promise: null,
    timeoutId: null,
  });

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
      if (maiaLoadRef.current.timeoutId) {
        clearTimeout(maiaLoadRef.current.timeoutId);
      }
    };
  }, []);

  // Cancel any pending operations
  const cancelPendingOperations = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();
  }, []);

  // Initialize a new game
  const initializeGame = useCallback(async () => {
    cancelPendingOperations();
    const signal = abortControllerRef.current?.signal;

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const { gameId } = await createGame(1200);
      if (signal?.aborted) return;

      const turn = await getTurn(gameId);
      if (signal?.aborted) return;

      setState({
        gameId,
        turnPackage: turn,
        optimisticFen: null,
        loading: false,
        error: null,
      });
    } catch (err) {
      if (signal?.aborted) return;
      console.error('[GameFlow] Failed to initialize game:', err);
      setState(prev => ({
        ...prev,
        loading: false,
        error: 'Failed to start game',
      }));
    }
  }, [cancelPendingOperations]);

  // Process a free play move
  const processFreeMove = useCallback(async (
    moveUci: string,
    fenAfterUserMove: string,
    originalFen: string
  ): Promise<boolean> => {
    const { gameId, turnPackage } = state;
    if (!gameId || !turnPackage) return false;

    cancelPendingOperations();
    const signal = abortControllerRef.current?.signal;

    // Store the FEN for race condition detection
    pendingMoveFenRef.current = fenAfterUserMove;

    // Determine if we should show prediction UI
    const shouldShowPrediction = predictionEnabled && opponentType === 'human-like';
    if (shouldShowPrediction) {
      onShowPrediction(true);
      onFenBeforeAiMove(fenAfterUserMove);
    }

    setState(prev => ({ ...prev, loading: true }));

    try {
      // Capture opponent move for sync
      const opponentMoveToSync = pendingOpponentMoveRef.current;
      pendingOpponentMoveRef.current = null;

      const moveRequest: MoveRequest = {
        moveUci,
        choiceId: 'free-move',
        skipAiMove: opponentType === 'human-like',
        opponentMoveUci: opponentMoveToSync || undefined,
        currentFen: originalFen,
      };

      const response = await submitMove(gameId, moveRequest);
      if (signal?.aborted) return true;

      // Check if server rejected the move
      if (!response.accepted) {
        setState(prev => ({
          ...prev,
          loading: false,
          error: response.feedback?.coachText || 'Move rejected',
          turnPackage: {
            ...turnPackage,
            fen: originalFen,
          },
          optimisticFen: null,
        }));
        pendingMoveFenRef.current = null;
        onShowPrediction(false);
        return false;
      }

      // Generate Maia opponent move if needed
      if (opponentType === 'human-like' && response.nextTurn) {
        const maiaMove = await generateMaiaMove(
          fenAfterUserMove,
          maiaOpponentRating,
          maiaContext,
          maiaLoadRef,
          signal
        );

        if (signal?.aborted) return true;

        const moveResult = applyMaiaOrFallbackMove(maiaMove, fenAfterUserMove, maiaOpponentRating);

        if (moveResult) {
          response.nextTurn.fen = moveResult.newFen;
          response.nextTurn.sideToMove = moveResult.sideToMove;
          response.feedback.aiMove = moveResult.aiMoveInfo;
          pendingOpponentMoveRef.current = moveResult.moveUci;
          onMaiaPredictions(moveResult.predictions);
        }
      }

      // Handle response
      if (response.nextTurn) {
        if (response.feedback.aiMove && shouldShowPrediction) {
          // Store pending response for prediction flow
          onPendingResponse(response);
        } else {
          // Update turn package directly
          if (fenAfterUserMove === pendingMoveFenRef.current) {
            setState(prev => ({
              ...prev,
              loading: false,
              turnPackage: response.nextTurn!,
              optimisticFen: null,
            }));
            pendingMoveFenRef.current = null;
          } else {
            setState(prev => ({ ...prev, loading: false }));
          }
        }
      } else {
        // Game over
        onShowPrediction(false);
        setState(prev => ({
          ...prev,
          loading: false,
          turnPackage: null,
          optimisticFen: null,
        }));
      }

      return true;
    } catch (err) {
      if (signal?.aborted) return true;
      console.error('[GameFlow] Free move error:', err);
      setState(prev => ({
        ...prev,
        loading: false,
        error: 'Failed to process move',
      }));
      onShowPrediction(false);
      return true; // Move was valid locally, just API failed
    }
  }, [
    state,
    cancelPendingOperations,
    predictionEnabled,
    opponentType,
    maiaOpponentRating,
    maiaContext,
    onShowPrediction,
    onPendingResponse,
    onMaiaPredictions,
    onFenBeforeAiMove,
  ]);

  // Set optimistic FEN
  const setOptimisticFen = useCallback((fen: string | null) => {
    setState(prev => ({ ...prev, optimisticFen: fen }));
  }, []);

  // Set turn package
  const setTurnPackage = useCallback((turnPackage: TurnPackage | null) => {
    setState(prev => ({ ...prev, turnPackage, optimisticFen: null }));
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  return {
    // State
    gameId: state.gameId,
    turnPackage: state.turnPackage,
    optimisticFen: state.optimisticFen,
    loading: state.loading,
    error: state.error,

    // Refs (for external access)
    pendingOpponentMoveRef,
    pendingMoveFenRef,
    maiaLoadRef,
    maiaContext,

    // Actions
    initializeGame,
    processFreeMove,
    setOptimisticFen,
    setTurnPackage,
    clearError,
    cancelPendingOperations,
  };
}

export type { MaiaRating, OpponentType, PlayerColor, MaiaMoveResult, GameFlowConfig };
