/**
 * XState Chess Game Machine
 * 
 * Central state machine for managing chess game flow.
 * Replaces ad-hoc useState hooks with explicit state transitions.
 * 
 * Architecture:
 * - Uses XState v5's `setup` API for type-safe configuration
 * - Async operations use `fromPromise` actors via `invoke`
 * - Context updates use `assign` actions
 * - Guards prevent invalid transitions
 */

import { setup, assign, fromPromise } from 'xstate';
import { Chess } from 'chess.js';
import type { TurnPackage, MoveResponse, MoveChoice } from '@master-academy/contracts';
import type { MovePrediction } from '../maia';
import {
  GameContext,
  GameEvent,
  INITIAL_CONTEXT,
  PredictionResult,
  PlayerStats,
  CelebrationType,
} from './types';
import {
  createGameActor,
  submitMoveActor,
  fetchTurnActor,
  applyMove,
  buildChoicesFromFen,
  checkGameOver,
  getGameEndState,
  getRandomLegalMove,
  type CreateGameInput,
  type CreateGameOutput,
  type SubmitMoveInput,
  type SubmitMoveOutput,
} from './actors';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/** Load settings from localStorage */
function loadSettings(): Partial<GameContext> {
  try {
    return {
      opponentType: (localStorage.getItem('qfg_opponentType') as GameContext['opponentType']) || 'ai-master',
      maiaOpponentRating: parseInt(localStorage.getItem('qfg_maiaRating') || '1500') as GameContext['maiaOpponentRating'],
      playMode: (localStorage.getItem('qfg_playMode') as GameContext['playMode']) || 'guided',
      playerColor: (localStorage.getItem('qfg_playerColor') as GameContext['playerColor']) || 'white',
      predictionEnabled: JSON.parse(localStorage.getItem('masterAcademy_predictionEnabled') || 'true'),
      predictionStats: JSON.parse(localStorage.getItem('masterAcademy_predictions') || '{"total":0,"correct":0,"streak":0}'),
      playerStats: JSON.parse(localStorage.getItem('masterAcademy_stats_v2') || 'null') || INITIAL_CONTEXT.playerStats,
    };
  } catch {
    return {};
  }
}

/** Save settings to localStorage */
function saveSettings(ctx: GameContext): void {
  try {
    localStorage.setItem('qfg_opponentType', ctx.opponentType);
    localStorage.setItem('qfg_maiaRating', String(ctx.maiaOpponentRating));
    localStorage.setItem('qfg_playMode', ctx.playMode);
    localStorage.setItem('qfg_playerColor', ctx.playerColor);
    localStorage.setItem('masterAcademy_predictionEnabled', JSON.stringify(ctx.predictionEnabled));
    localStorage.setItem('masterAcademy_predictions', JSON.stringify(ctx.predictionStats));
    localStorage.setItem('masterAcademy_stats_v2', JSON.stringify(ctx.playerStats));
  } catch (e) {
    console.error('Failed to save settings:', e);
  }
}

/** Check if it's the player's turn */
function isPlayerTurn(ctx: GameContext): boolean {
  if (ctx.playerColor === 'white') {
    return ctx.sideToMove === 'w';
  }
  return ctx.sideToMove === 'b';
}

// ============================================================================
// STATE MACHINE DEFINITION
// ============================================================================

