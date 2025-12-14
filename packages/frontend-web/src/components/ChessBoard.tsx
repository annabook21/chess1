/**
 * ChessBoard Component
 * Clean, modern chess board with visualization features
 * Using react-chessboard v4.x
 */

import { useState, useMemo } from 'react';
import { Chessboard } from 'react-chessboard';
import type { Square } from 'react-chessboard/dist/chessboard/types';
import { MoveChoice } from '@master-academy/contracts';
import { BoardVisualization } from './BoardVisualization';
import './ChessBoard.css';

interface ChessBoardProps {
  fen: string;
  onMove?: (move: string) => void;
  choices?: MoveChoice[];
  selectedChoice?: string | null;
  predictionHover?: { from: string | null; to: string | null };
}

export const ChessBoard: React.FC<ChessBoardProps> = ({
  fen,
  choices,
  selectedChoice,
  predictionHover,
}) => {
  // Visualization toggles
  const [showAttacks, setShowAttacks] = useState(false);
  const [showThreats, setShowThreats] = useState(false);
  const [showKeySquares, setShowKeySquares] = useState(false);
  
  const customSquareStyles = useMemo(() => {
    const styles: Record<string, React.CSSProperties> = {};
    
    // Prediction hover takes precedence
    if (predictionHover?.from && predictionHover?.to) {
      styles[predictionHover.from] = {
        background: 'rgba(139, 92, 246, 0.6)',
        boxShadow: 'inset 0 0 0 4px rgba(139, 92, 246, 0.9)',
      };
      
      styles[predictionHover.to] = {
        background: 'rgba(139, 92, 246, 0.4)',
        boxShadow: 'inset 0 0 0 4px rgba(139, 92, 246, 0.7)',
      };
    } else if (selectedChoice && choices) {
      const choice = choices.find(c => c.id === selectedChoice);
      if (choice && choice.moveUci.length >= 4) {
        const from = choice.moveUci.slice(0, 2);
        const to = choice.moveUci.slice(2, 4);
        
        styles[from] = {
          background: 'rgba(232, 185, 35, 0.6)',
          boxShadow: 'inset 0 0 0 3px rgba(232, 185, 35, 0.8)',
        };
        
        styles[to] = {
          background: 'rgba(34, 197, 94, 0.6)',
          boxShadow: 'inset 0 0 0 3px rgba(34, 197, 94, 0.8)',
        };
      }
    }
    
    return styles;
  }, [selectedChoice, choices, predictionHover]);

  // Custom arrows for prediction hover
  const customArrows = useMemo(() => {
    if (predictionHover?.from && predictionHover?.to) {
      return [[predictionHover.from as Square, predictionHover.to as Square, 'rgba(139, 92, 246, 0.8)'] as [Square, Square, string]];
    }
    return [];
  }, [predictionHover]);

  const isWhiteToMove = fen.includes(' w ');
  const selectedMoveUci = selectedChoice && choices 
    ? choices.find(c => c.id === selectedChoice)?.moveUci 
    : undefined;

  const anyVisualizationActive = showAttacks || showThreats || showKeySquares;

  return (
    <div className="chess-board-wrapper">
      {/* Visualization controls */}
      <div className="viz-controls">
        <button 
          className={`viz-btn ${showAttacks ? 'active' : ''}`}
          onClick={() => setShowAttacks(!showAttacks)}
          title="Show square control heatmap"
        >
          🎯 Attacks
        </button>
        <button 
          className={`viz-btn ${showThreats ? 'active' : ''}`}
          onClick={() => setShowThreats(!showThreats)}
          title="Show capture threats"
        >
          ⚔️ Threats
        </button>
        <button 
          className={`viz-btn ${showKeySquares ? 'active' : ''}`}
          onClick={() => setShowKeySquares(!showKeySquares)}
          title="Show key central squares"
        >
          📍 Key Squares
        </button>
      </div>

      <div className="chess-board-container">
        <Chessboard
          position={fen}
          boardWidth={440}
          arePiecesDraggable={false}
          customSquareStyles={customSquareStyles}
          customArrows={customArrows}
          customLightSquareStyle={{
            backgroundColor: '#eeeed2',
          }}
          customDarkSquareStyle={{
            backgroundColor: '#769656',
          }}
          customBoardStyle={{
            borderRadius: '4px',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
          }}
          animationDuration={180}
        />
        
        {/* Visualization overlay */}
        {anyVisualizationActive && (
          <BoardVisualization
            fen={fen}
            showAttacks={showAttacks}
            showThreats={showThreats}
            showKeySquares={showKeySquares}
            selectedMove={selectedMoveUci}
          />
        )}
      </div>
      
      <div className={`turn-indicator ${isWhiteToMove ? 'white-turn' : 'black-turn'}`}>
        <span className="turn-piece">{isWhiteToMove ? '♔' : '♚'}</span>
        <span className="turn-text">
          {isWhiteToMove ? 'White to move' : 'Black to move'}
        </span>
        <div className="turn-pulse" />
      </div>
    </div>
  );
};
