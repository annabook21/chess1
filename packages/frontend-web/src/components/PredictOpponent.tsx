/**
 * Predict Opponent Component
 * 
 * A quiz-style prediction challenge using Maia neural network
 * for human-like move probability prediction.
 */

import { useState, useEffect, useMemo } from 'react';
import { Chess, Square } from 'chess.js';
import { useMaiaPredictions, MovePrediction } from '../maia';
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
}) => {
  const [selectedMove, setSelectedMove] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(timeLimit);
  const [hoveredMove, setHoveredMove] = useState<string | null>(null);

  // Use Maia for predictions
  const {
    predictions: maiaPredictions,
    isLoading: maiaLoading,
    isReady: maiaReady,
    inferenceTime,
    modelRating,
  } = useMaiaPredictions(fen);

  // Convert Maia predictions to candidate moves
  const candidateMoves = useMemo((): CandidateMove[] => {
    // If Maia predictions are available, use them
    if (maiaPredictions.length > 0) {
      return maiaPredictions.slice(0, 4).map(p => ({
        san: p.san,
        uci: p.uci,
        from: p.from,
        to: p.to,
        probability: p.probability,
        explanation: getMovePurpose(p, fen),
      }));
    }

    // Fallback to simple heuristic if Maia not ready
    return getFallbackMoves(fen);
  }, [maiaPredictions, fen]);

  // Countdown timer
  useEffect(() => {
    if (timeRemaining <= 0) {
      onSkip();
      return;
    }

    const timer = setInterval(() => {
      setTimeRemaining(t => t - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeRemaining, onSkip]);

  // Notify parent of hovered move for board visualization
  useEffect(() => {
    if (onHoverMove) {
      if (hoveredMove) {
        const move = candidateMoves.find(m => m.uci === hoveredMove);
        if (move) {
          onHoverMove(move.from, move.to);
        }
      } else if (selectedMove) {
        const move = candidateMoves.find(m => m.uci === selectedMove);
        if (move) {
          onHoverMove(move.from, move.to);
        }
      } else {
        onHoverMove(null, null);
      }
    }
  }, [hoveredMove, selectedMove, candidateMoves, onHoverMove]);

  // Reset selection when FEN changes
  useEffect(() => {
    setSelectedMove(null);
    setTimeRemaining(timeLimit);
  }, [fen, timeLimit]);

  const handleSubmit = () => {
    if (selectedMove) {
      onPredictionSubmit(selectedMove);
    }
  };

  const handleNotSure = () => {
    onSkip();
  };

  const getMasterEmoji = () => {
    switch (masterStyle) {
      case 'tal': return '⚔️';
      case 'fischer': return '🏆';
      case 'capablanca': return '👑';
      case 'karpov': return '🎯';
      default: return '♟️';
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

  const getMoveLabel = (index: number) => {
    return String.fromCharCode(65 + index); // A, B, C, D
  };

  const formatProbability = (prob: number) => {
    return `${(prob * 100).toFixed(0)}%`;
  };

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
        <div className={`predict-timer-v2 ${timeRemaining <= 5 ? 'urgent' : ''}`}>
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
            <span className="timer-value-v2">{timeRemaining}</span>
          </div>
        </div>
      </div>

      <div className="master-hint-v2">
        <span className="master-emoji-v2">{getMasterEmoji()}</span>
        <span className="hint-text">{getStyleHint()}</span>
      </div>

      {/* Maia status indicator */}
      {maiaReady && (
        <div className="maia-status">
          <span className="maia-badge">
            🤖 Maia-{modelRating}
          </span>
          {inferenceTime > 0 && (
            <span className="inference-time">{inferenceTime.toFixed(0)}ms</span>
          )}
        </div>
      )}

      {maiaLoading ? (
        <div className="maia-loading">
          <div className="loading-spinner"></div>
          <span>Loading human-like predictions...</span>
        </div>
      ) : (
        <div className="move-options-v2">
          {candidateMoves.map((move, index) => (
            <button
              key={move.uci}
              className={`move-option-v2 ${selectedMove === move.uci ? 'selected' : ''} ${hoveredMove === move.uci ? 'hovered' : ''}`}
              onClick={() => setSelectedMove(move.uci)}
              onMouseEnter={() => setHoveredMove(move.uci)}
              onMouseLeave={() => setHoveredMove(null)}
            >
              <div className="option-label">{getMoveLabel(index)}</div>
              <div className="option-content">
                <div className="move-notation">
                  <span className="move-san-v2">{move.san}</span>
                  <span className="move-arrow">
                    <span className="from-square">{move.from}</span>
                    <span className="arrow-icon">→</span>
                    <span className="to-square">{move.to}</span>
                  </span>
                </div>
                <div className="move-meta">
                  <span className="move-purpose">{move.explanation}</span>
                  {maiaReady && (
                    <span className="move-probability">
                      {formatProbability(move.probability)}
                    </span>
                  )}
                </div>
              </div>
              {selectedMove === move.uci && (
                <div className="selected-check">✓</div>
              )}
            </button>
          ))}
        </div>
      )}

      <div className="predict-actions-v2">
        <button 
          className="btn btn-ghost"
          onClick={handleNotSure}
        >
          I'm not sure
        </button>
        <button 
          className="btn btn-primary btn-large"
          onClick={handleSubmit}
          disabled={!selectedMove}
        >
          <span>🎯</span>
          Lock In Prediction
        </button>
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
