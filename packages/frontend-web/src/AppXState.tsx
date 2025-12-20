/**
 * XState-Powered App Component
 * 
 * This component replaces the useState-based App.tsx with XState machine state.
 * It consumes from useGameMachineContext() and passes state to existing UI components.
 * 
 * Phase 2 of XState migration - uses existing components, just different state source.
 */

import { useEffect, useMemo, useCallback, useState } from 'react';
import { Chess } from 'chess.js';
import { ChessBoard } from './components/ChessBoard';
import { MoveChoices } from './components/MoveChoices';
import { Feedback } from './components/Feedback';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { Celebration } from './components/Celebration';
import { PredictOpponent } from './components/PredictOpponent';
import { WeaknessTracker } from './components/WeaknessTracker';
import { BottomNav } from './components/BottomNav';
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
  PixelIcon,
} from './ui/castle';
import { useNarration } from './hooks/useNarration';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useAudio } from './audio';
import { useAchievementContext, Achievement } from './achievements';
import { useMaiaContext } from './maia';
import { useGameMachineContext } from './machines';
import type { MoveChoice } from '@master-academy/contracts';
import './App.css';
import './styles/sierra-vga.css';

// Master info for opponent display
const MASTER_INFO: Record<string, { name: string; styleId: string }> = {
  capablanca: { name: 'Capablanca', styleId: 'capablanca' },
  tal: { name: 'Tal', styleId: 'tal' },
  karpov: { name: 'Karpov', styleId: 'karpov' },
  fischer: { name: 'Fischer', styleId: 'fischer' },
};

