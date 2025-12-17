/**
 * Master Academy Chess - Main Application
 * Premium chess learning experience with master-style coaching
 * With Cursed Castle Spirit theme integration (Phase 3)
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { PixelIcon } from './ui/castle/PixelIcon';
import { Chess } from 'chess.js';
import { ChessBoard } from './components/ChessBoard';
import { MoveChoices } from './components/MoveChoices';
import { Feedback } from './components/Feedback';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { Celebration } from './components/Celebration';
import { PredictOpponent } from './components/PredictOpponent';
import { MasterMonologue } from './components/MasterMonologue';
import { WeaknessTracker } from './components/WeaknessTracker';
import { BottomNav } from './components/BottomNav';
import { createGame, getTurn, submitMove } from './api/client';
import { TurnPackage, MoveRequest, MoveResponse } from '@master-academy/contracts';
import { 
  trackMove, 
  getGamePhase, 
  getMoveQuality, 
  detectMissedTactics,
  uciToSan,
  getPositionConcepts
} from './utils/moveTracker';

// Castle theme components
import { 
  SpiritWhisper, 
  SettingsPanel, 
  CastleMap, 
  DEFAULT_ROOMS,
  AchievementToast,
  useAchievementToast,
  GameOverScreen,
  VictoryScreen,
  DrawScreen,
} from './ui/castle';
import { useNarration } from './hooks/useNarration';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useAudio } from './audio';
import { TaggerInput } from './narration/types';
import { useAchievementContext, Achievement, AchievementProgress } from './achievements';
import { useMaiaContext, sampleMove, calculatePredictionReward, TEMPERATURE_PRESETS } from './maia';
import type { MovePrediction } from './maia';
import './App.css';

// Game end state type
type GameEndState = 'victory' | 'defeat' | 'draw' | null;

// Opponent type - AI Master (Bedrock/Stockfish) or Human-like (Maia)
type OpponentType = 'ai-master' | 'human-like';

// Maia rating options
type MaiaRating = 1100 | 1200 | 1300 | 1400 | 1500 | 1600 | 1700 | 1800 | 1900;

// Play mode - guided (master suggestions) or free (manual moves)
type PlayMode = 'guided' | 'free';

// Player color
type PlayerColor = 'white' | 'black';

// Gamification state - improved system
interface PlayerStats {
  xp: number;
  level: number;
  streak: number;
  gamesPlayed: number;
  goodMoves: number;       // Moves better than engine suggestion
  blunders: number;        // Bad moves
  totalMoves: number;      // All moves made
  accurateMoves: number;   // Moves within top-3 engine suggestions
  skillRating: number;     // Fluctuating rating (like puzzle rating)
  highestRating: number;   // Peak skill rating
}

function App() {
  // Game state
  const [gameId, setGameId] = useState<string | null>(null);
  const [turnPackage, setTurnPackage] = useState<TurnPackage | null>(null);
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<MoveResponse['feedback'] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Move history
  const [moveHistory, setMoveHistory] = useState<Array<{
    moveNumber: number;
    white?: string;
    black?: string;
    eval?: number;
  }>>([]);
  
  // Gamification - with improved progression
  const [playerStats, setPlayerStats] = useState<PlayerStats>(() => {
    const saved = localStorage.getItem('masterAcademy_stats_v2');
    return saved ? JSON.parse(saved) : {
      xp: 0,
      level: 1,
      streak: 1,
      gamesPlayed: 0,
      goodMoves: 0,
      blunders: 0,
      totalMoves: 0,
      accurateMoves: 0,
      skillRating: 1200,    // Starting rating (like chess.com)
      highestRating: 1200,
    };
  });
  
  // Celebration state
  const [celebration, setCelebration] = useState<'good' | 'great' | 'blunder' | 'predict' | null>(null);
  
  // Opponent type state
  const [opponentType, setOpponentType] = useState<OpponentType>(() => {
    const saved = localStorage.getItem('qfg_opponentType');
    return (saved as OpponentType) || 'ai-master';
  });
  const [maiaOpponentRating, setMaiaOpponentRating] = useState<MaiaRating>(() => {
    const saved = localStorage.getItem('qfg_maiaRating');
    return saved ? parseInt(saved) as MaiaRating : 1500;
  });

  // Play mode state (guided = master suggestions, free = manual moves)
  const [playMode, setPlayMode] = useState<PlayMode>(() => {
    const saved = localStorage.getItem('qfg_playMode');
    return (saved as PlayMode) || 'guided';
  });

  // Player color state
  const [playerColor, setPlayerColor] = useState<PlayerColor>(() => {
    const saved = localStorage.getItem('qfg_playerColor');
    return (saved as PlayerColor) || 'white';
  });

  // Prediction mode state - auto-enabled for human-like opponent
  const [predictionEnabled, setPredictionEnabled] = useState(() => {
    const saved = localStorage.getItem('masterAcademy_predictionEnabled');
    return saved ? JSON.parse(saved) : true; // Enabled by default
  });
  const [showPrediction, setShowPrediction] = useState(false);
  const [pendingResponse, setPendingResponse] = useState<MoveResponse | null>(null);
  const [fenBeforeAiMove, setFenBeforeAiMove] = useState<string | null>(null);
  const [predictionResult, setPredictionResult] = useState<{
    predicted: string;
    actual: string;
    correct: boolean;
    // New: probability-based scoring
    actualProbability?: number;
    pickProbability?: number;
    basePoints?: number;
    probabilityBonus?: number;
    totalPoints?: number;
  } | null>(null);

  // Store Maia predictions for the current position (for proper scoring)
  const [currentMaiaPredictions, setCurrentMaiaPredictions] = useState<MovePrediction[]>([]);
  
  // Prediction hover state (for board visualization)
  const [predictionHover, setPredictionHover] = useState<{ from: string | null; to: string | null }>({ from: null, to: null });
  
  // Hovered move choice (for What-If Lens preview)
  const [hoveredChoice, setHoveredChoice] = useState<TurnPackage['choices'][0] | null>(null);
  
  // Prediction stats
  const [predictionStats, setPredictionStats] = useState(() => {
    const saved = localStorage.getItem('masterAcademy_predictions');
    return saved ? JSON.parse(saved) : {
      total: 0,
      correct: 0,
      streak: 0,
    };
  });
  
  // Save prediction enabled state
  useEffect(() => {
    localStorage.setItem('masterAcademy_predictionEnabled', JSON.stringify(predictionEnabled));
  }, [predictionEnabled]);

  // Save opponent settings
  useEffect(() => {
    localStorage.setItem('qfg_opponentType', opponentType);
  }, [opponentType]);

  useEffect(() => {
    localStorage.setItem('qfg_maiaRating', maiaOpponentRating.toString());
  }, [maiaOpponentRating]);

  useEffect(() => {
    localStorage.setItem('qfg_playMode', playMode);
  }, [playMode]);

  useEffect(() => {
    localStorage.setItem('qfg_playerColor', playerColor);
  }, [playerColor]);

  // When player color is black and it's White's turn, the backend should handle AI's move
  // For now, we just ensure the UI shows the waiting state correctly


  // Save prediction stats
  useEffect(() => {
    localStorage.setItem('masterAcademy_predictions', JSON.stringify(predictionStats));
  }, [predictionStats]);

  // Save stats to localStorage
  useEffect(() => {
    localStorage.setItem('masterAcademy_stats_v2', JSON.stringify(playerStats));
  }, [playerStats]);
  
  // Weakness Tracker state
  const [showWeaknessTracker, setShowWeaknessTracker] = useState(false);
  const [moveCounter, setMoveCounter] = useState(1);

  // Castle theme state
  const [showSettings, setShowSettings] = useState(false);
  const [showCastleMap, setShowCastleMap] = useState(false);
  const [currentRoom, setCurrentRoom] = useState('courtyard');
  const [rooms, setRooms] = useState(() => {
    const saved = localStorage.getItem('masterAcademy_rooms');
    return saved ? JSON.parse(saved) : DEFAULT_ROOMS;
  });
  
  // Game end state (Phase 3)
  const [gameEndState, setGameEndState] = useState<GameEndState>(null);
  const [gameStats, setGameStats] = useState({ xpEarned: 0, movesPlayed: 0, accuracy: 0 });
  
  // Audio system (Phase 3)
  const { playSound } = useAudio();

  // Maia context for human-like opponent
  const maiaContext = useMaiaContext();

  // Load the correct Maia model when rating changes (for human-like opponent)
  // Use a ref to prevent multiple simultaneous loads and debounce rapid changes
  const maiaLoadRef = useRef<{ rating: MaiaRating | null; promise: Promise<void> | null; timeoutId: ReturnType<typeof setTimeout> | null }>({ 
    rating: null, 
    promise: null,
    timeoutId: null,
  });
  
  useEffect(() => {
    if (opponentType === 'human-like') {
      const targetRating = maiaOpponentRating as MaiaRating;
      const availableRatings = maiaContext.availableRatings;
      
      // Check if the requested rating is available, fallback to closest if not
      let ratingToLoad = targetRating;
      if (!availableRatings.includes(targetRating)) {
        // Find closest available rating
        const closest = availableRatings.reduce((closest, rating) =>
          Math.abs(rating - targetRating) < Math.abs(closest - targetRating) ? rating : closest
        );
        console.warn(`[Maia] Rating ${targetRating} not available, using closest: ${closest}`);
        ratingToLoad = closest;
        
        // Update state to reflect the actual rating being used
        if (closest !== targetRating) {
          setMaiaOpponentRating(closest);
        }
      }
      
      // Clear any pending timeout
      if (maiaLoadRef.current.timeoutId) {
        clearTimeout(maiaLoadRef.current.timeoutId);
        maiaLoadRef.current.timeoutId = null;
      }
      
      // If already loading this exact model, don't trigger again
      if (maiaLoadRef.current.rating === ratingToLoad && maiaLoadRef.current.promise) {
        return;
      }
      
      // Debounce rapid rating changes (wait 300ms before loading)
      maiaLoadRef.current.timeoutId = setTimeout(() => {
        // If Maia is ready and we need a different model, load it
        if (maiaContext.state.isReady) {
          const currentModel = maiaContext.state.currentModel;
          if (currentModel !== ratingToLoad) {
            console.log(`[Maia] Loading model for rating ${ratingToLoad}`);
            const loadPromise = maiaContext.loadModel(ratingToLoad).catch(err => {
              console.error('[Maia] Failed to load model:', err);
              maiaLoadRef.current = { rating: null, promise: null, timeoutId: null };
            });
            maiaLoadRef.current = { rating: ratingToLoad, promise: loadPromise, timeoutId: null };
          }
        }
        // If Maia is not ready yet and not loading, try to load the desired rating
        else if (!maiaContext.state.isLoading && !maiaContext.state.error) {
          console.log(`[Maia] Triggering initial load for rating ${ratingToLoad}`);
          const loadPromise = maiaContext.loadModel(ratingToLoad).catch(err => {
            console.error('[Maia] Failed to load model:', err);
            maiaLoadRef.current = { rating: null, promise: null, timeoutId: null };
          });
          maiaLoadRef.current = { rating: ratingToLoad, promise: loadPromise, timeoutId: null };
        }
      }, 300);
      
      return () => {
        if (maiaLoadRef.current.timeoutId) {
          clearTimeout(maiaLoadRef.current.timeoutId);
        }
      };
    }
  }, [opponentType, maiaOpponentRating, maiaContext.state.isReady, maiaContext.state.isLoading, maiaContext.state.error, maiaContext.availableRatings, maiaContext]);

  // Narration hook
  const { 
    narration, 
    tone, 
    setTone, 
    narrateMove, 
    narratePredictionResult,
    showNarration,
    hideNarration,
    getWelcomeNarration,
  } = useNarration(gameId || 'new-game');

  // Achievement toast hook
  const { 
    currentAchievement, 
    showAchievement, 
    dismissCurrent: dismissAchievement 
  } = useAchievementToast();

  // Keyboard shortcuts (Phase 3 - Sierra style)
  const keyboardShortcuts = useMemo(() => ({
    // Move selection
    selectChoice1: () => turnPackage?.choices[0] && handleChoiceSelect(turnPackage.choices[0].id),
    selectChoice2: () => turnPackage?.choices[1] && handleChoiceSelect(turnPackage.choices[1].id),
    selectChoice3: () => turnPackage?.choices[2] && handleChoiceSelect(turnPackage.choices[2].id),
    confirmMove: () => selectedChoice && handleMoveSubmit(),
    
    // Navigation
    openMap: () => setShowCastleMap(true),
    openSettings: () => setShowSettings(true),
    
    // General
    dismiss: () => {
      if (showCastleMap) setShowCastleMap(false);
      else if (showSettings) setShowSettings(false);
      else if (showWeaknessTracker) setShowWeaknessTracker(false);
      else if (gameEndState) setGameEndState(null);
    },
    newGame: () => !loading && initializeGame(),
    
    // Prediction toggle
    intuit: () => setPredictionEnabled((prev: boolean) => !prev),
  }), [turnPackage, selectedChoice, showCastleMap, showSettings, showWeaknessTracker, gameEndState, loading]);
  
  useKeyboardShortcuts(keyboardShortcuts, {
    disabled: showPrediction,
    showHints: true,
    onHint: (msg) => showNarration(msg, 'neutral'),
  });

  // Achievement context
  const achievementCtx = useAchievementContext();

  // Handle achievement unlock - show toast
  const handleAchievementUnlock = useCallback((achievement: Achievement, _progress: AchievementProgress) => {
    showAchievement({
      id: achievement.id,
      name: achievement.name,
      flavorText: achievement.flavorText,
      description: achievement.description,
      iconKey: achievement.iconKey,
      xpReward: achievement.xpReward,
      rarity: achievement.rarity,
    });
    
    // Show narration for achievement
    showNarration(
      `*The spirits rejoice* "${achievement.name}" unlocked! ${achievement.flavorText}`,
      'great'
    );
  }, [showAchievement, showNarration]);

  // Handler for game end screen actions - use a flag approach
  // IMPORTANT: Must be before any early returns to avoid React error #300
  const [restartRequested, setRestartRequested] = useState(false);
  
  const handleGameEndTryAgain = useCallback(() => {
    setGameEndState(null);
    setRestartRequested(true);
  }, []);
  
  const handleGameEndReturnToMap = useCallback(() => {
    setGameEndState(null);
    setShowCastleMap(true);
  }, []);

  // Save rooms progress
  useEffect(() => {
    localStorage.setItem('masterAcademy_rooms', JSON.stringify(rooms));
  }, [rooms]);

  // Unlock rooms based on achievements
  useEffect(() => {
    const unlockedRoomIds = achievementCtx.getUnlockedRooms();
    setRooms((prev: typeof DEFAULT_ROOMS) => prev.map(room => ({
      ...room,
      unlocked: unlockedRoomIds.includes(room.id),
    })));
  }, [achievementCtx]);

  // Mock data for testing when backend is unavailable
  const MOCK_TURN_PACKAGE: TurnPackage = {
    gameId: 'mock-game-id',
    fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
    sideToMove: 'b',
    choices: [
      {
        id: 'choice-1',
        moveUci: 'e7e5',
        styleId: 'fischer',
        planOneLiner: 'Control the center with a classic response',
        pv: ['e7e5', 'g1f3', 'b8c6'],
        eval: 20,
        conceptTags: ['center', 'development'],
        threats: 'Controls d4 and f4 squares',
      },
      {
        id: 'choice-2',
        moveUci: 'c7c5',
        styleId: 'tal',
        planOneLiner: 'The Sicilian Defense - fighting for the center asymmetrically',
        pv: ['c7c5', 'g1f3', 'd7d6'],
        eval: 25,
        conceptTags: ['asymmetry', 'counterplay'],
        threats: 'Prepares queenside counterplay',
      },
      {
        id: 'choice-3',
        moveUci: 'e7e6',
        styleId: 'capablanca',
        planOneLiner: 'The French Defense - solid and reliable',
        pv: ['e7e6', 'd2d4', 'd7d5'],
        eval: 35,
        conceptTags: ['solid', 'pawn-structure'],
        threats: 'Creates a pawn chain',
      },
    ],
    bestMove: { moveUci: 'e7e5', eval: 20 },
    difficulty: { engineElo: 1300, hintLevel: 2 },
    telemetryHints: { timeBudgetMs: 30000 },
  };

  const initializeGame = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setMoveHistory([]);
      setFeedback(null);
      
      const { gameId } = await createGame(1200);
      setGameId(gameId);
      const turn = await getTurn(gameId);
      setTurnPackage(turn);
      
      // Show welcome narration from the Spirit
      getWelcomeNarration();
      
      // Track game started (will track completion when game ends)
      setPlayerStats(prev => ({
        ...prev,
        gamesPlayed: prev.gamesPlayed + 1,
      }));
      
      // Track games played achievement
      const gameAchievements = achievementCtx.trackEvent({
        type: 'GAME_COMPLETED',
        won: false, // Will be updated on actual game end
        accuracy: 0,
        blunders: 0,
        mistakes: 0,
      });
      
      for (const progress of gameAchievements) {
        const achievement = achievementCtx.getAchievement(progress.achievementId);
        if (achievement) {
          handleAchievementUnlock(achievement, progress);
        }
      }
    } catch (err) {
      // MOCK MODE: Use mock data when backend is unavailable
      console.warn('Backend unavailable, using mock data for UI testing');
      setGameId('mock-game-id');
      setTurnPackage(MOCK_TURN_PACKAGE);
      getWelcomeNarration();
      setError(null); // Clear error to show the UI
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    initializeGame();
  }, [initializeGame]);

  // Handle restart request from game end screen
  useEffect(() => {
    if (restartRequested) {
      setRestartRequested(false);
      initializeGame();
    }
  }, [restartRequested, initializeGame]);

  const handleChoiceSelect = (choiceId: string) => {
    setSelectedChoice(choiceId);
  };

  // Handle free play move (drag and drop)
  const handleFreeMove = (from: string, to: string, promotion?: string): boolean => {
    if (!gameId || !turnPackage) return false;

    // Check if it's the player's turn
    const isPlayerTurn = playerColor === 'white' 
      ? turnPackage.sideToMove === 'w'
      : turnPackage.sideToMove === 'b';
    
    if (!isPlayerTurn) {
      console.log(`Not your turn - you play ${playerColor}, but it's ${turnPackage.sideToMove === 'w' ? 'white' : 'black'}'s turn`);
      return false;
    }

    // Validate the move using chess.js first (synchronous)
    const chess = new Chess(turnPackage.fen);
    try {
      const moveResult = chess.move({
        from,
        to,
        promotion: promotion as 'q' | 'r' | 'b' | 'n' | undefined,
      });

      if (!moveResult) return false;

      const moveUci = `${from}${to}${promotion || ''}`;
      const fenAfterUserMove = chess.fen();
      const moveSan = moveResult.san; // Capture move notation before async

      // OPTIMISTIC UPDATE: Update board position immediately before API call
      // This prevents the board from resetting while waiting for the response
      const optimisticTurnPackage: TurnPackage = {
        ...turnPackage,
        fen: fenAfterUserMove,
        sideToMove: chess.turn() === 'w' ? 'w' : 'b',
      };
      setTurnPackage(optimisticTurnPackage);

      // Move is valid - now process it asynchronously
      (async () => {
        setFenBeforeAiMove(fenAfterUserMove);

        const shouldShowPrediction = predictionEnabled && opponentType === 'human-like';
        console.log('[App] Free move prediction check:', { 
          predictionEnabled, 
          opponentType, 
          shouldShowPrediction,
          fenAfterUserMove: fenAfterUserMove.substring(0, 30) + '...'
        });
        if (shouldShowPrediction) {
          setShowPrediction(true);
          console.log('[App] ✅ Showing prediction UI (free move)');
        } else {
          console.log('[App] ❌ Not showing predictions (free move):', {
            reason: !predictionEnabled ? 'predictions disabled' : opponentType !== 'human-like' ? 'not human-like opponent' : 'unknown'
          });
        }
        setLoading(true);

        try {
          const moveRequest: MoveRequest = {
            moveUci,
            choiceId: 'free-move',
          };

          const response = await submitMove(gameId, moveRequest);

          // If human-like opponent, override AI move with Maia
          if (opponentType === 'human-like' && response.feedback.aiMove && response.nextTurn) {
            const maiaMove = await generateMaiaOpponentMove(fenAfterUserMove);
            
            if (maiaMove) {
              // Store predictions for proper scoring
              setCurrentMaiaPredictions(maiaMove.allPredictions);
              
              const probPercent = (maiaMove.probability * 100).toFixed(0);
              response.feedback.aiMove = {
                moveSan: maiaMove.moveSan,
                styleId: 'capablanca',
                justification: `A ~${maiaOpponentRating} rated player played this move (${probPercent}% predicted).`,
              };

              const chessAfterMaia = new Chess(fenAfterUserMove);
              const maiaFrom = maiaMove.moveUci.slice(0, 2);
              const maiaTo = maiaMove.moveUci.slice(2, 4);
              const maiaPromo = maiaMove.moveUci.length > 4 ? maiaMove.moveUci[4] : undefined;

              chessAfterMaia.move({
                from: maiaFrom,
                to: maiaTo,
                promotion: maiaPromo as 'q' | 'r' | 'b' | 'n' | undefined,
              });

              if (response.nextTurn) {
                response.nextTurn.fen = chessAfterMaia.fen();
              }
            }
          }

          setLoading(false);

          // Always update turn package if we have a next turn
          if (response.nextTurn) {
            if (response.feedback.aiMove) {
              // Game continues with AI move
              if (shouldShowPrediction) {
                setPendingResponse(response);
                // Keep showing prediction UI - user will submit or timeout
              } else {
                // No predictions - process move immediately
                setTurnPackage(response.nextTurn);
                setFeedback(response.feedback);
                setSelectedChoice(null);
                
                const newMoveNum = Math.ceil(moveHistory.length / 2) + 1;
                setMoveHistory(prev => {
                  const updated = [...prev];
                  if (updated.length === 0 || updated[updated.length - 1].black) {
                    updated.push({ moveNumber: newMoveNum, white: moveSan, black: response.feedback.aiMove?.moveSan });
                  } else {
                    updated[updated.length - 1].black = moveSan;
                    if (response.feedback.aiMove) {
                      updated.push({ moveNumber: newMoveNum, white: response.feedback.aiMove.moveSan });
                    }
                  }
                  return updated;
                });
              }
            } else {
              // No AI move (user's move ended the game or it's their turn again)
              setShowPrediction(false);
              setTurnPackage(response.nextTurn);
              setFeedback(response.feedback);
            }
          } else {
            // Game is over
            setShowPrediction(false);
            setTurnPackage(null);
            setFeedback(response.feedback);
            console.log('[App] Game ended after free move');
          }
        } catch (err) {
          console.error('Free move API error:', err);
          setLoading(false);
          setError('Failed to process move');
          // Don't reset the board on error - keep optimistic update
          // The board already shows the user's move, which is valid
        }
      })();

      return true; // Synchronously return true since the move is valid
    } catch {
      return false;
    }
  };

  // Generate Maia opponent move using probability-based sampling
  // This uses temperature-based sampling to pick moves according to their
  // probability distribution, making predictions a true challenge.
  // 
  // Research basis:
  // - Maia achieves 46-52% move-matching accuracy on human moves
  // - Using temperature=1.0 samples from the true predicted distribution
  // - This means the "correct" answer isn't always the top prediction
  const generateMaiaOpponentMove = async (fen: string): Promise<{ 
    moveUci: string; 
    moveSan: string;
    probability: number;
    allPredictions: MovePrediction[];
  } | null> => {
    if (!maiaContext.state.isReady) {
      console.warn('[Maia Opponent] Engine not ready');
      return null;
    }

    try {
      const result = await maiaContext.predict(fen);
      
      if (result.predictions.length > 0) {
        // Sample from distribution instead of always picking top-1
        // temperature=1.0 gives realistic human-like variation
        const sampledMove = sampleMove(result.predictions, TEMPERATURE_PRESETS.realistic);
        
        if (sampledMove) {
          console.log('[Maia Opponent] Sampled move:', sampledMove.san, 
            `(${(sampledMove.probability * 100).toFixed(1)}%)`,
            'from', result.predictions.length, 'candidates');
          
          return {
            moveUci: sampledMove.uci,
            moveSan: sampledMove.san,
            probability: sampledMove.probability,
            allPredictions: result.predictions,
          };
        }
      }
    } catch (err) {
      console.error('[Maia Opponent] Prediction failed:', err);
    }
    return null;
  };

  const handleMoveSubmit = async () => {
    if (!gameId || !selectedChoice || !turnPackage) return;

    // Check if it's the player's turn
    const isPlayerTurn = playerColor === 'white' 
      ? turnPackage.sideToMove === 'w'
      : turnPackage.sideToMove === 'b';
    
    if (!isPlayerTurn) {
      setError(`Not your turn - you play ${playerColor}, but it's ${turnPackage.sideToMove === 'w' ? 'white' : 'black'}'s turn`);
      return;
    }

    const choice = turnPackage.choices.find(c => c.id === selectedChoice);
    if (!choice) return;

    try {
      setError(null);
      setPredictionResult(null);
      
      // STEP 1: Compute FEN after user's move BEFORE API call
      const chess = new Chess(turnPackage.fen);
      const moveUci = choice.moveUci;
      const from = moveUci.slice(0, 2);
      const to = moveUci.slice(2, 4);
      const promotion = moveUci.length > 4 ? moveUci[4] : undefined;
      
      const moveResult = chess.move({ 
        from, 
        to, 
        promotion: promotion as 'q' | 'r' | 'b' | 'n' | undefined 
      });
      
      if (!moveResult) {
        setError('Invalid move');
        return;
      }
      
      // Store the FEN AFTER user's move (for prediction)
      const fenAfterUserMove = chess.fen();
      setFenBeforeAiMove(fenAfterUserMove);
      
      // STEP 2: Show prediction mode if enabled AND using human-like opponent
      const shouldShowPrediction = predictionEnabled && opponentType === 'human-like';
      console.log('[App] Prediction check:', { 
        predictionEnabled, 
        opponentType, 
        shouldShowPrediction,
        fenAfterUserMove: fenAfterUserMove.substring(0, 30) + '...'
      });
      if (shouldShowPrediction) {
        setShowPrediction(true);
        console.log('[App] ✅ Showing prediction UI');
      } else {
        console.log('[App] ❌ Not showing predictions:', {
          reason: !predictionEnabled ? 'predictions disabled' : opponentType !== 'human-like' ? 'not human-like opponent' : 'unknown'
        });
      }
      setLoading(true);
      
      // STEP 3: Call API in the background
      const moveRequest: MoveRequest = {
        moveUci: choice.moveUci,
        choiceId: selectedChoice,
      };

      const response = await submitMove(gameId, moveRequest);
      
      // STEP 4: If using human-like opponent, override AI move with Maia
      if (opponentType === 'human-like' && response.feedback.aiMove && response.nextTurn) {
        const maiaMove = await generateMaiaOpponentMove(fenAfterUserMove);
        
        if (maiaMove) {
          // Store predictions for proper scoring
          setCurrentMaiaPredictions(maiaMove.allPredictions);
          
          // Override the AI move with Maia's sampled prediction
          const probPercent = (maiaMove.probability * 100).toFixed(0);
          response.feedback.aiMove = {
            moveSan: maiaMove.moveSan,
            styleId: 'capablanca', // Use a neutral style for human-like
            justification: `A ~${maiaOpponentRating} rated player played this move (${probPercent}% predicted).`,
          };

          // Update the next turn FEN to reflect Maia's move
          const chessAfterMaia = new Chess(fenAfterUserMove);
          const maiaFrom = maiaMove.moveUci.slice(0, 2);
          const maiaTo = maiaMove.moveUci.slice(2, 4);
          const maiaPromo = maiaMove.moveUci.length > 4 ? maiaMove.moveUci[4] : undefined;
          
          chessAfterMaia.move({
            from: maiaFrom,
            to: maiaTo,
            promotion: maiaPromo as 'q' | 'r' | 'b' | 'n' | undefined,
          });
          
          // Update the next turn with the new FEN
          if (response.nextTurn) {
            response.nextTurn.fen = chessAfterMaia.fen();
          }
        }
      }
      
      setLoading(false);
      
      // STEP 5: Handle response based on prediction mode
      if (response.feedback.aiMove && response.nextTurn) {
        if (shouldShowPrediction) {
          setPendingResponse(response);
          // Keep showing prediction - user will submit or timeout
          // Don't return - let the code below handle turn package update
        } else {
          // Prediction disabled or AI master - process directly
          processMoveResponse(response, choice, turnPackage);
          return;
        }
      }
      
      // No AI move (game over), process directly
      setShowPrediction(false);
      processMoveResponse(response, choice, turnPackage);
      
    } catch (err) {
      setError('Failed to submit move');
      console.error(err);
      setShowPrediction(false);
      setLoading(false);
    }
  };

  // Store user's prediction while waiting for API
  const [userPrediction, setUserPrediction] = useState<string | null>(null);

  const handlePredictionSubmit = async (predictedMoveUci: string) => {
    // If API hasn't returned yet, store the prediction and wait
    if (!pendingResponse?.feedback.aiMove) {
      setUserPrediction(predictedMoveUci);
      return;
    }

    // Use scoring utilities (already imported at top)

    // Get actual AI move in UCI format (convert from SAN)
    const aiMoveSan = pendingResponse.feedback.aiMove.moveSan;

    // Check if prediction matches - compare destination squares
    const predictedTo = predictedMoveUci.slice(2, 4);

    // Extract destination from SAN (e.g., "Nf6" -> "f6", "e5" -> "e5")
    const sanClean = aiMoveSan.replace(/[+#x=]/g, '');
    const actualTo = sanClean.length === 2
      ? sanClean.toLowerCase()
      : sanClean.slice(-2).toLowerCase();

    const isCorrect = predictedTo === actualTo;

    // Use proper probability-based scoring if we have Maia predictions
    let reward = {
      basePoints: isCorrect ? 50 : 0,
      probabilityBonus: 0,
      totalPoints: isCorrect ? 50 : 0,
      actualProbability: 0,
      pickProbability: 0,
      isCorrect,
    };

    if (currentMaiaPredictions.length > 0 && opponentType === 'human-like') {
      // Find the actual move in predictions by matching destination square
      const actualPred = currentMaiaPredictions.find(p => 
        p.to.toLowerCase() === actualTo
      );
      const pickPred = currentMaiaPredictions.find(p => 
        p.to.toLowerCase() === predictedTo
      );

      // Use proper scoring based on probabilities
      const actualMoveUci = actualPred?.uci || '';
      reward = calculatePredictionReward(
        currentMaiaPredictions,
        predictedMoveUci,
        actualMoveUci
      );

      console.log('[Prediction Scoring]', {
        predicted: predictedMoveUci,
        actual: actualMoveUci,
        isCorrect: reward.isCorrect,
        actualProb: `${(reward.actualProbability * 100).toFixed(1)}%`,
        pickProb: `${(reward.pickProbability * 100).toFixed(1)}%`,
        points: reward.totalPoints,
      });
    }

    setPredictionResult({
      predicted: predictedMoveUci,
      actual: aiMoveSan,
      correct: isCorrect,
      actualProbability: reward.actualProbability,
      pickProbability: reward.pickProbability,
      basePoints: reward.basePoints,
      probabilityBonus: reward.probabilityBonus,
      totalPoints: reward.totalPoints,
    });

    // Update prediction stats
    const newStreak = isCorrect ? predictionStats.streak + 1 : 0;
    setPredictionStats((prev: { total: number; correct: number; streak: number }) => ({
      total: prev.total + 1,
      correct: isCorrect ? prev.correct + 1 : prev.correct,
      streak: newStreak,
    }));

    // Track prediction achievement
    const newlyCompleted = achievementCtx.trackEvent({
      type: 'PREDICTION_MADE',
      correct: isCorrect,
      streak: newStreak,
    });

    // Show achievement toasts
    for (const progress of newlyCompleted) {
      const achievement = achievementCtx.getAchievement(progress.achievementId);
      if (achievement) {
        handleAchievementUnlock(achievement, progress);
      }
    }

    // Award XP based on proper scoring (not just binary correct/incorrect)
    const xpReward = reward.totalPoints;
    if (xpReward > 0) {
      if (isCorrect) {
        setCelebration('predict');
      }
      setPlayerStats(prev => ({
        ...prev,
        xp: prev.xp + xpReward,
        skillRating: prev.skillRating + Math.floor(xpReward / 10),
        highestRating: Math.max(prev.highestRating, prev.skillRating + Math.floor(xpReward / 10)),
      }));
      if (isCorrect) {
        setTimeout(() => setCelebration(null), 2000);
      }
    }

    // Continue with move processing
    finishPredictionFlow();
  };
  
  // Process stored prediction when API response arrives
  useEffect(() => {
    if (userPrediction && pendingResponse?.feedback.aiMove) {
      handlePredictionSubmit(userPrediction);
      setUserPrediction(null);
    }
  }, [pendingResponse, userPrediction]);

  const handlePredictionSkip = () => {
    setPredictionStats((prev: { total: number; correct: number; streak: number }) => ({
      ...prev,
      total: prev.total + 1,
      streak: 0,
    }));
    finishPredictionFlow();
  };

  // Memoize prediction hover handler to prevent infinite re-renders
  const handlePredictionHover = useCallback((from: string | null, to: string | null) => {
    setPredictionHover({ from, to });
  }, []);

  const finishPredictionFlow = () => {
    setShowPrediction(false);
    
    if (pendingResponse) {
      // For guided mode, we have a choice from turnPackage
      if (turnPackage && selectedChoice) {
        const choice = turnPackage.choices.find(c => c.id === selectedChoice);
        if (choice) {
          processMoveResponse(pendingResponse, choice, turnPackage);
        }
      } else if (pendingResponse.nextTurn) {
        // For free play mode or when no choice available, just update turn package
        // This ensures the opponent's move is shown even if user skipped prediction
        setTurnPackage(pendingResponse.nextTurn);
        setFeedback(pendingResponse.feedback);
        
        // Update move history
        if (pendingResponse.feedback.aiMove) {
          const newMoveNum = Math.ceil(moveHistory.length / 2) + 1;
          setMoveHistory(prev => {
            const updated = [...prev];
            if (updated.length === 0 || updated[updated.length - 1].black) {
              updated.push({ moveNumber: newMoveNum, white: pendingResponse.feedback.aiMove?.moveSan });
            } else {
              updated[updated.length - 1].black = pendingResponse.feedback.aiMove?.moveSan;
            }
            return updated;
          });
        }
      }
    }
    
    setPendingResponse(null);
    setFenBeforeAiMove(null);
  };

  const processMoveResponse = (
    response: MoveResponse, 
    choice: { moveUci: string }, 
    currentTurn: TurnPackage
  ) => {
    setFeedback(response.feedback);

    // Update move history
    const moveNum = Math.ceil((moveHistory.length + 1) / 2);
    const isWhiteMove = currentTurn.sideToMove === 'w';
    
    // Convert UCI to display format
    const moveDisplay = `${choice.moveUci.slice(0, 2)}-${choice.moveUci.slice(2, 4)}`;
    
    setMoveHistory(prev => {
      const updated = [...prev];
      if (isWhiteMove) {
        updated.push({ moveNumber: moveNum, white: moveDisplay, eval: response.feedback.evalAfter });
      } else {
        if (updated.length > 0) {
          updated[updated.length - 1].black = moveDisplay;
        }
      }
      
      // Add AI move if present
      if (response.feedback.aiMove) {
        const aiMoveNum = Math.ceil((updated.length + 1) / 2);
        if (isWhiteMove && updated.length > 0) {
          updated[updated.length - 1].black = response.feedback.aiMove.moveSan;
        } else {
          updated.push({ moveNumber: aiMoveNum, white: response.feedback.aiMove.moveSan });
        }
      }
      
      return updated;
    });

    // Improved Gamification: XP + Skill Rating system
    const delta = response.feedback.delta;
    const isBlunder = response.feedback.blunder;
    
    // Determine move quality
    let moveQuality: 'great' | 'good' | 'normal' | 'inaccuracy' | 'blunder';
    let xpGained = 0;
    let ratingChange = 0;
    
    if (delta >= 100) {
      moveQuality = 'great';
      xpGained = 50;
      ratingChange = +15;
      setCelebration('great');
    } else if (delta >= 30) {
      moveQuality = 'good';
      xpGained = 25;
      ratingChange = +8;
      setCelebration('good');
    } else if (isBlunder || delta <= -200) {
      moveQuality = 'blunder';
      xpGained = 0;  // NO XP for blunders!
      ratingChange = -25;
      setCelebration('blunder');
    } else if (delta <= -50) {
      moveQuality = 'inaccuracy';
      xpGained = 5;
      ratingChange = -10;
    } else {
      moveQuality = 'normal';
      xpGained = 10;
      ratingChange = +2;
    }
    
    // Track move for weakness analysis
    if (gameId && currentTurn) {
      const quality = getMoveQuality(delta, choice.moveUci === currentTurn.bestMove.moveUci);
      const phase = getGamePhase(currentTurn.fen);
      const concepts = getPositionConcepts(currentTurn.fen);
      const missedTactics = detectMissedTactics(
        currentTurn.fen, 
        choice.moveUci, 
        currentTurn.bestMove.moveUci, 
        delta
      );
      
      trackMove({
        gameId,
        moveNumber: moveCounter,
        fen: currentTurn.fen,
        moveUci: choice.moveUci,
        moveSan: uciToSan(currentTurn.fen, choice.moveUci),
        bestMoveUci: currentTurn.bestMove.moveUci,
        evalBefore: response.feedback.evalBefore,
        evalAfter: response.feedback.evalAfter,
        delta,
        quality,
        phase,
        conceptTags: [...concepts, ...response.feedback.conceptTags],
        missedTactics,
      });
      
      setMoveCounter(prev => prev + 1);
      
      // Track move achievement
      const isBestMove = choice.moveUci === currentTurn.bestMove.moveUci;
      const isBrilliant = moveQuality === 'great' && delta >= 200;
      const isTactic = missedTactics.length === 0 && response.feedback.conceptTags.some(
        t => ['fork', 'pin', 'skewer', 'discovery', 'sacrifice'].includes(t.toLowerCase())
      );
      
      const moveAchievements = achievementCtx.trackEvent({
        type: 'MOVE_PLAYED',
        isBestMove,
        isBrilliant,
        isTactic,
        tacticType: isTactic ? response.feedback.conceptTags[0] : undefined,
      });
      
      // Show achievement toasts for move-based achievements
      for (const progress of moveAchievements) {
        const achievement = achievementCtx.getAchievement(progress.achievementId);
        if (achievement) {
          handleAchievementUnlock(achievement, progress);
        }
      }
    }
    
    // Check if move was accurate (within reasonable delta)
    const isAccurate = delta >= -30;
    
    setPlayerStats(prev => {
      const newXp = prev.xp + xpGained;
      const xpForNextLevel = prev.level * 100;
      const levelUp = newXp >= xpForNextLevel;
      
      // Update skill rating (floor at 100)
      const newRating = Math.max(100, prev.skillRating + ratingChange);
      const newHighest = Math.max(prev.highestRating, newRating);
      
      // Count move types
      const isGoodMove = moveQuality === 'great' || moveQuality === 'good';
      const isBlunderMove = moveQuality === 'blunder';
      
      return {
        ...prev,
        xp: levelUp ? newXp - xpForNextLevel : newXp,
        level: levelUp ? prev.level + 1 : prev.level,
        totalMoves: prev.totalMoves + 1,
        accurateMoves: isAccurate ? prev.accurateMoves + 1 : prev.accurateMoves,
        goodMoves: isGoodMove ? prev.goodMoves + 1 : prev.goodMoves,
        blunders: isBlunderMove ? prev.blunders + 1 : prev.blunders,
        skillRating: newRating,
        highestRating: newHighest,
      };
    });

    // Clear celebration after animation
    setTimeout(() => setCelebration(null), 2000);
    
    // Track rating change achievement
    const oldRating = playerStats.skillRating;
    const newRatingValue = Math.max(100, oldRating + ratingChange);
    if (newRatingValue !== oldRating) {
      const ratingAchievements = achievementCtx.trackEvent({
        type: 'RATING_CHANGED',
        newRating: newRatingValue,
        oldRating: oldRating,
      });
      
      for (const progress of ratingAchievements) {
        const achievement = achievementCtx.getAchievement(progress.achievementId);
        if (achievement) {
          handleAchievementUnlock(achievement, progress);
        }
      }
    }

    // Generate castle spirit narration for the move
    const chess = new Chess(currentTurn.fen);
    const move = chess.move({ from: choice.moveUci.slice(0, 2), to: choice.moveUci.slice(2, 4) });
    if (move) {
      const taggerInput: TaggerInput = {
        evalBefore: response.feedback.evalBefore,
        evalAfter: response.feedback.evalAfter,
        isCapture: move.captured !== undefined,
        isCheck: move.san.includes('+'),
        isMate: move.san.includes('#'),
        pieceType: move.piece,
        fromSquare: move.from,
        toSquare: move.to,
        conceptTags: response.feedback.conceptTags,
        isPlayerMove: true,
        moveNumber: moveCounter,
      };
      narrateMove(taggerInput, moveCounter);
    }

    if (response.nextTurn) {
      setTurnPackage(response.nextTurn);
      setSelectedChoice(null);
    } else {
      // Game is over - determine end state
      setTurnPackage(null);
      
      // Check the final position
      const finalChess = new Chess(currentTurn.fen);
      finalChess.move({ from: choice.moveUci.slice(0, 2), to: choice.moveUci.slice(2, 4) });
      
      // Calculate accuracy
      const accuracy = playerStats.totalMoves > 0 
        ? Math.round((playerStats.accurateMoves / playerStats.totalMoves) * 100)
        : 0;
      
      // Calculate XP earned this game (rough estimate from recent moves)
      const xpEarned = Math.max(20, (playerStats.goodMoves * 25) - (playerStats.blunders * 10));
      
      setGameStats({
        xpEarned,
        movesPlayed: moveCounter,
        accuracy,
      });
      
      // Determine game result
      if (finalChess.isCheckmate()) {
        // Check who won
        const playerWon = finalChess.turn() !== 'w'; // If it's white's turn and checkmate, black won
        setGameEndState(playerWon ? 'victory' : 'defeat');
        playSound(playerWon ? 'victory' : 'game_over');
      } else if (finalChess.isDraw() || finalChess.isStalemate()) {
        setGameEndState('draw');
        playSound('draw');
      } else {
        // Game ended for other reason (e.g., resignation) - treat as defeat
        setGameEndState('defeat');
        playSound('game_over');
      }
    }
  };

  // Loading state
  if (loading && !turnPackage) {
    return (
      <div className="app-loading">
        <div className="loading-spinner" />
        <p>Preparing your training session...</p>
      </div>
    );
  }

  // Error state
  if (error && !turnPackage) {
    return (
      <div className="app-error">
        <div className="error-icon">⚠️</div>
        <h2>Connection Error</h2>
        <p>{error}</p>
        <button className="btn btn-primary" onClick={initializeGame}>
          Try Again
        </button>
      </div>
    );
  }

  // Get opponent info for prediction
  const getOpponentInfo = () => {
    if (opponentType === 'human-like') {
      return { 
        styleId: 'capablanca' as const, 
        name: `~${maiaOpponentRating} Player`,
        isHuman: true,
      };
    }
    
    const styleId = pendingResponse?.feedback?.aiMove?.styleId || 'fischer';
    const names: Record<string, string> = {
      tal: 'Tal',
      fischer: 'Fischer',
      capablanca: 'Capablanca',
      karpov: 'Karpov',
    };
    return { styleId, name: names[styleId] || 'The Master', isHuman: false };
  };

  // NOTE: These handlers moved to top-level hooks section to avoid
  // being called after early returns (which causes React error #300)

  return (
    <div className="app castle-theme">
      {/* Game End Screens (Phase 3) */}
      {gameEndState === 'defeat' && (
        <GameOverScreen
          xpEarned={gameStats.xpEarned}
          movesPlayed={gameStats.movesPlayed}
          accuracy={gameStats.accuracy}
          onTryAgain={handleGameEndTryAgain}
          onReturnToMap={handleGameEndReturnToMap}
        />
      )}
      {gameEndState === 'victory' && (
        <VictoryScreen
          xpEarned={gameStats.xpEarned}
          movesPlayed={gameStats.movesPlayed}
          accuracy={gameStats.accuracy}
          onTryAgain={handleGameEndTryAgain}
          onReturnToMap={handleGameEndReturnToMap}
        />
      )}
      {gameEndState === 'draw' && (
        <DrawScreen
          xpEarned={gameStats.xpEarned}
          movesPlayed={gameStats.movesPlayed}
          accuracy={gameStats.accuracy}
          onTryAgain={handleGameEndTryAgain}
          onReturnToMap={handleGameEndReturnToMap}
        />
      )}
      
      {/* Celebration overlay */}
      {celebration && <Celebration type={celebration} />}
      
      {/* Achievement Toast */}
      <AchievementToast 
        achievement={currentAchievement}
        onDismiss={dismissAchievement}
      />
      
      {/* Weakness Tracker Modal */}
      <WeaknessTracker 
        isOpen={showWeaknessTracker} 
        onClose={() => setShowWeaknessTracker(false)} 
      />
      
      {/* Settings Panel Modal */}
      <SettingsPanel
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        onSettingsChange={(settings) => setTone(settings.tone)}
        opponentType={opponentType}
        onOpponentTypeChange={setOpponentType}
        maiaRating={maiaOpponentRating}
        onMaiaRatingChange={setMaiaOpponentRating}
        playMode={playMode}
        onPlayModeChange={setPlayMode}
        playerColor={playerColor}
        onPlayerColorChange={setPlayerColor}
      />
      
      {/* Castle Map Modal */}
      {showCastleMap && (
        <div className="castle-map-modal" onClick={() => setShowCastleMap(false)}>
          <div className="castle-map-modal-content" onClick={e => e.stopPropagation()}>
            <button 
              className="modal-close" 
              onClick={() => setShowCastleMap(false)}
            >
              ✕
            </button>
            <CastleMap
              rooms={rooms}
              currentRoomId={currentRoom}
              onRoomSelect={setCurrentRoom}
              playerRating={playerStats.skillRating}
            />
          </div>
        </div>
      )}
      
      {/* Header with stats */}
      <Header 
        stats={playerStats} 
        onNewGame={initializeGame}
        onOpenWeaknessTracker={() => setShowWeaknessTracker(true)}
        predictionEnabled={predictionEnabled}
        onTogglePrediction={() => setPredictionEnabled((prev: boolean) => !prev)}
      />

      {/* Main content */}
      <main className="app-main">
        {/* Left: Game area */}
        <div className="game-area">
          {/* Chess board with evaluation bar and BoardFrame */}
          {/* Game Mode Controls - Always Visible */}
          <div className="game-mode-controls">
            <div className="mode-toggle-group">
              <span className="mode-label">Play:</span>
              <button
                className={`mode-btn ${playMode === 'guided' ? 'active' : ''}`}
                onClick={() => setPlayMode('guided')}
                title="Choose from master suggestions"
              >
                📚 Guided
              </button>
              <button
                className={`mode-btn ${playMode === 'free' ? 'active' : ''}`}
                onClick={() => setPlayMode('free')}
                title="Drag pieces manually"
              >
                ♟️ Free
              </button>
            </div>
            
            <div className="mode-toggle-group">
              <span className="mode-label">Color:</span>
              <button
                className={`mode-btn color-mode ${playerColor === 'white' ? 'active' : ''}`}
                onClick={() => setPlayerColor('white')}
                title="Play as White"
              >
                ♔ White
              </button>
              <button
                className={`mode-btn color-mode ${playerColor === 'black' ? 'active' : ''}`}
                onClick={() => setPlayerColor('black')}
                title="Play as Black"
              >
                ♚ Black
              </button>
            </div>
          </div>

          <div className="board-container">
            <div className="eval-bar-container">
              <div
                className="eval-bar-white"
                style={{
                  height: `${50 + (feedback?.evalAfter || 0) / 10}%`
                }}
              />
            </div>

            <ChessBoard
              fen={showPrediction && fenBeforeAiMove
                ? fenBeforeAiMove
                : (turnPackage?.fen || 'start')}
              choices={showPrediction ? undefined : (playMode === 'guided' ? turnPackage?.choices : undefined)}
              selectedChoice={showPrediction ? null : selectedChoice}
              hoveredChoice={showPrediction ? null : hoveredChoice}
              predictionHover={showPrediction ? predictionHover : undefined}
              freePlayMode={playMode === 'free'}
              onMove={handleFreeMove}
              orientation={playerColor}
            />
          </div>

          {/* Prediction Mode - show when we have the FEN after user's move */}
          {showPrediction && fenBeforeAiMove && (
            <div className="prediction-section animate-fade-in-up">
              <PredictOpponent
                fen={fenBeforeAiMove}
                onPredictionSubmit={handlePredictionSubmit}
                onSkip={handlePredictionSkip}
                timeLimit={15}
                masterStyle={getOpponentInfo().styleId}
                masterName={getOpponentInfo().name}
                onHoverMove={handlePredictionHover}
                isHumanLike={opponentType === 'human-like'}
                targetRating={maiaOpponentRating}
              />
              {loading && (
                <div className="prediction-loading">
                  <span className="loading-dot">●</span>
                  AI is thinking...
                </div>
              )}
            </div>
          )}

          {/* Prediction Result with Probability-Based Scoring */}
          {predictionResult && !showPrediction && (
            <div className={`prediction-result animate-fade-in ${predictionResult.correct ? 'correct' : 'incorrect'}`}>
              <div className="prediction-result-header">
                <span className="result-icon">
                  {predictionResult.correct ? (
                    <PixelIcon name="target" size="small" className="pixel-icon--green" />
                  ) : (
                    <PixelIcon name="cross" size="small" className="pixel-icon--red" />
                  )}
                </span>
                <span className="result-text">
                  {predictionResult.correct
                    ? `Correct! +${predictionResult.totalPoints || 50} XP`
                    : `${getOpponentInfo().name} played ${predictionResult.actual}`}
                </span>
              </div>
              
              {/* Show probability breakdown for human-like opponent */}
              {opponentType === 'human-like' && predictionResult.actualProbability !== undefined && (
                <div className="prediction-probability-breakdown">
                  <div className="prob-item">
                    <span className="prob-label">Actual move:</span>
                    <span className="prob-value">{(predictionResult.actualProbability * 100).toFixed(0)}% likely</span>
                  </div>
                  {!predictionResult.correct && predictionResult.pickProbability !== undefined && (
                    <div className="prob-item">
                      <span className="prob-label">Your pick:</span>
                      <span className="prob-value">{(predictionResult.pickProbability * 100).toFixed(0)}% likely</span>
                    </div>
                  )}
                  {predictionResult.totalPoints !== undefined && predictionResult.totalPoints > 0 && (
                    <div className="prob-item points">
                      <span className="prob-label">Points:</span>
                      <span className="prob-value">
                        {predictionResult.basePoints || 0} base 
                        {(predictionResult.probabilityBonus || 0) > 0 && 
                          ` + ${predictionResult.probabilityBonus} bonus`}
                      </span>
                    </div>
                  )}
                </div>
              )}
              
              <div className="prediction-stats-mini">
                <span>Streak: {predictionStats.streak} 🔥</span>
                <span>Accuracy: {predictionStats.total > 0 ? Math.round((predictionStats.correct / predictionStats.total) * 100) : 0}%</span>
              </div>
            </div>
          )}

          {/* Free play mode indicator */}
          {turnPackage && !showPrediction && playMode === 'free' && (() => {
            const isPlayerTurn = playerColor === 'white' 
              ? turnPackage.sideToMove === 'w'
              : turnPackage.sideToMove === 'b';
            return isPlayerTurn;
          })() && (
            <div className="free-play-indicator animate-fade-in-up">
              <div className="free-play-content">
                <span className="free-play-icon">🖱️</span>
                <div className="free-play-text">
                  <h3>Free Play Active</h3>
                  <p>
                    <strong>Click and drag</strong> any of your pieces to move.
                    {playerColor === 'white' ? ' You play White (bottom).' : ' You play Black (top).'}
                  </p>
                </div>
              </div>
              {loading && (
                <div className="free-play-loading">
                  <span className="loading-dot">●</span>
                  Opponent is thinking...
                </div>
              )}
            </div>
          )}

          {/* Waiting for opponent indicator */}
          {turnPackage && !showPrediction && (() => {
            const isPlayerTurn = playerColor === 'white' 
              ? turnPackage.sideToMove === 'w'
              : turnPackage.sideToMove === 'b';
            return !isPlayerTurn;
          })() && (
            <div className="waiting-for-opponent animate-fade-in-up">
              <div className="waiting-content">
                <span className="waiting-icon">⏳</span>
                <div className="waiting-text">
                  <h3>Waiting for Opponent</h3>
                  <p>
                    {turnPackage.sideToMove === 'w' ? 'White' : 'Black'} is thinking...
                    {loading && ' (Processing move...)'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Move choices - only show in guided mode, hide during prediction, and only when it's player's turn */}
          {turnPackage && !showPrediction && playMode === 'guided' && (() => {
            const isPlayerTurn = playerColor === 'white' 
              ? turnPackage.sideToMove === 'w'
              : turnPackage.sideToMove === 'b';
            return isPlayerTurn;
          })() && (
            <div className="choices-section animate-fade-in-up">
              <h2 className="section-title">
                <span className="title-icon">♟️</span>
                Choose Your Move
              </h2>
              <MoveChoices
                choices={turnPackage.choices}
                selectedChoice={selectedChoice}
                onSelectChoice={handleChoiceSelect}
                onHoverChoice={setHoveredChoice}
              />
              
              {/* Master Monologue for selected choice */}
              {selectedChoice && (() => {
                const choice = turnPackage.choices.find(c => c.id === selectedChoice);
                return choice ? (
                  <MasterMonologue
                    masterStyle={choice.styleId}
                    justification={choice.planOneLiner}
                    threats={choice.threats}
                  />
                ) : null;
              })()}
              
              {selectedChoice && (
                <div className="action-bar animate-fade-in">
                  <button
                    className="btn btn-primary btn-large"
                    onClick={handleMoveSubmit}
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <span className="loading-dot">●</span>
                        Processing...
                      </>
                    ) : (
                      <>
                        <span>⚡</span>
                        Make Move
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Feedback panel */}
          {feedback && !showPrediction && (
            <div className="feedback-section animate-slide-in-right">
              <Feedback feedback={feedback} />
            </div>
          )}

          {/* Spirit Whisper Narration */}
          {narration.isVisible && (
            <div className="spirit-section animate-fade-in-up">
              <SpiritWhisper
                text={narration.text}
                severity={narration.severity}
                typewriterSpeed={tone === 'ruthless' ? 20 : tone === 'whimsical' ? 40 : 30}
                showPortrait={true}
                onComplete={() => {
                  // Auto-hide after 15 seconds (increased for readability)
                  setTimeout(hideNarration, 15000);
                }}
              />
            </div>
          )}
        </div>

        {/* Right: Sidebar */}
        <Sidebar 
          moveHistory={moveHistory}
          playerStats={playerStats}
          currentEval={feedback?.evalAfter || 0}
        />
      </main>
      
      {/* Castle Quick Actions (Desktop) */}
      <div className="castle-quick-actions">
        <button 
          className="castle-action-btn"
          onClick={() => setShowCastleMap(true)}
          title="Castle Map"
        >
          <PixelIcon name="castle" size="small" />
        </button>
        <button 
          className="castle-action-btn"
          onClick={() => setShowSettings(true)}
          title="Settings"
        >
          ⚙️
        </button>
      </div>

      {/* Mobile Bottom Navigation */}
      <BottomNav
        predictionEnabled={predictionEnabled}
        onTogglePrediction={() => setPredictionEnabled((prev: boolean) => !prev)}
        onOpenWeaknessTracker={() => setShowWeaknessTracker(true)}
        onNewGame={initializeGame}
      />
    </div>
  );
}

export default App;
