/**
 * Predict Opponent Component
 * 
 * A quiz-style prediction challenge using Maia neural network
 * for human-like move probability prediction.
 */

import { useState, useEffect, useMemo } from 'react';
import { Chess, Square } from 'chess.js';
import { useMaiaPredictions, MovePrediction, formatProbabilityValue } from '../maia';
import { PixelIcon } from '../ui/castle/PixelIcon';
import { MoveChoices } from './MoveChoices';
import { MoveChoice } from '@master-academy/contracts';
import './PredictOpponent.css';

interface PredictOpponentProps {
  fen: string;
  onPredictionSubmit: (prediction: string) => void;
  onSkip: () => void;
  timeLimit?: number;
  masterStyle: string;
  masterName: string;
  onHoverMove?: (from: string | null, to: string | null) => void;
  /** Target rating for Maia predictions (1100-1900) */
  targetRating?: number;
  /** Whether opponent is human-like (Maia) or AI Master */
  isHumanLike?: boolean;
  /** Compact mode - renders only the choice cards inline for toolbar use */
  compact?: boolean;
  /** Whether to start the countdown timer (waits for feedback dismissal) */
  startTimer?: boolean;
}

interface CandidateMove {
  san: string;
  uci: string;
  from: string;
  to: string;
  probability: number;
  explanation: string;
}

