/**
 * React Hook for Game State Machine
 * 
 * Wraps the XState game machine for use in React components.
 * Provides type-safe access to state and events.
 */

import { useCallback, useMemo } from 'react';
import { useMachine, useSelector } from '@xstate/react';
import { gameMachine } from './gameMachine';
import type { 
  GameContext, 
  GameEvent,
  OpponentType,
  MaiaRating,
  PlayMode,
  PlayerColor,
  CelebrationType,
} from './types';
import type { MoveChoice, MoveResponse } from '@master-academy/contracts';
import type { MovePrediction } from '../maia';

/**
 * Custom hook for the game state machine
 */
export function useGameMachine() {
  const [state, send, actorRef] = useMachine(gameMachine);
  
  // ============================================================================
  // DERIVED STATE (computed from machine context)
  // ============================================================================
  
  const context = state.context;
  
  /** Current game phase for UI rendering */
  const gamePhase = useMemo(() => {
    if (state.matches('idle')) return 'idle';
    if (state.matches('creatingGame')) return 'loading';
    if (state.matches('playing')) return 'playing';
    if (state.matches('gameOver')) return 'gameOver';
    if (state.matches('error')) return 'error';
    return 'idle';
  }, [state]);
  
  /** Is it the player's turn? */
  const isPlayerTurn = useMemo(() => {
    if (!state.matches('playing')) return false;
    
    if (context.playerColor === 'white') {
      return context.sideToMove === 'w';
    }
    return context.sideToMove === 'b';
  }, [state, context.playerColor, context.sideToMove]);
  
  /** Is prediction UI showing? */
  const isShowingPrediction = state.matches({ playing: { playerTurn: 'awaitingPrediction' } });
  
  /** Is submitting a move? */
  const isSubmittingMove = state.matches({ playing: { playerTurn: 'submittingMove' } });
  
  /** Is opponent's turn (Maia generating) */
  const isOpponentTurn = state.matches({ playing: 'opponentTurn' });
  
  /** Is in game creation */
  const isCreatingGame = state.matches('creatingGame');
  
  /** Current FEN (optimistic or actual) */
  const currentFen = context.optimisticFen || context.fen;
  
  // ============================================================================
  // EVENT DISPATCHERS (type-safe wrappers for send())
  // ============================================================================
  
  /** Start a new game */
  const startGame = useCallback(() => {
    send({ type: 'START_GAME' });
  }, [send]);
  
  /** Game created callback (from API service) */
  const onGameCreated = useCallback((gameId: string, turnPackage: any) => {
    send({ type: 'GAME_CREATED', gameId, turnPackage });
  }, [send]);
  
  /** Game creation failed callback */
  const onGameCreateFailed = useCallback((error: string) => {
    send({ type: 'GAME_CREATE_FAILED', error });
  }, [send]);
  
  /** Select a move choice */
  const selectChoice = useCallback((choiceId: string) => {
    send({ type: 'SELECT_CHOICE', choiceId });
  }, [send]);
  
  /** Hover over a move choice */
  const hoverChoice = useCallback((choice: MoveChoice | null) => {
    send({ type: 'HOVER_CHOICE', choice });
  }, [send]);
  
  /** Submit the selected move */
  const submitMove = useCallback((choiceId: string) => {
    send({ type: 'SUBMIT_MOVE', choiceId });
  }, [send]);
  
  /** Move submitted callback (from API service) */
  const onMoveSubmitted = useCallback((response: MoveResponse, fenAfterMove: string) => {
    send({ type: 'MOVE_SUBMITTED', response, fenAfterMove });
  }, [send]);
  
  /** Move failed callback */
  const onMoveFailed = useCallback((error: string) => {
    send({ type: 'MOVE_FAILED', error });
  }, [send]);
  
  /** Show prediction UI */
  const showPrediction = useCallback((fenBeforeAiMove: string, maiaPredictions: MovePrediction[]) => {
    send({ type: 'SHOW_PREDICTION', fenBeforeAiMove, maiaPredictions });
  }, [send]);
  
  /** Submit a prediction */
  const submitPrediction = useCallback((predictedMoveUci: string) => {
    send({ type: 'SUBMIT_PREDICTION', predictedMoveUci });
  }, [send]);
  
  /** Skip prediction */
  const skipPrediction = useCallback(() => {
    send({ type: 'SKIP_PREDICTION' });
  }, [send]);
  
  /** Complete prediction flow */
  const completePrediction = useCallback((result?: any) => {
    send({ type: 'PREDICTION_COMPLETE', result });
  }, [send]);
  
  /** Maia move ready */
  const onMaiaMoveReady = useCallback((moveUci: string, moveSan: string, probability: number) => {
    send({ type: 'MAIA_MOVE_READY', moveUci, moveSan, probability });
  }, [send]);
  
  /** Maia move failed */
  const onMaiaMoveFailed = useCallback((error: string) => {
    send({ type: 'MAIA_MOVE_FAILED', error });
  }, [send]);
  
  /** Set Maia predictions (for prediction UI) */
  const setMaiaPredictions = useCallback((predictions: MovePrediction[]) => {
    send({ type: 'MAIA_PREDICTIONS_READY', predictions });
  }, [send]);
  
  /** Hover over a prediction (for arrow display) */
  const hoverPrediction = useCallback((from: string | null, to: string | null) => {
    send({ type: 'HOVER_PREDICTION', from, to });
  }, [send]);
  
  /** Apply opponent's move */
  const applyOpponentMove = useCallback((moveUci: string, moveSan: string, newFen: string) => {
    send({ type: 'APPLY_OPPONENT_MOVE', moveUci, moveSan, newFen });
  }, [send]);
  
  /** Game ended */
  const onGameEnd = useCallback((result: 'victory' | 'defeat' | 'draw', stats: any) => {
    send({ type: 'GAME_END', result, stats });
  }, [send]);
  
  /** Start new game after game over */
  const newGame = useCallback(() => {
    send({ type: 'NEW_GAME' });
  }, [send]);
  
  /** Retry after error */
  const retry = useCallback(() => {
    send({ type: 'RETRY' });
  }, [send]);
  
  /** Update settings */
  const updateSettings = useCallback((settings: Partial<{
    opponentType: OpponentType;
    maiaOpponentRating: MaiaRating;
    playMode: PlayMode;
    playerColor: PlayerColor;
    predictionEnabled: boolean;
  }>) => {
    send({ type: 'UPDATE_SETTINGS', settings });
  }, [send]);
  
  /** Toggle settings panel */
  const toggleSettings = useCallback(() => {
    send({ type: 'TOGGLE_SETTINGS' });
  }, [send]);
  
  /** Show celebration */
  const celebrate = useCallback((celebrationType: CelebrationType) => {
    send({ type: 'CELEBRATE', celebrationType });
  }, [send]);
  
  /** Clear celebration */
  const clearCelebration = useCallback(() => {
    send({ type: 'CLEAR_CELEBRATION' });
  }, [send]);
  
  /** Report illegal move */
  const reportIllegalMove = useCallback((message: string) => {
    send({ type: 'ILLEGAL_MOVE', message });
  }, [send]);
  
  /** Clear error */
  const clearError = useCallback(() => {
    send({ type: 'CLEAR_ERROR' });
  }, [send]);
  
  /** Free play move (drag and drop) */
  const freePlayMove = useCallback((from: string, to: string, promotion?: string) => {
    send({ type: 'FREE_PLAY_MOVE', from, to, promotion });
  }, [send]);
  
  // ============================================================================
  // RETURN VALUE
  // ============================================================================
  
  return {
    // Machine state
    state,
    context,
    actorRef,
    
    // Derived state
    gamePhase,
    isPlayerTurn,
    isShowingPrediction,
    isSubmittingMove,
    isOpponentTurn,
    isCreatingGame,
    currentFen,
    
    // Convenience accessors
    gameId: context.gameId,
    fen: context.fen,
    choices: context.choices,
    selectedChoice: context.selectedChoice,
    hoveredChoice: context.hoveredChoice,
    feedback: context.feedback,
    playerStats: context.playerStats,
    moveHistory: context.moveHistory,
    celebration: context.celebration,
    gameEndState: context.gameEndState,
    gameStats: context.gameStats,
    loading: context.loading,
    error: context.error,
    showSettings: context.showSettings,
    opponentType: context.opponentType,
    maiaOpponentRating: context.maiaOpponentRating,
    playMode: context.playMode,
    playerColor: context.playerColor,
    predictionEnabled: context.predictionEnabled,
    predictionResult: context.predictionResult,
    predictionStats: context.predictionStats,
    predictionHover: context.predictionHover,
    fenBeforeAiMove: context.fenBeforeAiMove,
    currentMaiaPredictions: context.currentMaiaPredictions,
    sideToMove: context.sideToMove,
    
    // Event dispatchers
    startGame,
    onGameCreated,
    onGameCreateFailed,
    selectChoice,
    hoverChoice,
    submitMove,
    onMoveSubmitted,
    onMoveFailed,
    showPrediction,
    submitPrediction,
    skipPrediction,
    completePrediction,
    onMaiaMoveReady,
    onMaiaMoveFailed,
    setMaiaPredictions,
    hoverPrediction,
    applyOpponentMove,
    onGameEnd,
    newGame,
    retry,
    updateSettings,
    toggleSettings,
    celebrate,
    clearCelebration,
    reportIllegalMove,
    clearError,
    freePlayMove,
  };
}

export type UseGameMachine = ReturnType<typeof useGameMachine>;
