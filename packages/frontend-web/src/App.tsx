/**
 * Master Academy Chess - Main Application
 * Premium chess learning experience with master-style coaching
 */

import { useState, useEffect, useCallback } from 'react';
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
import './App.css';

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
  
  // Prediction mode state
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
  } | null>(null);
  
  // Prediction hover state (for board visualization)
  const [predictionHover, setPredictionHover] = useState<{ from: string | null; to: string | null }>({ from: null, to: null });
  
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
      
      setPlayerStats(prev => ({
        ...prev,
        gamesPlayed: prev.gamesPlayed + 1,
      }));
    } catch (err) {
      setError('Failed to initialize game');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    initializeGame();
  }, [initializeGame]);

  const handleChoiceSelect = (choiceId: string) => {
    setSelectedChoice(choiceId);
  };

  const handleMoveSubmit = async () => {
    if (!gameId || !selectedChoice || !turnPackage) return;

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
      
      // STEP 2: Show prediction mode if enabled
      if (predictionEnabled) {
        setShowPrediction(true);
      }
      setLoading(true);
      
      // STEP 3: Call API in the background
      const moveRequest: MoveRequest = {
        moveUci: choice.moveUci,
        choiceId: selectedChoice,
      };

      const response = await submitMove(gameId, moveRequest);
      setLoading(false);
      
      // STEP 4: Handle response based on prediction mode
      if (response.feedback.aiMove && response.nextTurn) {
        if (predictionEnabled) {
          setPendingResponse(response);
          // Keep showing prediction - user will submit or timeout
          return;
        } else {
          // Prediction disabled - process directly
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

  const handlePredictionSubmit = (predictedMoveUci: string) => {
    // If API hasn't returned yet, store the prediction and wait
    if (!pendingResponse?.feedback.aiMove) {
      setUserPrediction(predictedMoveUci);
      return;
    }
    
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
    
    setPredictionResult({
      predicted: predictedMoveUci,
      actual: aiMoveSan,
      correct: isCorrect,
    });
    
    // Update prediction stats
    setPredictionStats((prev: { total: number; correct: number; streak: number }) => ({
      total: prev.total + 1,
      correct: isCorrect ? prev.correct + 1 : prev.correct,
      streak: isCorrect ? prev.streak + 1 : 0,
    }));
    
    // Award bonus XP for correct prediction
    if (isCorrect) {
      setCelebration('predict');
      setPlayerStats(prev => ({
        ...prev,
        xp: prev.xp + 50,
        skillRating: prev.skillRating + 5,
        highestRating: Math.max(prev.highestRating, prev.skillRating + 5),
      }));
      setTimeout(() => setCelebration(null), 2000);
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

  const finishPredictionFlow = () => {
    setShowPrediction(false);
    
    if (pendingResponse && turnPackage) {
      const choice = turnPackage.choices.find(c => c.id === selectedChoice);
      if (choice) {
        processMoveResponse(pendingResponse, choice, turnPackage);
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

    if (response.nextTurn) {
      setTurnPackage(response.nextTurn);
      setSelectedChoice(null);
    } else {
      setTurnPackage(null);
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

  // Get master info for prediction
  const getAiMasterInfo = () => {
    const styleId = pendingResponse?.feedback?.aiMove?.styleId || 'fischer';
    const names: Record<string, string> = {
      tal: 'Tal',
      fischer: 'Fischer',
      capablanca: 'Capablanca',
      karpov: 'Karpov',
    };
    return { styleId, name: names[styleId] || 'The Master' };
  };

  return (
    <div className="app">
      {/* Celebration overlay */}
      {celebration && <Celebration type={celebration} />}
      
      {/* Weakness Tracker Modal */}
      <WeaknessTracker 
        isOpen={showWeaknessTracker} 
        onClose={() => setShowWeaknessTracker(false)} 
      />
      
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
          {/* Chess board with evaluation bar */}
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
              choices={showPrediction ? undefined : turnPackage?.choices}
              selectedChoice={showPrediction ? null : selectedChoice}
              predictionHover={showPrediction ? predictionHover : undefined}
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
                masterStyle={getAiMasterInfo().styleId}
                masterName={getAiMasterInfo().name}
                onHoverMove={(from, to) => setPredictionHover({ from, to })}
              />
              {loading && (
                <div className="prediction-loading">
                  <span className="loading-dot">●</span>
                  AI is thinking...
                </div>
              )}
            </div>
          )}

          {/* Prediction Result */}
          {predictionResult && !showPrediction && (
            <div className={`prediction-result animate-fade-in ${predictionResult.correct ? 'correct' : 'incorrect'}`}>
              <div className="prediction-result-header">
                <span className="result-icon">{predictionResult.correct ? '🎯' : '❌'}</span>
                <span className="result-text">
                  {predictionResult.correct 
                    ? 'Perfect prediction! +50 XP' 
                    : `You predicted ${predictionResult.predicted.slice(2,4)}, but ${getAiMasterInfo().name} played ${predictionResult.actual}`}
                </span>
              </div>
              <div className="prediction-stats-mini">
                <span>Prediction streak: {predictionStats.streak} 🔥</span>
                <span>Accuracy: {predictionStats.total > 0 ? Math.round((predictionStats.correct / predictionStats.total) * 100) : 0}%</span>
              </div>
            </div>
          )}

          {/* Move choices - hide during prediction */}
          {turnPackage && !showPrediction && (
            <div className="choices-section animate-fade-in-up">
              <h2 className="section-title">
                <span className="title-icon">♟️</span>
                Choose Your Move
              </h2>
              <MoveChoices
                choices={turnPackage.choices}
                selectedChoice={selectedChoice}
                onSelectChoice={handleChoiceSelect}
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
        </div>

        {/* Right: Sidebar */}
        <Sidebar 
          moveHistory={moveHistory}
          playerStats={playerStats}
          currentEval={feedback?.evalAfter || 0}
        />
      </main>
    </div>
  );
}

export default App;