export const gameMachine = setup({
  types: {
    context: {} as GameContext,
    events: {} as GameEvent,
  },
  
  // Register actors for invoke
  actors: {
    createGameActor,
    submitMoveActor,
    fetchTurnActor,
  },
  
  actions: {
    // ========================================================================
    // INITIALIZATION ACTIONS
    // ========================================================================
    
    /** Load saved settings on init */
    loadSavedSettings: assign(({ context }) => ({
      ...context,
      ...loadSettings(),
    })),
    
    /** Save settings to localStorage */
    saveSettings: ({ context }) => saveSettings(context),
    
    // ========================================================================
    // LOADING STATE ACTIONS
    // ========================================================================
    
    /** Set loading state */
    setLoading: assign({ loading: true }),
    
    /** Clear loading state */
    clearLoading: assign({ loading: false }),
    
    // ========================================================================
    // ERROR HANDLING ACTIONS
    // ========================================================================
    
    /** Set error state */
    setError: assign(({ event }) => ({
      error: 'error' in event ? (event as { error: string }).error : 'An error occurred',
      loading: false,
    })),
    
    /** Clear error state */
    clearError: assign({ error: null, illegalMoveMessage: null }),
    
    /** Handle illegal move */
    setIllegalMoveMessage: assign(({ event }) => {
      const e = event as { type: 'ILLEGAL_MOVE'; message: string };
      return { illegalMoveMessage: e.message };
    }),
    
    // ========================================================================
    // GAME CREATION ACTIONS
    // ========================================================================
    
    /** Handle successful game creation (from invoke onDone) */
    handleGameCreated: assign(({ event }) => {
      // Event from invoke onDone has the output in event.output
      const output = (event as any).output as CreateGameOutput;
      return {
        gameId: output.gameId,
        fen: output.turnPackage.fen,
        sideToMove: output.turnPackage.sideToMove,
        choices: output.turnPackage.choices,
        loading: false,
        error: null,
        moveHistory: [],
        moveCounter: 1,
        gameEndState: null,
        gameStats: null,
      };
    }),
    
    /** Handle game creation failure (from invoke onError) */
    handleGameCreateFailed: assign(({ event }) => ({
      error: (event as any).error?.message || 'Failed to create game',
      loading: false,
    })),
    
    // ========================================================================
    // MOVE SELECTION ACTIONS
    // ========================================================================
    
    /** Select a choice */
    selectChoice: assign(({ event }) => {
      const e = event as { type: 'SELECT_CHOICE'; choiceId: string };
      return { selectedChoice: e.choiceId };
    }),
    
    /** Hover over a choice */
    setHoveredChoice: assign(({ event }) => {
      const e = event as { type: 'HOVER_CHOICE'; choice: GameContext['hoveredChoice'] };
      return { hoveredChoice: e.choice };
    }),
    
    /** Store pending move data (prevents stale state bugs) */
    storePendingMove: assign(({ context, event }) => {
      const e = event as { type: 'SUBMIT_MOVE'; choiceId: string };
      const choice = context.choices.find(c => c.id === e.choiceId);
      if (!choice) return {};
      
      return {
        pendingMove: {
          choice: { moveUci: choice.moveUci, id: choice.id },
          turnPackage: {
            gameId: context.gameId!,
            fen: context.fen,
            sideToMove: context.sideToMove,
            choices: context.choices,
            bestMove: { moveUci: '', eval: 0 },
            difficulty: { engineElo: 1500, hintLevel: 2 },
            telemetryHints: { timeBudgetMs: 30000 },
          },
        },
      };
    }),
    
    /** Apply optimistic update (show move immediately) */
    applyOptimisticUpdate: assign(({ context, event }) => {
      const e = event as { type: 'SUBMIT_MOVE'; choiceId: string };
      const choice = context.choices.find(c => c.id === e.choiceId);
      if (!choice) return {};
      
      const result = applyMove(context.fen, choice.moveUci);
      if (!result.success) return {};
      
      return {
        optimisticFen: result.newFen,
      };
    }),
    
    // ========================================================================
    // MOVE SUBMISSION ACTIONS
    // ========================================================================
    
    /** Handle move response from server (from invoke onDone) */
    handleMoveSubmitted: assign(({ context, event }) => {
      const output = (event as any).output as SubmitMoveOutput;
      const { response, fenAfterMove } = output;
      
      // Update move history with player's move
      const newHistory = [...context.moveHistory];
      const playerMoveSan = response.feedback?.coachText?.match(/Your move: (\S+)/)?.[1] || '...';
      
      if (context.playerColor === 'white') {
        newHistory.push({
          moveNumber: newHistory.length + 1,
          white: playerMoveSan,
        });
      } else {
        if (newHistory.length > 0) {
          const lastEntry = newHistory[newHistory.length - 1];
          if (lastEntry.white && !lastEntry.black) {
            lastEntry.black = playerMoveSan;
          }
        }
      }
      
      return {
        pendingResponse: response,
        feedback: response.feedback,
        loading: false,
        fenAfterPlayerMove: fenAfterMove,
        moveHistory: newHistory,
      };
    }),
    
    /** Handle move submission failure */
    handleMoveFailed: assign(({ event }) => ({
      error: (event as any).error?.message || 'Failed to submit move',
      loading: false,
      optimisticFen: null,
    })),
    
    // ========================================================================
    // PREDICTION MODE ACTIONS
    // ========================================================================
    
    /** Enter prediction mode */
    enterPredictionMode: assign(({ context }) => {
      // Store the FEN before AI moves for prediction display
      const fenBeforeAi = context.optimisticFen || context.fen;
      return {
        fenBeforeAiMove: fenBeforeAi,
        // Maia predictions will be set by the MaiaBridge
      };
    }),
    
    /** Set prediction hover (for arrow display) */
    setPredictionHover: assign(({ event }) => {
      const e = event as { type: 'HOVER_PREDICTION'; from: string | null; to: string | null };
      return { predictionHover: { from: e.from || null, to: e.to || null } };
    }),
    
    /** Handle prediction result */
    handlePredictionResult: assign(({ context, event }) => {
      const e = event as { type: 'PREDICTION_COMPLETE'; result?: PredictionResult };
      if (!e.result) {
        return {
          predictionStats: {
            ...context.predictionStats,
            total: context.predictionStats.total + 1,
            streak: 0,
          },
        };
      }
      
      return {
        predictionResult: e.result,
        predictionStats: {
          total: context.predictionStats.total + 1,
          correct: e.result.correct ? context.predictionStats.correct + 1 : context.predictionStats.correct,
          streak: e.result.correct ? context.predictionStats.streak + 1 : 0,
        },
        celebration: e.result.correct ? 'predict' as CelebrationType : null,
      };
    }),
    
    // ========================================================================
    // OPPONENT TURN ACTIONS
    // ========================================================================
    
    /** Apply opponent's move to the board */
    applyOpponentMove: assign(({ context, event }) => {
      const e = event as { type: 'APPLY_OPPONENT_MOVE'; moveUci: string; moveSan: string; newFen: string };
      
      // Update move history
      const newHistory = [...context.moveHistory];
      if (context.playerColor === 'white') {
        // Opponent is black
        if (newHistory.length > 0) {
          const lastEntry = newHistory[newHistory.length - 1];
          if (lastEntry.white && !lastEntry.black) {
            lastEntry.black = e.moveSan;
          } else {
            newHistory.push({ moveNumber: newHistory.length + 1, black: e.moveSan });
          }
        }
      } else {
        // Opponent is white
        newHistory.push({ moveNumber: newHistory.length + 1, white: e.moveSan });
      }
      
      // CRITICAL: Regenerate choices for the new position
      const newChoices = buildChoicesFromFen(e.newFen, 3);
      
      return {
        fen: e.newFen,
        sideToMove: new Chess(e.newFen).turn() as 'w' | 'b',
        choices: newChoices,
        optimisticFen: null,
        pendingOpponentMoveUci: e.moveUci,
        pendingResponse: null,
        pendingMove: null,
        fenBeforeAiMove: null,
        currentMaiaPredictions: [],
        moveHistory: newHistory,
        selectedChoice: null,
      };
    }),
    
    /** Update turn from server response (when AI master makes a move) */
    updateTurnFromResponse: assign(({ context }) => {
      const response = context.pendingResponse;
      if (!response?.nextTurn) return {};
      
      // CRITICAL FIX: Regenerate bestMove if needed
      // The server's choices are for the new position after AI moved
      const newChoices = response.nextTurn.choices;
      
      return {
        fen: response.nextTurn.fen,
        sideToMove: response.nextTurn.sideToMove,
        choices: newChoices,
        selectedChoice: null,
        optimisticFen: null,
        pendingMove: null,
        moveCounter: context.moveCounter + 1,
      };
    }),
    
    // ========================================================================
    // GAME END ACTIONS
    // ========================================================================
    
    /** Check if game is over and handle appropriately */
    checkAndHandleGameOver: assign(({ context }) => {
      const { isOver, result, winner } = checkGameOver(context.fen);
      
      if (!isOver) return {};
      
      const endState = getGameEndState(context.fen, context.playerColor);
      
      // Calculate game stats
      const xpEarned = endState === 'victory' ? 100 : endState === 'draw' ? 50 : 25;
      const accuracy = context.moveCounter > 0 
        ? Math.round((context.playerStats.accurateMoves / context.moveCounter) * 100)
        : 0;
      
      return {
        gameEndState: endState,
        gameStats: {
          xpEarned,
          movesPlayed: context.moveCounter,
          accuracy,
        },
      };
    }),
    
    /** Handle explicit game end event */
    handleGameEnd: assign(({ event }) => {
      const e = event as { type: 'GAME_END'; result: GameContext['gameEndState']; stats: GameContext['gameStats'] };
      return {
        gameEndState: e.result,
        gameStats: e.stats,
        loading: false,
      };
    }),
    
    /** Update player stats after game */
    updatePlayerStats: assign(({ context }) => {
      const stats = { ...context.playerStats };
      stats.gamesPlayed += 1;
      
      if (context.gameEndState === 'victory') {
        stats.streak += 1;
        stats.skillRating = Math.min(3000, stats.skillRating + 15);
      } else if (context.gameEndState === 'defeat') {
        stats.streak = 1;
        stats.skillRating = Math.max(100, stats.skillRating - 10);
      }
      
      stats.highestRating = Math.max(stats.highestRating, stats.skillRating);
      
      return { playerStats: stats };
    }),
    
    // ========================================================================
    // UI ACTIONS
    // ========================================================================
    
    /** Show celebration */
    showCelebration: assign(({ event }) => {
      const e = event as { type: 'CELEBRATE'; celebrationType: CelebrationType };
      return { celebration: e.celebrationType };
    }),
    
    /** Clear celebration */
    clearCelebration: assign({ celebration: null }),
    
    /** Toggle settings panel */
    toggleSettings: assign(({ context }) => ({
      showSettings: !context.showSettings,
    })),
    
    /** Update settings */
    updateSettings: assign(({ event }) => {
      const e = event as { type: 'UPDATE_SETTINGS'; settings: Partial<GameContext> };
      return { ...e.settings };
    }),
    
    /** Reset for new game */
    resetForNewGame: assign(() => ({
      gameId: null,
      fen: INITIAL_CONTEXT.fen,
      sideToMove: 'w' as const,
      choices: [],
      selectedChoice: null,
      hoveredChoice: null,
      pendingMove: null,
      pendingResponse: null,
      feedback: null,
      optimisticFen: null,
      pendingOpponentMoveUci: null,
      fenBeforeAiMove: null,
      predictionResult: null,
      currentMaiaPredictions: [],
      moveHistory: [],
      moveCounter: 1,
      gameEndState: null,
      gameStats: null,
      loading: false,
      error: null,
      celebration: null,
    })),
    
    /** Store Maia predictions */
    setMaiaPredictions: assign(({ event }) => {
      const e = event as { type: 'MAIA_PREDICTIONS_READY'; predictions: MovePrediction[] };
      return { currentMaiaPredictions: e.predictions };
    }),
  },
  
  guards: {
    /** Check if it's the player's turn */
    isPlayerTurn: ({ context }) => isPlayerTurn(context),
    
    /** Check if prediction is enabled and using human-like opponent */
    isPredictionEnabled: ({ context }) => 
      context.predictionEnabled && context.opponentType === 'human-like',
    
    /** Check if using Maia opponent */
    isHumanLikeOpponent: ({ context }) => context.opponentType === 'human-like',
    
    /** Check if using AI master opponent */
    isAiMasterOpponent: ({ context }) => context.opponentType === 'ai-master',
    
    /** Check if game is over */
    isGameOver: ({ context }) => {
      const { isOver } = checkGameOver(context.fen);
      return isOver;
    },
    
    /** Check if has pending response from server */
    hasPendingResponse: ({ context }) => context.pendingResponse !== null,
    
    /** Check if server returned an AI move */
    hasAiMoveInResponse: ({ context }) => 
      context.pendingResponse?.feedback?.aiMove !== undefined,
    
    /** Check if game has next turn (not game over) */
    hasNextTurn: ({ context }) =>
      context.pendingResponse?.nextTurn !== null,
  },
  
}).createMachine({
  id: 'chessGame',
  initial: 'idle',
  context: INITIAL_CONTEXT,
  
  // Load settings on machine start
  entry: ['loadSavedSettings'],
  
  states: {
    // ========================================================================
    // IDLE STATE - Waiting to start a game
    // ========================================================================
    idle: {
      on: {
        START_GAME: {
          target: 'creatingGame',
          actions: ['setLoading'],
        },
        UPDATE_SETTINGS: {
          actions: ['updateSettings', 'saveSettings'],
        },
        TOGGLE_SETTINGS: {
          actions: ['toggleSettings'],
        },
      },
    },
    
    // ========================================================================
    // CREATING GAME STATE - Invoking game creation
    // ========================================================================
    creatingGame: {
      invoke: {
        id: 'createGame',
        src: 'createGameActor',
        input: ({ context }) => ({
          playerRating: context.playerStats.skillRating,
          playerColor: context.playerColor,
        } as CreateGameInput),
        onDone: {
          target: 'playing',
          actions: ['handleGameCreated'],
        },
        onError: {
          target: 'error',
          actions: ['handleGameCreateFailed'],
        },
      },
    },
    
    // ========================================================================
    // PLAYING STATE - Main game loop with nested states
    // ========================================================================
    playing: {
      initial: 'playerTurn',
      
      // Global events that can happen during play
      on: {
        TOGGLE_SETTINGS: {
          actions: ['toggleSettings'],
        },
        UPDATE_SETTINGS: {
          actions: ['updateSettings', 'saveSettings'],
        },
        CELEBRATE: {
          actions: ['showCelebration'],
        },
        CLEAR_CELEBRATION: {
          actions: ['clearCelebration'],
        },
        CLEAR_ERROR: {
          actions: ['clearError'],
        },
        GAME_END: {
          target: 'gameOver',
          actions: ['handleGameEnd', 'updatePlayerStats', 'saveSettings'],
        },
      },
      
      states: {
        // ====================================================================
        // PLAYER TURN - Player is selecting and submitting moves
        // ====================================================================
        playerTurn: {
          initial: 'selectingMove',
          
          // Check for game over on entry
          entry: ['checkAndHandleGameOver'],
          
          // If game over detected, transition out
          always: [
            {
              target: '#chessGame.gameOver',
              guard: 'isGameOver',
            },
          ],
          
          states: {
            // ================================================================
            // SELECTING MOVE - Waiting for player to choose
            // ================================================================
            selectingMove: {
              on: {
                SELECT_CHOICE: {
                  actions: ['selectChoice'],
                },
                HOVER_CHOICE: {
                  actions: ['setHoveredChoice'],
                },
                SUBMIT_MOVE: {
                  target: 'submittingMove',
                  actions: ['storePendingMove', 'applyOptimisticUpdate', 'setLoading'],
                },
                FREE_PLAY_MOVE: {
                  target: 'submittingMove',
                  actions: ['setLoading'],
                },
                ILLEGAL_MOVE: {
                  actions: ['setIllegalMoveMessage'],
                },
              },
            },
            
            // ================================================================
            // SUBMITTING MOVE - Invoking move submission to server
            // ================================================================
            submittingMove: {
              invoke: {
                id: 'submitMove',
                src: 'submitMoveActor',
                input: ({ context }) => {
                  const choice = context.pendingMove?.choice;
                  return {
                    gameId: context.gameId!,
                    moveUci: choice?.moveUci || '',
                    choiceId: choice?.id || '',
                    currentFen: context.fen,
                    skipAiMove: context.opponentType === 'human-like',
                  } as SubmitMoveInput;
                },
                onDone: [
                  // If prediction enabled and human-like opponent, show prediction
                  {
                    target: 'awaitingPrediction',
                    guard: 'isPredictionEnabled',
                    actions: ['handleMoveSubmitted', 'enterPredictionMode'],
                  },
                  // If human-like opponent without prediction, go to opponent turn
                  {
                    target: '#chessGame.playing.opponentTurn',
                    guard: 'isHumanLikeOpponent',
                    actions: ['handleMoveSubmitted'],
                  },
                  // If AI master, update from response and wait for next selection
                  {
                    target: 'selectingMove',
                    actions: ['handleMoveSubmitted', 'updateTurnFromResponse', 'clearLoading'],
                  },
                ],
                onError: {
                  target: 'selectingMove',
                  actions: ['handleMoveFailed'],
                },
              },
            },
            
            // ================================================================
            // AWAITING PREDICTION - Showing prediction UI
            // ================================================================
            awaitingPrediction: {
              on: {
                SUBMIT_PREDICTION: {
                  target: '#chessGame.playing.opponentTurn',
                  actions: ['handlePredictionResult'],
                },
                SKIP_PREDICTION: {
                  target: '#chessGame.playing.opponentTurn',
                },
                PREDICTION_COMPLETE: {
                  target: '#chessGame.playing.opponentTurn',
                  actions: ['handlePredictionResult'],
                },
                HOVER_PREDICTION: {
                  actions: ['setPredictionHover'],
                },
                MAIA_PREDICTIONS_READY: {
                  actions: ['setMaiaPredictions'],
                },
              },
            },
          },
        },
        
        // ====================================================================
        // OPPONENT TURN - Waiting for opponent move (Maia or server)
        // ====================================================================
        opponentTurn: {
          initial: 'generatingMove',
          
          states: {
            // ================================================================
            // GENERATING MOVE - Maia is thinking or waiting for server
            // ================================================================
            generatingMove: {
              on: {
                // Maia move ready (from MaiaBridge)
                MAIA_MOVE_READY: {
                  target: 'applyingMove',
                },
                // Maia failed, use fallback
                MAIA_MOVE_FAILED: {
                  target: 'applyingMove',
                },
                // For AI master, move comes from server response
                APPLY_OPPONENT_MOVE: {
                  target: '#chessGame.playing.playerTurn',
                  actions: ['applyOpponentMove'],
                },
              },
            },
            
            // ================================================================
            // APPLYING MOVE - Animating and applying opponent's move
            // ================================================================
            applyingMove: {
              on: {
                APPLY_OPPONENT_MOVE: [
                  {
                    target: '#chessGame.gameOver',
                    guard: 'isGameOver',
                    actions: ['applyOpponentMove', 'checkAndHandleGameOver'],
                  },
                  {
                    target: '#chessGame.playing.playerTurn',
                    actions: ['applyOpponentMove'],
                  },
                ],
              },
            },
          },
        },
      },
    },
    
    // ========================================================================
    // GAME OVER STATE
    // ========================================================================
    gameOver: {
      entry: ['updatePlayerStats', 'saveSettings'],
      on: {
        NEW_GAME: {
          target: 'idle',
          actions: ['resetForNewGame'],
        },
      },
    },
    
    // ========================================================================
    // ERROR STATE
    // ========================================================================
    error: {
      on: {
        RETRY: {
          target: 'idle',
          actions: ['clearError'],
        },
        CLEAR_ERROR: {
          target: 'idle',
          actions: ['clearError'],
        },
      },
    },
  },
});

export type GameMachine = typeof gameMachine;
