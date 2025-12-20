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
      // Snap to a 16px grid so pixel pieces scale cleanly (integer factor)
      const raw = calculateSize();
      const snapped = Math.max(256, Math.round(raw / 16) * 16);
      setBoardSize(snapped);
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
    // Build a full 64-square map to override the library inline styles
    const baseStyles: Record<string, React.CSSProperties> = {};
    const files = ['a','b','c','d','e','f','g','h'];
    const light = { backgroundColor: '#d6b48a', backgroundImage: 'none', boxShadow: 'inset 1px 1px 0 #f0d4aa, inset -1px -1px 0 #9c7752' };
    const dark  = { backgroundColor: '#6d5040', backgroundImage: 'none', boxShadow: 'inset 1px 1px 0 #8a6a55, inset -1px -1px 0 #3f2a20' };
    for (let r = 1; r <= 8; r++) {
      for (let f = 0; f < 8; f++) {
        const square = `${files[f]}${r}`;
        const isLight = (f + r) % 2 === 0;
        baseStyles[square] = {
          ...(isLight ? light : dark),
          imageRendering: 'pixelated',
        };
      }
    }

    const styles: Record<string, React.CSSProperties> = { ...baseStyles };

    // Pixel art style highlights - sharp borders instead of smooth shadows
    // Prediction hover takes precedence
    if (predictionHover?.from && predictionHover?.to) {
      styles[predictionHover.from] = {
        ...styles[predictionHover.from],
        background: '#8b5cf6', // Solid purple - pixel art style
        boxShadow: 'inset 3px 3px 0 #a78bfa, inset -3px -3px 0 #6b4acd',
      };
      
      styles[predictionHover.to] = {
        ...styles[predictionHover.to],
        background: '#7c4fe6',
        boxShadow: 'inset 3px 3px 0 #9b7bea, inset -3px -3px 0 #5b3abd',
      };
    } else if (selectedChoice && choices) {
      const choice = choices.find(c => c.id === selectedChoice);
      if (choice && choice.moveUci.length >= 4) {
        const from = choice.moveUci.slice(0, 2);
        const to = choice.moveUci.slice(2, 4);
        
        styles[from] = {
          ...styles[from],
          background: '#c9a227', // Gold - pixel art style
          boxShadow: 'inset 3px 3px 0 #e8c847, inset -3px -3px 0 #a88207',
        };
        
        styles[to] = {
          ...styles[to],
          background: '#4a9c6d', // Green - pixel art style
          boxShadow: 'inset 3px 3px 0 #6abc8d, inset -3px -3px 0 #2a7c4d',
        };
      }
    }
    
    // Highlight last move - pixel art style
    if (lastMove) {
      styles[lastMove.from] = {
        ...styles[lastMove.from],
        background: '#d4b060', // Muted gold
        boxShadow: 'inset 2px 2px 0 #e4c070, inset -2px -2px 0 #b49040',
      };
      styles[lastMove.to] = {
        ...styles[lastMove.to],
        background: '#e4c070', // Brighter gold
        boxShadow: 'inset 2px 2px 0 #f4d080, inset -2px -2px 0 #c4a050',
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

  // Pixel piece components (override default SVG pieces) using 16x16 wood sprites
  const customPieces = useMemo(() => {
    const names = ['P', 'N', 'B', 'R', 'Q', 'K'] as const;
    const components: Record<string, React.FC> = {};
    names.forEach(letter => {
      components[`w${letter}`] = () => (
        <img
          src={`/pixel-pieces-wood/w${letter}.png`}
          alt={`White ${letter}`}
          style={{ width: '100%', height: '100%', imageRendering: 'pixelated' }}
        />
      );
      components[`b${letter}`] = () => (
        <img
          src={`/pixel-pieces-wood/b${letter}.png`}
          alt={`Black ${letter}`}
          style={{ width: '100%', height: '100%', imageRendering: 'pixelated' }}
        />
      );
    });
    return components;
  }, []);

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
          customPieces={customPieces}
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
            backgroundColor: '#c9a080', // Warm tan - pixel art style
          }}
          customDarkSquareStyle={{
          backgroundColor: '#6b4a3a', // Chocolate brown - pixel art style
          backgroundImage: 'none',
          }}
          customBoardStyle={{
            borderRadius: '0', // Sharp corners for pixel art
            boxShadow: 'none', // Shadow handled by container
          imageRendering: 'pixelated',
          backgroundImage: 'none',
          backgroundColor: '#5a4a3a',
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
