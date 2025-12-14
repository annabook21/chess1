/**
 * Predict Opponent Component - Redesigned
 * A focused, quiz-style prediction challenge with visual board feedback
 */

import { useState, useEffect, useMemo } from 'react';
import { Chess, Square } from 'chess.js';
import './PredictOpponent.css';

interface PredictOpponentProps {
  fen: string;
  onPredictionSubmit: (prediction: string) => void;
  onSkip: () => void;
  timeLimit?: number;
  masterStyle: string;
  masterName: string;
  onHoverMove?: (from: string | null, to: string | null) => void;
}

interface CandidateMove {
  san: string;
  uci: string;
  from: string;
  to: string;
  score: number; // Higher = more likely
  explanation: string;
}

// Simple positional scoring for move ranking
function scoreMoveSimple(chess: Chess, move: { from: string; to: string; san: string; captured?: string; promotion?: string }): number {
  let score = 0;
  
  // Captures are likely
  if (move.captured) {
    const pieceValues: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9 };
    score += (pieceValues[move.captured] || 0) * 10;
  }
  
  // Central squares
  const centralSquares = ['d4', 'd5', 'e4', 'e5'];
  const semiCentralSquares = ['c3', 'c4', 'c5', 'c6', 'd3', 'd6', 'e3', 'e6', 'f3', 'f4', 'f5', 'f6'];
  
  if (centralSquares.includes(move.to)) score += 5;
  if (semiCentralSquares.includes(move.to)) score += 2;
  
  // Development moves (knights and bishops moving off back rank)
  const piece = chess.get(move.from as Square);
  if (piece && ['n', 'b'].includes(piece.type)) {
    const fromRank = parseInt(move.from[1]);
    const toRank = parseInt(move.to[1]);
    const isWhite = piece.color === 'w';
    
    // Moving from back rank is good
    if ((isWhite && fromRank === 1) || (!isWhite && fromRank === 8)) {
      score += 4;
    }
    // Moving toward center is good
    if ((isWhite && toRank > fromRank) || (!isWhite && toRank < fromRank)) {
      score += 2;
    }
  }
  
  // Castling is usually good
  if (move.san === 'O-O' || move.san === 'O-O-O') {
    score += 8;
  }
  
  // Checks are interesting
  const tempChess = new Chess(chess.fen());
  try {
    tempChess.move(move.san);
    if (tempChess.isCheck()) score += 6;
  } catch (e) {
    // Ignore
  }
  
  return score;
}

export const PredictOpponent: React.FC<PredictOpponentProps> = ({
  fen,
  onPredictionSubmit,
  onSkip,
  timeLimit = 15,
  masterStyle,
  masterName,
  onHoverMove,
}) => {
  const [selectedMove, setSelectedMove] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(timeLimit);
  const [hoveredMove, setHoveredMove] = useState<string | null>(null);

  // Get top 4 candidate moves
  const candidateMoves = useMemo(() => {
    try {
      const chess = new Chess(fen);
      const moves = chess.moves({ verbose: true });
      
      // Score and sort moves
      const scoredMoves = moves.map(m => ({
        san: m.san,
        uci: `${m.from}${m.to}${m.promotion || ''}`,
        from: m.from,
        to: m.to,
        score: scoreMoveSimple(chess, m),
        explanation: getMovePurpose(m),
      }));
      
      // Sort by score descending
      scoredMoves.sort((a, b) => b.score - a.score);
      
      // Take top 4 most likely moves
      return scoredMoves.slice(0, 4);
    } catch (e) {
      console.error('Error getting candidate moves:', e);
      return [];
    }
  }, [fen]);

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

  const handleSubmit = () => {
    if (selectedMove) {
      onPredictionSubmit(selectedMove);
    }
  };

  const handleNotSure = () => {
    // Submit empty prediction (counts as wrong but no penalty)
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
              <div className="move-purpose">{move.explanation}</div>
            </div>
            {selectedMove === move.uci && (
              <div className="selected-check">✓</div>
            )}
          </button>
        ))}
      </div>

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

// Helper to explain what a move does
function getMovePurpose(move: { san: string; captured?: string; from: string; to: string }): string {
  if (move.san === 'O-O') return 'Castle kingside for safety';
  if (move.san === 'O-O-O') return 'Castle queenside';
  if (move.captured) {
    const pieceNames: Record<string, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen' };
    return `Capture the ${pieceNames[move.captured] || 'piece'}`;
  }
  
  // Central moves
  const centralSquares = ['d4', 'd5', 'e4', 'e5'];
  if (centralSquares.includes(move.to)) return 'Control the center';
  
  // Development
  const backRanks = ['1', '8'];
  if (backRanks.includes(move.from[1]) && !backRanks.includes(move.to[1])) {
    return 'Develop a piece';
  }
  
  // Check
  if (move.san.includes('+')) return 'Give check';
  
  return 'Improve position';
}
