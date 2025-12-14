/**
 * Master Academy Chess - Main Application
 * Premium chess learning experience with master-style coaching
 */

import { useState, useEffect, useCallback } from 'react';
import { ChessBoard } from './components/ChessBoard';
import { MoveChoices } from './components/MoveChoices';
import { Feedback } from './components/Feedback';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { Celebration } from './components/Celebration';
import { createGame, getTurn, submitMove } from './api/client';
import { TurnPackage, MoveRequest, MoveResponse } from '@master-academy/contracts';
import './App.css';

// Gamification state
interface PlayerStats {
  xp: number;
  level: number;
  streak: number;
  gamesPlayed: number;
  goodMoves: number;
  blunders: number;
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
  
  // Gamification
  const [playerStats, setPlayerStats] = useState<PlayerStats>(() => {
    const saved = localStorage.getItem('masterAcademy_stats');
    return saved ? JSON.parse(saved) : {
      xp: 0,
      level: 1,
      streak: 1,
      gamesPlayed: 0,
      goodMoves: 0,
      blunders: 0,
    };
  });
  
  // Celebration state
  const [celebration, setCelebration] = useState<'good' | 'great' | 'blunder' | null>(null);

  // Save stats to localStorage
  useEffect(() => {
    localStorage.setItem('masterAcademy_stats', JSON.stringify(playerStats));
  }, [playerStats]);

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
      setLoading(true);
      setError(null);
      const moveRequest: MoveRequest = {
        moveUci: choice.moveUci,
        choiceId: selectedChoice,
      };

      const response = await submitMove(gameId, moveRequest);
      setFeedback(response.feedback);

      // Update move history
      const moveNum = Math.ceil((moveHistory.length + 1) / 2);
      const isWhiteMove = turnPackage.sideToMove === 'w';
      
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

      // Gamification: award XP based on move quality
      const delta = response.feedback.delta;
      let xpGained = 10; // base XP
      
      if (delta > 50) {
        xpGained = 25;
        setCelebration('good');
        setPlayerStats(prev => ({ ...prev, goodMoves: prev.goodMoves + 1 }));
      } else if (delta > 100) {
        xpGained = 50;
        setCelebration('great');
        setPlayerStats(prev => ({ ...prev, goodMoves: prev.goodMoves + 1 }));
      } else if (response.feedback.blunder) {
        xpGained = 5;
        setCelebration('blunder');
        setPlayerStats(prev => ({ ...prev, blunders: prev.blunders + 1 }));
      }
      
      setPlayerStats(prev => {
        const newXp = prev.xp + xpGained;
        const xpForNextLevel = prev.level * 100;
        const levelUp = newXp >= xpForNextLevel;
        
        return {
          ...prev,
          xp: levelUp ? newXp - xpForNextLevel : newXp,
          level: levelUp ? prev.level + 1 : prev.level,
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
    } catch (err) {
      setError('Failed to submit move');
      console.error(err);
    } finally {
      setLoading(false);
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

  return (
    <div className="app">
      {/* Celebration overlay */}
      {celebration && <Celebration type={celebration} />}
      
      {/* Header with stats */}
      <Header 
        stats={playerStats} 
        onNewGame={initializeGame}
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
              fen={turnPackage?.fen || 'start'}
              choices={turnPackage?.choices}
              selectedChoice={selectedChoice}
            />
          </div>

          {/* Move choices */}
          {turnPackage && (
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
          {feedback && (
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