function AppXState() {
  // ============================================================================
  // XSTATE MACHINE CONTEXT
  // ============================================================================
  const machine = useGameMachineContext();
  
  // Destructure commonly used values
  const {
    // State
    state,
    gamePhase,
    isPlayerTurn,
    isShowingPrediction,
    isSubmittingMove,
    isCreatingGame,
    currentFen,
    
    // Context values
    gameId,
    choices,
    selectedChoice,
    hoveredChoice,
    feedback,
    playerStats,
    moveHistory,
    celebration,
    gameEndState,
    gameStats,
    loading,
    error,
    showSettings,
    opponentType,
    maiaOpponentRating,
    playMode,
    playerColor,
    predictionEnabled,
    predictionResult,
    predictionStats,
    predictionHover,
    fenBeforeAiMove,
    
    // Event dispatchers
    startGame,
    selectChoice,
    hoverChoice,
    submitMove,
    skipPrediction,
    newGame,
    retry,
    updateSettings,
    toggleSettings,
    clearCelebration,
    freePlayMove,
    hoverPrediction,
    onGameEnd,
  } = machine;
  
  // ============================================================================
  // LOCAL UI STATE (not part of game logic)
  // ============================================================================
  const [showCastleMap, setShowCastleMap] = useState(false);
  const [showWeaknessTracker, setShowWeaknessTracker] = useState(false);
  const [rooms] = useState(DEFAULT_ROOMS);
  const [currentRoom, setCurrentRoom] = useState('courtyard');
  
  // ============================================================================
  // HOOKS
  // ============================================================================
  const achievementCtx = useAchievementContext();
  const audio = useAudio();
  const { currentAchievement, showAchievement, dismissCurrent } = useAchievementToast();
  
  // Narration (castle spirit) - takes gameId
  const { 
    narration,
    hideNarration,
  } = useNarration(gameId || 'default');
  
  // ============================================================================
  // AUTO-START GAME
  // ============================================================================
  useEffect(() => {
    // Start a new game when machine is in idle state and no game exists
    if (state.matches('idle') && !gameId) {
      console.log('[AppXState] Starting new game...');
      startGame();
    }
  }, [state, gameId, startGame]);
  
  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================
  
  // Check if player is in check
  const isInCheck = useMemo(() => {
    const fenToCheck = currentFen;
    if (!fenToCheck || fenToCheck === 'start') return false;
    try {
      const chess = new Chess(fenToCheck);
      return chess.inCheck();
    } catch {
      return false;
    }
  }, [currentFen]);
  
  // Get opponent info based on current settings
  const getOpponentInfo = useCallback(() => {
    if (opponentType === 'human-like') {
      return {
        name: `Maia ${maiaOpponentRating}`,
        styleId: 'human-like',
      };
    }
    // For AI master, use a random master
    const masters = Object.keys(MASTER_INFO);
    const masterKey = masters[Math.floor(Math.random() * masters.length)];
    return MASTER_INFO[masterKey];
  }, [opponentType, maiaOpponentRating]);
  
  // Is it the player's turn to move?
  const shouldShowMoveChoices = useMemo(() => {
    return isPlayerTurn && playMode === 'guided' && !isShowingPrediction && choices.length > 0;
  }, [isPlayerTurn, playMode, isShowingPrediction, choices]);
  
  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================
  
  // Handle move selection
  const handleSelectChoice = useCallback((choiceId: string) => {
    selectChoice(choiceId);
  }, [selectChoice]);
  
  // Handle move hover
  const handleHoverChoice = useCallback((choice: MoveChoice | null) => {
    hoverChoice(choice);
  }, [hoverChoice]);
  
  // Handle move submission (when clicking "Confirm" or double-clicking)
  const handleConfirmMove = useCallback(() => {
    if (selectedChoice) {
      submitMove(selectedChoice);
    }
  }, [selectedChoice, submitMove]);
  
  // Handle free play move (drag and drop) - must return boolean
  const handleFreeMove = useCallback((from: string, to: string, promotion?: string): boolean => {
    freePlayMove(from, to, promotion);
    return true; // Optimistically return success
  }, [freePlayMove]);
  
  // Handle prediction submission
  const handlePredictionSubmit = useCallback((predictedUci: string) => {
    machine.submitPrediction(predictedUci);
  }, [machine]);
  
  // Handle prediction skip
  const handlePredictionSkip = useCallback(() => {
    skipPrediction();
  }, [skipPrediction]);
  
  // Handle prediction hover (for arrow display)
  const handlePredictionHover = useCallback((from: string | null, to: string | null) => {
    hoverPrediction(from, to);
  }, [hoverPrediction]);
  
  // Handle new game
  const handleNewGame = useCallback(() => {
    newGame();
    startGame();
  }, [newGame, startGame]);
  
  // Handle retry after error
  const handleRetry = useCallback(() => {
    retry();
    startGame();
  }, [retry, startGame]);
  
  // Handle achievement unlock
  const handleAchievementUnlock = useCallback((achievement: Achievement) => {
    showAchievement(achievement);
    audio.playSound('achievement_unlock');
  }, [showAchievement, audio]);
  
  // Handle settings changes
  const handleOpponentTypeChange = useCallback((type: 'ai-master' | 'human-like') => {
    updateSettings({ opponentType: type });
  }, [updateSettings]);
  
  const handleMaiaRatingChange = useCallback((rating: typeof maiaOpponentRating) => {
    updateSettings({ maiaOpponentRating: rating });
  }, [updateSettings]);
  
  const handlePlayModeChange = useCallback((mode: 'guided' | 'free') => {
    updateSettings({ playMode: mode });
  }, [updateSettings]);
  
  const handlePlayerColorChange = useCallback((color: 'white' | 'black') => {
    updateSettings({ playerColor: color });
  }, [updateSettings]);
  
  const handleTogglePrediction = useCallback(() => {
    updateSettings({ predictionEnabled: !predictionEnabled });
  }, [updateSettings, predictionEnabled]);
  
  // ============================================================================
  // KEYBOARD SHORTCUTS
  // ============================================================================
  useKeyboardShortcuts({
    confirmMove: handleConfirmMove,
    newGame: handleNewGame,
    openSettings: () => toggleSettings(),
  }, { disabled: false });
  
  // ============================================================================
  // RENDER
  // ============================================================================
  
  // Loading state
  if (gamePhase === 'loading' || isCreatingGame) {
    return (
      <div className="app app-loading">
        <div className="loading-container">
          <div className="loading-spinner" />
          <p>Preparing your training session...</p>
        </div>
      </div>
    );
  }
  
  // Error state
  if (gamePhase === 'error' || error) {
    return (
      <div className="app app-error">
        <div className="error-container">
          <h2>Something went wrong</h2>
          <p>{error || 'An unexpected error occurred'}</p>
          <button onClick={handleRetry}>Try Again</button>
        </div>
      </div>
    );
  }
  
  // Game over states
  if (gameEndState === 'victory') {
    return (
      <VictoryScreen
        xpEarned={gameStats?.xpEarned || 0}
        movesPlayed={gameStats?.movesPlayed || 0}
        accuracy={gameStats?.accuracy || 0}
        onTryAgain={handleNewGame}
        onReturnToMap={() => setShowCastleMap(true)}
      />
    );
  }
  
  if (gameEndState === 'defeat') {
    return (
      <GameOverScreen
        xpEarned={gameStats?.xpEarned || 0}
        movesPlayed={gameStats?.movesPlayed || 0}
        accuracy={gameStats?.accuracy || 0}
        onTryAgain={handleNewGame}
        onReturnToMap={() => setShowCastleMap(true)}
      />
    );
  }
  
  if (gameEndState === 'draw') {
    return (
      <DrawScreen
        xpEarned={gameStats?.xpEarned || 0}
        movesPlayed={gameStats?.movesPlayed || 0}
        accuracy={gameStats?.accuracy || 0}
        onTryAgain={handleNewGame}
        onReturnToMap={() => setShowCastleMap(true)}
      />
    );
  }
  
  return (
    <div className="app">
      {/* Achievement Toast */}
      {currentAchievement && (
        <AchievementToast
          achievement={currentAchievement}
          onDismiss={dismissCurrent}
        />
      )}
      
      {/* Celebration Overlay */}
      {celebration && (
        <Celebration type={celebration} />
      )}
      
      {/* Weakness Tracker Modal */}
      {showWeaknessTracker && (
        <WeaknessTracker 
          isOpen={showWeaknessTracker}
          onClose={() => setShowWeaknessTracker(false)} 
        />
      )}
      
      {/* Settings Panel Modal */}
      <SettingsPanel
        isOpen={showSettings}
        onClose={() => toggleSettings()}
        opponentType={opponentType}
        onOpponentTypeChange={handleOpponentTypeChange}
        maiaRating={maiaOpponentRating}
        onMaiaRatingChange={handleMaiaRatingChange}
        playMode={playMode}
        onPlayModeChange={handlePlayModeChange}
        playerColor={playerColor}
        onPlayerColorChange={handlePlayerColorChange}
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
        onNewGame={handleNewGame}
        onOpenWeaknessTracker={() => setShowWeaknessTracker(true)}
        predictionEnabled={predictionEnabled}
        onTogglePrediction={handleTogglePrediction}
      />

      {/* Main content */}
      <main className="app-main">
        {/* Left: Game area */}
        <div className="game-area">
          {/* Game Mode Controls */}
          <div className="game-mode-controls">
            <div className="mode-toggle-group">
              <span className="mode-label">Play:</span>
              <button
                className={`mode-btn ${playMode === 'guided' ? 'active' : ''}`}
                onClick={() => handlePlayModeChange('guided')}
                title="Choose from master suggestions"
              >
                📚 Guided
              </button>
              <button
                className={`mode-btn ${playMode === 'free' ? 'active' : ''}`}
                onClick={() => handlePlayModeChange('free')}
                title="Drag pieces manually"
              >
                ♟️ Free
              </button>
            </div>
            
            <div className="mode-toggle-group">
              <span className="mode-label">Color:</span>
              <button
                className={`mode-btn color-mode ${playerColor === 'white' ? 'active' : ''}`}
                onClick={() => handlePlayerColorChange('white')}
                title="Play as White"
              >
                ♔ White
              </button>
              <button
                className={`mode-btn color-mode ${playerColor === 'black' ? 'active' : ''}`}
                onClick={() => handlePlayerColorChange('black')}
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
              fen={
                isShowingPrediction && fenBeforeAiMove
                  ? fenBeforeAiMove
                  : currentFen || 'start'
              }
              choices={isShowingPrediction ? undefined : (playMode === 'guided' ? choices : undefined)}
              selectedChoice={isShowingPrediction ? null : selectedChoice}
              hoveredChoice={isShowingPrediction ? null : hoveredChoice}
              predictionHover={isShowingPrediction ? predictionHover : undefined}
              freePlayMode={playMode === 'free' && !isShowingPrediction && !loading}
              onMove={handleFreeMove}
              orientation={playerColor}
            />
          </div>

          {/* Prediction Mode */}
          {isShowingPrediction && fenBeforeAiMove && (
            <div className="prediction-section animate-fade-in-up">
              <PredictOpponent
                fen={fenBeforeAiMove}
                onPredictionSubmit={handlePredictionSubmit}
                onSkip={handlePredictionSkip}
                timeLimit={25}
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

          {/* Prediction Result */}
          {predictionResult && !isShowingPrediction && (
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
          {isPlayerTurn && !isShowingPrediction && playMode === 'free' && (
            <div className="free-play-indicator animate-fade-in-up">
              <div className="free-play-content">
                <span className="free-play-icon">🖱️</span>
                <div className="free-play-text">
                  <h3>Free Play Active</h3>
                  <p>Drag pieces to make your move</p>
                </div>
              </div>
            </div>
          )}

          {/* Move Choices (guided mode) */}
          {shouldShowMoveChoices && (
            <MoveChoices
              choices={choices}
              selectedChoice={selectedChoice}
              onSelectChoice={handleSelectChoice}
              onHoverChoice={handleHoverChoice}
            />
          )}

          {/* Confirm Button */}
          {selectedChoice && !isShowingPrediction && !isSubmittingMove && (
            <button 
              className="confirm-move-btn animate-fade-in"
              onClick={handleConfirmMove}
              disabled={isSubmittingMove}
            >
              {isSubmittingMove ? 'Submitting...' : 'Confirm Move'}
            </button>
          )}
          
          {/* Feedback Section */}
          {feedback && !isShowingPrediction && (
            <Feedback feedback={feedback} />
          )}
        </div>

        {/* Right: Sidebar */}
        <Sidebar
          moveHistory={moveHistory}
          playerStats={playerStats}
          currentEval={feedback?.evalAfter || 0}
        />
      </main>

      {/* Spirit Whisper (narration) */}
      {narration.isVisible && narration.text && (
        <SpiritWhisper
          text={narration.text}
          severity={narration.severity}
          onComplete={hideNarration}
        />
      )}

      {/* Bottom Navigation */}
      <BottomNav
        predictionEnabled={predictionEnabled}
        onTogglePrediction={handleTogglePrediction}
        onOpenWeaknessTracker={() => setShowWeaknessTracker(true)}
        onNewGame={handleNewGame}
      />
    </div>
  );
}

export default AppXState;
