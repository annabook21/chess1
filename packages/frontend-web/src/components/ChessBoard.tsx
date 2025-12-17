/**
 * ChessBoard Component
 * Clean, modern chess board with modular overlay plugin system
 */

import { useMemo, useState, useEffect } from 'react';
import { Chessboard } from 'react-chessboard';
import type { Square } from 'react-chessboard/dist/chessboard/types';
import { MoveChoice } from '@master-academy/contracts';
import { OverlayRenderer, useOverlayManager } from '../overlays';
import type { OverlayContext } from '../overlays';
import { PixelIcon } from '../ui/castle';
import './ChessBoard.css';

// Hook to calculate responsive board size
function useBoardSize(): number {
  const [boardSize, setBoardSize] = useState(440);

  useEffect(() => {
    function calculateSize() {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      if (width <= 480) {
        // Mobile: use almost full width, leave padding
        return Math.min(width - 24, height * 0.5);
      } else if (width <= 768) {
        // Tablet: slightly smaller
        return Math.min(width - 48, 440);
      } else {
        // Desktop: fixed size
        return 440;
      }
    }

    function handleResize() {
      setBoardSize(calculateSize());
    }

    // Initial calculation
    handleResize();

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return boardSize;
}

interface ChessBoardProps {
  fen: string;
  onMove?: (from: string, to: string, promotion?: string) => boolean | Promise<boolean>;
  choices?: MoveChoice[];
  selectedChoice?: string | null;
  hoveredChoice?: MoveChoice | null;
  predictionHover?: { from: string | null; to: string | null };
  lastMove?: { from: string; to: string };
  /** Enable free play mode (drag pieces) */
  freePlayMode?: boolean;
  /** Board orientation - 'white' means white at bottom */
  orientation?: 'white' | 'black';
}

export const ChessBoard: React.FC<ChessBoardProps> = ({
  fen,
  onMove,
  choices,
  selectedChoice,
  hoveredChoice,
  predictionHover,
  lastMove,
  freePlayMode = false,
  orientation = 'white',
}) => {
  // Responsive board size
  const boardSize = useBoardSize();

  // Overlay manager for plugin-based visualization
  const overlayManager = useOverlayManager({
    defaultActiveProviders: ['selectedMove', 'hoverPreview'],
  });

  // Build overlay context from current state
  // Only show hover preview when hovering (not when selected) to avoid duplicate arrows
  // When selected, we only show square highlights, not preview arrows
  const overlayContext = useMemo<OverlayContext>(() => ({
    fen,
    sideToMove: fen.includes(' w ') ? 'w' : 'b',
    lastMove,
    // Only pass hoveredChoice if nothing is selected (to avoid showing preview arrows on selected moves)
    hoveredChoice: selectedChoice ? undefined : (hoveredChoice || undefined),
    userPreferences: {
      showAttacks: overlayManager.isProviderActive('attacks'),
      showThreats: overlayManager.isProviderActive('threats'),
      showKeySquares: overlayManager.isProviderActive('keySquares'),
    },
  }), [fen, lastMove, hoveredChoice, selectedChoice, overlayManager]);

  // Compute overlay frames
  const overlayFrames = useMemo(() => 
    overlayManager.computeFrames(overlayContext),
    [overlayManager, overlayContext]
  );
  
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
    
    // Highlight last move
    if (lastMove) {
      styles[lastMove.from] = {
        ...styles[lastMove.from],
        background: 'rgba(255, 255, 0, 0.3)',
      };
      styles[lastMove.to] = {
        ...styles[lastMove.to],
        background: 'rgba(255, 255, 0, 0.4)',
      };
    }
    
    return styles;
  }, [selectedChoice, choices, predictionHover, lastMove]);

  // Custom arrows for prediction hover
  const customArrows = useMemo(() => {
    if (predictionHover?.from && predictionHover?.to) {
      return [[predictionHover.from as Square, predictionHover.to as Square, 'rgba(139, 92, 246, 0.8)'] as [Square, Square, string]];
    }
    return [];
  }, [predictionHover]);

  const isWhiteToMove = fen.includes(' w ');

  return (
    <div className="chess-board-wrapper">
      {/* Visualization controls - Plugin toggles */}
      <div className="viz-controls">
        <button 
          className={`viz-btn ${overlayManager.isProviderActive('attacks') ? 'active' : ''}`}
          onClick={() => overlayManager.toggleProvider('attacks')}
          title="Show square control heatmap"
        >
          <PixelIcon name="target" size="small" /> Attacks
        </button>
        <button 
          className={`viz-btn ${overlayManager.isProviderActive('threats') ? 'active' : ''}`}
          onClick={() => overlayManager.toggleProvider('threats')}
          title="Show capture threats"
        >
          <PixelIcon name="sword" size="small" /> Threats
        </button>
        <button 
          className={`viz-btn ${overlayManager.isProviderActive('keySquares') ? 'active' : ''}`}
          onClick={() => overlayManager.toggleProvider('keySquares')}
          title="Show key central squares"
        >
          <PixelIcon name="castle" size="small" /> Key Squares
        </button>
      </div>

      <div className="chess-board-container">
        <Chessboard
          position={fen}
          boardWidth={boardSize}
          arePiecesDraggable={freePlayMode}
          onPieceDrop={(sourceSquare, targetSquare, piece) => {
            if (!freePlayMode || !onMove) return false;
            // Check if it's a promotion (pawn reaching last rank)
            const isPromotion = piece[1] === 'P' && 
              ((piece[0] === 'w' && targetSquare[1] === '8') ||
               (piece[0] === 'b' && targetSquare[1] === '1'));
            const promotion = isPromotion ? 'q' : undefined;
            // Call onMove - if it returns a promise, the move is processed async
            const result = onMove(sourceSquare, targetSquare, promotion);
            if (result instanceof Promise) {
              // For async, optimistically return true and let the callback handle errors
              result.catch(err => console.error('Move failed:', err));
              return true;
            }
            return result;
          }}
          boardOrientation={orientation}
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
        
        {/* Plugin-based overlay system */}
        <OverlayRenderer frames={overlayFrames} boardSize={boardSize} />
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
