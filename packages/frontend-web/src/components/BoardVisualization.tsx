/**
 * Board Visualization Component
 * Shows threat arrows, attack highlights, and key squares
 */

import { useMemo } from 'react';
import { Chess, Square } from 'chess.js';
import './BoardVisualization.css';

interface BoardVisualizationProps {
  fen: string;
  showAttacks: boolean;
  showThreats: boolean;
  showKeySquares: boolean;
  selectedMove?: string; // UCI move to highlight
}

interface SquareInfo {
  whiteAttacks: number;
  blackAttacks: number;
  isKeySquare: boolean;
  isWeakSquare: boolean;
}

// Square to pixel position mapping (for 440px board)
const BOARD_SIZE = 440;
const SQUARE_SIZE = BOARD_SIZE / 8;

function squareToPosition(square: string): { x: number; y: number } {
  const file = square.charCodeAt(0) - 'a'.charCodeAt(0);
  const rank = parseInt(square[1]) - 1;
  return {
    x: file * SQUARE_SIZE + SQUARE_SIZE / 2,
    y: (7 - rank) * SQUARE_SIZE + SQUARE_SIZE / 2,
  };
}

export const BoardVisualization: React.FC<BoardVisualizationProps> = ({
  fen,
  showAttacks,
  showThreats,
  showKeySquares,
  selectedMove,
}) => {
  // Analyze the position for visualization data
  const visualizationData = useMemo(() => {
    const chess = new Chess(fen);
    const squares: Record<string, SquareInfo> = {};
    const threats: Array<{ from: string; to: string; type: 'attack' | 'defend' | 'pin' }> = [];
    
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const ranks = ['1', '2', '3', '4', '5', '6', '7', '8'];
    
    // Initialize squares
    for (const file of files) {
      for (const rank of ranks) {
        const sq = `${file}${rank}` as Square;
        squares[sq] = {
          whiteAttacks: 0,
          blackAttacks: 0,
          isKeySquare: false,
          isWeakSquare: false,
        };
      }
    }
    
    // Count attacks on each square
    const pieces = chess.board().flat().filter(Boolean);
    
    for (const piece of pieces) {
      if (!piece) continue;
      
      // Get all squares this piece attacks
      const moves = chess.moves({ square: piece.square as Square, verbose: true });
      for (const move of moves) {
        const targetSq = move.to;
        if (piece.color === 'w') {
          squares[targetSq].whiteAttacks++;
        } else {
          squares[targetSq].blackAttacks++;
        }
        
        // Track capture threats
        if (move.captured) {
          threats.push({
            from: piece.square,
            to: targetSq,
            type: 'attack',
          });
        }
      }
    }
    
    // Identify key squares (center, outposts, weak squares)
    const centerSquares = ['d4', 'd5', 'e4', 'e5'];
    const extendedCenter = ['c3', 'c4', 'c5', 'c6', 'd3', 'd6', 'e3', 'e6', 'f3', 'f4', 'f5', 'f6'];
    
    for (const sq of centerSquares) {
      squares[sq].isKeySquare = true;
    }
    
    // Find weak squares (attacked by one side only)
    for (const sq of Object.keys(squares)) {
      const info = squares[sq];
      if (info.whiteAttacks > 0 && info.blackAttacks === 0) {
        info.isWeakSquare = true;
      } else if (info.blackAttacks > 0 && info.whiteAttacks === 0) {
        info.isWeakSquare = true;
      }
    }
    
    return { squares, threats };
  }, [fen]);

  // Generate arrow for selected move
  const selectedMoveArrow = useMemo(() => {
    if (!selectedMove || selectedMove.length < 4) return null;
    const from = selectedMove.slice(0, 2);
    const to = selectedMove.slice(2, 4);
    return { from, to };
  }, [selectedMove]);

  return (
    <div className="board-visualization">
      <svg 
        className="visualization-layer" 
        viewBox={`0 0 ${BOARD_SIZE} ${BOARD_SIZE}`}
        style={{ width: BOARD_SIZE, height: BOARD_SIZE }}
      >
        {/* Attack heatmap overlay */}
        {showAttacks && Object.entries(visualizationData.squares).map(([sq, info]) => {
          const { x, y } = squareToPosition(sq);
          const netControl = info.whiteAttacks - info.blackAttacks;
          
          if (netControl === 0) return null;
          
          const color = netControl > 0 
            ? `rgba(74, 158, 255, ${Math.min(Math.abs(netControl) * 0.2, 0.6)})` // Blue for white
            : `rgba(209, 48, 32, ${Math.min(Math.abs(netControl) * 0.2, 0.6)})`; // Red for black
          
          return (
            <rect
              key={`attack-${sq}`}
              x={x - SQUARE_SIZE / 2}
              y={y - SQUARE_SIZE / 2}
              width={SQUARE_SIZE}
              height={SQUARE_SIZE}
              fill={color}
              className="attack-overlay"
            />
          );
        })}

        {/* Key squares */}
        {showKeySquares && Object.entries(visualizationData.squares)
          .filter(([_, info]) => info.isKeySquare)
          .map(([sq]) => {
            const { x, y } = squareToPosition(sq);
            return (
              <circle
                key={`key-${sq}`}
                cx={x}
                cy={y}
                r={8}
                fill="rgba(230, 177, 0, 0.6)"
                className="key-square-dot"
              />
            );
          })}

        {/* Threat arrows */}
        {showThreats && visualizationData.threats.slice(0, 6).map((threat, i) => {
          const fromPos = squareToPosition(threat.from);
          const toPos = squareToPosition(threat.to);
          
          return (
            <g key={`threat-${i}`} className="threat-arrow">
              <defs>
                <marker
                  id={`arrowhead-threat-${i}`}
                  markerWidth="10"
                  markerHeight="7"
                  refX="9"
                  refY="3.5"
                  orient="auto"
                >
                  <polygon
                    points="0 0, 10 3.5, 0 7"
                    fill="rgba(209, 48, 32, 0.8)"
                  />
                </marker>
              </defs>
              <line
                x1={fromPos.x}
                y1={fromPos.y}
                x2={toPos.x}
                y2={toPos.y}
                stroke="rgba(209, 48, 32, 0.8)"
                strokeWidth="3"
                markerEnd={`url(#arrowhead-threat-${i})`}
              />
            </g>
          );
        })}

        {/* Selected move arrow */}
        {selectedMoveArrow && (
          <g className="selected-move-arrow">
            <defs>
              <marker
                id="arrowhead-selected"
                markerWidth="10"
                markerHeight="7"
                refX="9"
                refY="3.5"
                orient="auto"
              >
                <polygon
                  points="0 0, 10 3.5, 0 7"
                  fill="rgba(134, 184, 27, 0.9)"
                />
              </marker>
            </defs>
            <line
              x1={squareToPosition(selectedMoveArrow.from).x}
              y1={squareToPosition(selectedMoveArrow.from).y}
              x2={squareToPosition(selectedMoveArrow.to).x}
              y2={squareToPosition(selectedMoveArrow.to).y}
              stroke="rgba(134, 184, 27, 0.9)"
              strokeWidth="5"
              strokeLinecap="round"
              markerEnd="url(#arrowhead-selected)"
              className="move-arrow-line"
            />
          </g>
        )}
      </svg>
    </div>
  );
};