export const PredictOpponent: React.FC<PredictOpponentProps> = ({
  fen,
  onPredictionSubmit,
  onSkip,
  timeLimit = 15,
  masterStyle,
  masterName,
  onHoverMove,
  targetRating = 1500,
  isHumanLike = false,
  compact = false,
  startTimer = true,
}) => {
  const [selectedMove, setSelectedMove] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(timeLimit);
  const [hoveredMove, setHoveredMove] = useState<string | null>(null);
  const [isLockingIn, setIsLockingIn] = useState(false); // Visual feedback when auto-submitting
  const [timerStarted, setTimerStarted] = useState(false);

  // Use Maia for predictions
  const {
    predictions: maiaPredictions,
    isLoading: maiaLoading,
    isReady: maiaReady,
    error: maiaError,
    inferenceTime,
    modelRating,
  } = useMaiaPredictions(fen);

  // Track if we've waited too long for Maia (show fallback after 5 seconds)
  const [showFallback, setShowFallback] = useState(false);
  
  useEffect(() => {
    if (maiaLoading && !maiaReady) {
      const timer = setTimeout(() => {
        setShowFallback(true);
      }, 5000); // Show fallback after 5 seconds
      return () => clearTimeout(timer);
    } else {
      setShowFallback(false);
    }
  }, [maiaLoading, maiaReady]);

  // Convert Maia predictions to MoveChoice format for MoveChoices component
  // Note: Predictions only make sense for human-like opponents
  // AI master opponents play deterministically, not based on probability
  const predictionChoices = useMemo((): MoveChoice[] => {
    if (!isHumanLike) {
      // Predictions don't apply to AI master opponents
      return [];
    }
    
    // If Maia predictions are available, use them
    if (maiaPredictions.length > 0) {
      // Show up to 4 predictions (or all available if less)
      return maiaPredictions.slice(0, Math.min(4, maiaPredictions.length)).map((p, index) => {
        const explanation = getMovePurpose(p, fen);
        // Use adaptive formatting for probabilities (handles very small values properly)
        const probDisplay = formatProbabilityValue(p.probability);
        
        return {
          id: `prediction-${p.uci}-${index}`,
          moveUci: p.uci,
          planOneLiner: `${probDisplay}% of ${targetRating}-rated players play this move. ${explanation}`,
          styleId: 'human-like', // Use special human-like style for Maia predictions
          pv: [p.uci], // Principal variation - just the move itself for predictions
          eval: Math.round(p.probability * 1000), // Convert probability to eval-like score
          conceptTags: ['human-like', `~${probDisplay}%`],
        };
      });
    }

    // Fallback to simple heuristic if Maia not ready or errored
    const fallbackMoves = getFallbackMoves(fen);
    return fallbackMoves.slice(0, Math.min(4, fallbackMoves.length)).map((move, index) => ({
      id: `fallback-${move.uci}-${index}`,
      moveUci: move.uci,
      planOneLiner: move.explanation,
      styleId: 'human-like',
      pv: [move.uci], // Principal variation - just the move itself
      eval: 0,
      conceptTags: ['heuristic'],
    }));
  }, [isHumanLike, maiaPredictions, fen, targetRating]);
  
  // Determine if we should show loading state
  // Show loading only if: Maia is loading AND we haven't timed out AND no fallback available
  const shouldShowLoading = maiaLoading && !showFallback && predictionChoices.length === 0;
  
  // Map selectedMove (UCI) to selectedChoice (choice ID)
  const selectedChoiceId = useMemo(() => {
    if (!selectedMove) return null;
    return predictionChoices.find(c => c.moveUci === selectedMove)?.id || null;
  }, [selectedMove, predictionChoices]);

  // Countdown timer - only runs when startTimer is true
  useEffect(() => {
    // Don't start countdown until startTimer is true
    if (!startTimer) {
      setTimerStarted(false);
      return;
    }

    // Mark timer as started
    if (!timerStarted) {
      setTimerStarted(true);
    }

    if (timeRemaining <= 0) {
      // If user selected a move, auto-submit it; otherwise skip
      if (selectedMove) {
        onPredictionSubmit(selectedMove);
      } else {
        onSkip();
      }
      return;
    }

    const timer = setInterval(() => {
      setTimeRemaining(t => t - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeRemaining, onSkip, onPredictionSubmit, selectedMove, startTimer, timerStarted]);

  // Hover is now handled by MoveChoices component via onHoverChoice callback
  // No need for separate hover tracking here

  // Reset selection and timer when FEN changes
  useEffect(() => {
    setSelectedMove(null);
    setTimeRemaining(timeLimit);
    setIsLockingIn(false);
    setTimerStarted(false);
  }, [fen, timeLimit]);

  const handleSkip = () => {
    if (!isLockingIn) {
      onSkip();
    }
  };

  const getMasterIcon = () => {
    switch (masterStyle) {
      case 'tal': return <PixelIcon name="sword" size="small" />;
      case 'fischer': return <PixelIcon name="trophy" size="small" />;
      case 'capablanca': return <PixelIcon name="crown" size="small" />;
      case 'karpov': return <PixelIcon name="target" size="small" />;
      default: return <PixelIcon name="ghost" size="small" />;
    }
  };

  const getStyleHint = () => {
    switch (masterStyle) {
      case 'tal':
        return 'Look for the most aggressive, attacking move!';
      case 'fischer':
        return 'Think: what\'s the objectively best move here?';
      case 'capablanca':
        return 'Simple and solid - what improves the position?';
      case 'karpov':
        return 'What move would restrict your options?';
      default:
        return 'What would a master play here?';
    }
  };

  // getMoveLabel and formatProbability no longer needed - MoveChoices handles display

  // COMPACT MODE: Just render the choices inline for toolbar use
  if (compact) {
    if (shouldShowLoading) {
      return (
        <div className="prediction-loading-compact">
          <span className="loading-spinner-small"></span>
        </div>
      );
    }
    
    return (
      <div className="predict-opponent-compact">
        {/* Compact timer - show paused state if not started */}
        <div className={`prediction-timer-compact ${
          timeRemaining <= 5 && timerStarted ? 'urgent' : ''
        } ${!timerStarted ? 'paused' : ''}`}>
          <span className="timer-value-compact">
            {!timerStarted && '⏸ '}
            {timeRemaining}s
          </span>
        </div>
        
        {/* Just the choices inline */}
        <MoveChoices
          choices={predictionChoices}
          selectedChoice={selectedChoiceId}
          onSelectChoice={(choiceId) => {
            const choice = predictionChoices.find(c => c.id === choiceId);
            if (choice && !isLockingIn) {
              setSelectedMove(choice.moveUci);
              if (onHoverMove) {
                const from = choice.moveUci.slice(0, 2);
                const to = choice.moveUci.slice(2, 4);
                onHoverMove(from, to);
              }
              setIsLockingIn(true);
              setTimeout(() => {
                onPredictionSubmit(choice.moveUci);
              }, 400); // Faster for compact mode
            }
          }}
          onHoverChoice={(choice) => {
            if (choice && onHoverMove) {
              const from = choice.moveUci.slice(0, 2);
              const to = choice.moveUci.slice(2, 4);
              onHoverMove(from, to);
            } else if (!choice && onHoverMove) {
              onHoverMove(null, null);
            }
          }}
        />
      </div>
    );
  }

  // FULL MODE: Original UI with header, hints, etc.
  return (
    <div className="predict-opponent-v2">
      <div className="predict-header-v2">
        <div className="predict-title-v2">
          <span className="predict-icon-v2">🧠</span>
          <div className="title-text">
            <h3>Predict the Response</h3>
            <p className="subtitle">What will {masterName} play?</p>
          </div>
        </div>
        <div className={`predict-timer-v2 ${
          timeRemaining <= 5 && timerStarted ? 'urgent' : ''
        } ${!timerStarted ? 'paused' : ''}`}>
          <div className="timer-ring">
            <svg viewBox="0 0 36 36">
              <path
                className="timer-bg"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className="timer-fill"
                strokeDasharray={`${(timeRemaining / timeLimit) * 100}, 100`}
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <span className="timer-value-v2">
              {!timerStarted && '⏸ '}
              {timeRemaining}
            </span>
          </div>
        </div>
      </div>

      <div className="master-hint-v2">
        <span className="master-emoji-v2">{getMasterIcon()}</span>
        <span className="hint-text">{getStyleHint()}</span>
      </div>

      {/* Maia status indicator */}
      {isHumanLike && (
        <div className="maia-status">
          {maiaReady ? (
            <>
              <span className="maia-badge" title="Neural network trained on millions of human games">
                🧠 Maia Active
              </span>
              <span className="maia-rating-badge" title={`Predicting moves a ${modelRating}-rated player would make`}>
                ~{modelRating} ELO
              </span>
              {maiaPredictions.length > 0 && (
                <span className="maia-predictions-badge">
                  {maiaPredictions.length} moves analyzed
                </span>
              )}
            </>
          ) : (
            <span className="maia-badge maia-loading-badge">
              🧠 Loading Maia...
          </span>
          )}
        </div>
      )}

      {/* Show error if Maia failed */}
      {maiaError && !maiaReady && (
        <div className="maia-error" style={{ 
          padding: '8px 12px', 
          background: 'rgba(239, 68, 68, 0.1)', 
          borderRadius: '8px',
          fontSize: '12px',
          color: '#ef4444',
          marginBottom: '12px'
        }}>
          ⚠️ Maia failed to load: {maiaError}. Check browser console for details.
        </div>
      )}

      {shouldShowLoading ? (
        <div className="maia-loading">
          <div className="loading-spinner"></div>
          <span>Analyzing human move patterns...</span>
        </div>
      ) : (
        <div className={`prediction-choices-wrapper ${isLockingIn ? 'locking-in' : ''}`}>
          <MoveChoices
            choices={predictionChoices}
            selectedChoice={selectedChoiceId}
            onSelectChoice={(choiceId) => {
              const choice = predictionChoices.find(c => c.id === choiceId);
              if (choice && !isLockingIn) {
                setSelectedMove(choice.moveUci);
                // Trigger hover on board
                if (onHoverMove) {
                  const from = choice.moveUci.slice(0, 2);
                  const to = choice.moveUci.slice(2, 4);
                  onHoverMove(from, to);
                }
                
                // Auto-submit after brief visual feedback (like quiz apps)
                setIsLockingIn(true);
                setTimeout(() => {
                  onPredictionSubmit(choice.moveUci);
                }, 600); // 600ms delay for visual feedback
              }
            }}
            onHoverChoice={(choice) => {
              if (choice && onHoverMove) {
                const from = choice.moveUci.slice(0, 2);
                const to = choice.moveUci.slice(2, 4);
                onHoverMove(from, to);
              } else if (!choice && onHoverMove) {
                onHoverMove(null, null);
              }
            }}
          />
        </div>
      )}

      <div className="predict-actions-v2">
        {isLockingIn ? (
          <div className="locking-in-message">
            <span className="lock-icon">🎯</span>
            <span>Locking in your prediction...</span>
          </div>
        ) : (
          <>
            <button 
              className="btn btn-ghost"
              onClick={handleSkip}
              disabled={isLockingIn}
            >
              Skip this round
            </button>
            <div className="selection-hint">
              {selectedMove ? (
                <span className="hint-selected">✓ Click to confirm or choose another</span>
              ) : (
                <span className="hint-choose">👆 Tap a move to lock it in</span>
              )}
            </div>
          </>
        )}
      </div>

      <div className="predict-reward">
        <span className="reward-icon">⭐</span>
        <span className="reward-text">+50 XP if correct</span>
      </div>
    </div>
  );
};

/**
 * Generate move explanation based on position context
 */
function getMovePurpose(move: MovePrediction, fen: string): string {
  try {
    const chess = new Chess(fen);
    const tempChess = new Chess(fen);
    const result = tempChess.move({ from: move.from, to: move.to, promotion: move.promotion as any });
    
    if (!result) return 'Improves position';

    // Check for special move types
    if (result.san === 'O-O') return 'Castle kingside for safety';
    if (result.san === 'O-O-O') return 'Castle queenside';
    
    if (result.captured) {
      const pieceNames: Record<string, string> = { 
        p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen' 
      };
      return `Capture the ${pieceNames[result.captured] || 'piece'}`;
    }
    
    if (result.san.includes('+')) return 'Give check';
    if (result.san.includes('#')) return 'Checkmate!';
    
    // Central control
    const centralSquares = ['d4', 'd5', 'e4', 'e5'];
    if (centralSquares.includes(move.to)) return 'Control the center';
    
    // Development
    const piece = chess.get(move.from as Square);
    if (piece && ['n', 'b'].includes(piece.type)) {
      const fromRank = parseInt(move.from[1]);
      const backRank = piece.color === 'w' ? 1 : 8;
      if (fromRank === backRank) return 'Develop a piece';
    }

    // Pawn moves
    if (piece && piece.type === 'p') {
      if (move.promotion) return `Promote to ${move.promotion === 'q' ? 'queen' : move.promotion}`;
      return 'Advance pawn';
    }

    return 'Improve position';
  } catch {
    return 'Strategic move';
  }
}

/**
 * Fallback to simple heuristic scoring if Maia not available
 */
function getFallbackMoves(fen: string): CandidateMove[] {
  try {
    const chess = new Chess(fen);
    const moves = chess.moves({ verbose: true });
    
    const scoredMoves = moves.map(m => {
      let score = 0;
      
      // Captures
      if (m.captured) {
        const pieceValues: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9 };
        score += (pieceValues[m.captured] || 0) * 10;
      }
      
      // Central squares
      const centralSquares = ['d4', 'd5', 'e4', 'e5'];
      if (centralSquares.includes(m.to)) score += 5;
      
      // Castling
      if (m.san === 'O-O' || m.san === 'O-O-O') score += 8;
      
      // Checks
      const tempChess = new Chess(fen);
      try {
        tempChess.move(m.san);
        if (tempChess.isCheck()) score += 6;
      } catch {}
      
      return {
        san: m.san,
        uci: `${m.from}${m.to}${m.promotion || ''}`,
        from: m.from,
        to: m.to,
        probability: score / 100, // Rough probability
        explanation: getFallbackPurpose(m),
      };
    });
    
    scoredMoves.sort((a, b) => b.probability - a.probability);
    
    // Normalize probabilities
    const total = scoredMoves.reduce((sum, m) => sum + m.probability, 0) || 1;
    scoredMoves.forEach(m => m.probability /= total);
    
    return scoredMoves.slice(0, 4);
  } catch {
    return [];
  }
}

function getFallbackPurpose(move: { san: string; captured?: string; from: string; to: string }): string {
  if (move.san === 'O-O') return 'Castle kingside for safety';
  if (move.san === 'O-O-O') return 'Castle queenside';
  if (move.captured) {
    const pieceNames: Record<string, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen' };
    return `Capture the ${pieceNames[move.captured] || 'piece'}`;
  }
  
  const centralSquares = ['d4', 'd5', 'e4', 'e5'];
  if (centralSquares.includes(move.to)) return 'Control the center';
  
  if (move.san.includes('+')) return 'Give check';
  
  return 'Improve position';
}
