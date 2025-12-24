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
  boardSize?: number; // Dynamic board size (defaults to 440)
  orientation?: 'white' | 'black'; // Board orientation
}

interface SquareInfo {
  whiteAttacks: number;
  blackAttacks: number;
  isKeySquare: boolean;
  isWeakSquare: boolean;
}

interface Threat {
  from: string;
  to: string;
  type: 'attack' | 'defend' | 'pin';
  severity?: 'critical' | 'major' | 'minor';
}

/**
 * Convert square to pixel position with dynamic board size and orientation
 */
function squareToPosition(
  square: string,
  boardSize: number,
  orientation: 'white' | 'black'
): { x: number; y: number } {
  const file = square.charCodeAt(0) - 'a'.charCodeAt(0);
  const rank = parseInt(square[1]) - 1;
  const squareSize = boardSize / 8;

  // Flip coordinates if playing as black
  const displayFile = orientation === 'black' ? 7 - file : file;
  const displayRank = orientation === 'black' ? rank : 7 - rank;

  return {
    x: displayFile * squareSize + squareSize / 2,
    y: displayRank * squareSize + squareSize / 2,
  };
}

/**
 * Get all squares attacked/controlled by a piece (independent of legality)
 */
function getAttackedSquares(chess: Chess, square: Square, piece: { type: string; color: string }): Square[] {
  const attacked: Square[] = [];
  const file = square.charCodeAt(0) - 97;
  const rank = parseInt(square[1]) - 1;

  switch (piece.type) {
    case 'p': { // Pawn
      const direction = piece.color === 'w' ? 1 : -1;
      const attackFiles = [file - 1, file + 1];
      for (const f of attackFiles) {
        if (f >= 0 && f <= 7) {
          const r = rank + direction;
          if (r >= 0 && r <= 7) {
            attacked.push(`${String.fromCharCode(97 + f)}${r + 1}` as Square);
          }
        }
      }
      break;
    }

    case 'n': { // Knight
      const knightMoves = [
        [2, 1], [2, -1], [-2, 1], [-2, -1],
        [1, 2], [1, -2], [-1, 2], [-1, -2]
      ];
      for (const [df, dr] of knightMoves) {
        const f = file + df;
        const r = rank + dr;
        if (f >= 0 && f <= 7 && r >= 0 && r <= 7) {
          attacked.push(`${String.fromCharCode(97 + f)}${r + 1}` as Square);
        }
      }
      break;
    }

    case 'b': // Bishop
    case 'r': // Rook
    case 'q': { // Queen
      const directions = piece.type === 'r'
        ? [[0, 1], [0, -1], [1, 0], [-1, 0]] // Rook: orthogonal
        : piece.type === 'b'
        ? [[1, 1], [1, -1], [-1, 1], [-1, -1]] // Bishop: diagonal
        : [[0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [1, -1], [-1, 1], [-1, -1]]; // Queen: both

      for (const [df, dr] of directions) {
        let f = file + df;
        let r = rank + dr;
        while (f >= 0 && f <= 7 && r >= 0 && r <= 7) {
          const sq = `${String.fromCharCode(97 + f)}${r + 1}` as Square;
          attacked.push(sq);
          // Stop at first piece (but still control that square)
          if (chess.get(sq)) break;
          f += df;
          r += dr;
        }
      }
      break;
    }

    case 'k': { // King
      const kingMoves = [
        [0, 1], [0, -1], [1, 0], [-1, 0],
        [1, 1], [1, -1], [-1, 1], [-1, -1]
      ];
      for (const [df, dr] of kingMoves) {
        const f = file + df;
        const r = rank + dr;
        if (f >= 0 && f <= 7 && r >= 0 && r <= 7) {
          attacked.push(`${String.fromCharCode(97 + f)}${r + 1}` as Square);
        }
      }
      break;
    }
  }

  return attacked;
}

/**
 * Calculate curved path for arrows to avoid overlap
 */
function calculateCurvedPath(
  from: { x: number; y: number },
  to: { x: number; y: number },
  curveOffset: number
): string {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  if (distance === 0) return `M ${from.x} ${from.y}`;

  // Calculate perpendicular offset for curve
  const midX = (from.x + to.x) / 2 + curveOffset * -dy / distance * 20;
  const midY = (from.y + to.y) / 2 + curveOffset * dx / distance * 20;

  return `M ${from.x} ${from.y} Q ${midX} ${midY} ${to.x} ${to.y}`;
}

/**
 * Get threat styling based on severity
 */
function getThreatStyle(threat: Threat): { color: string; width: number } {
  switch (threat.severity) {
    case 'critical': return { color: 'rgba(239, 68, 68, 0.9)', width: 5 }; // Queen/Rook
    case 'major': return { color: 'rgba(249, 115, 22, 0.8)', width: 4 }; // Minor piece
    case 'minor': return { color: 'rgba(234, 179, 8, 0.7)', width: 3 }; // Pawn
    default: return { color: 'rgba(209, 48, 32, 0.8)', width: 3 };
  }
}

export const BoardVisualization: React.FC<BoardVisualizationProps> = ({
  fen,
  showAttacks,
  showThreats,
  showKeySquares,
  selectedMove,
  boardSize = 440,
  orientation = 'white',
}) => {
  // Analyze the position for visualization data
  const visualizationData = useMemo(() => {
    const chess = new Chess(fen);
    const squares: Record<string, SquareInfo> = {};
    const threats: Threat[] = [];

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

    // Count attacks on each square using proper attack calculation
    const pieces = chess.board().flat().filter(Boolean);

    for (const piece of pieces) {
      if (!piece) continue;

      // Get all squares this piece attacks/controls (independent of legality)
      const attackedSquares = getAttackedSquares(chess, piece.square as Square, piece);
      for (const targetSq of attackedSquares) {
        if (piece.color === 'w') {
          squares[targetSq].whiteAttacks++;
        } else {
          squares[targetSq].blackAttacks++;
        }
      }

      // Track capture threats with severity
      const moves = chess.moves({ square: piece.square as Square, verbose: true });
      for (const move of moves) {
        if (move.captured) {
          const severity = move.captured === 'q' ? 'critical'
            : ['r', 'b', 'n'].includes(move.captured) ? 'major'
            : 'minor';

          threats.push({
            from: piece.square,
            to: move.to,
            type: 'attack',
            severity,
          });
        }
      }
    }

    // Identify key squares (center control in opening/middlegame)
    const centerSquares = ['d4', 'd5', 'e4', 'e5'];
    for (const sq of centerSquares) {
      squares[sq].isKeySquare = true;
    }

    // Find weak squares (cannot be defended by pawns, in opponent territory)
    for (const sq of Object.keys(squares)) {
      const file = sq.charCodeAt(0) - 97;
      const rank = parseInt(sq[1]) - 1;

      // Check for white: must be in black's territory (ranks 5-7)
      if (rank >= 4 && rank <= 6) {
        let canBeDefendedByBlackPawn = false;
        const pawnDirection = -1; // Black pawns move down

        for (const f of [file - 1, file + 1]) {
          if (f >= 0 && f <= 7) {
            const pawnRank = rank - pawnDirection;
            if (pawnRank >= 0 && pawnRank <= 7) {
              const pawnSq = `${String.fromCharCode(97 + f)}${pawnRank + 1}` as Square;
              const piece = chess.get(pawnSq);
              if (piece && piece.type === 'p' && piece.color === 'b') {
                canBeDefendedByBlackPawn = true;
                break;
              }
            }
          }
        }

        if (!canBeDefendedByBlackPawn && squares[sq].whiteAttacks > 0) {
          squares[sq].isWeakSquare = true;
        }
      }

      // Check for black: must be in white's territory (ranks 2-4)
      if (rank >= 1 && rank <= 3) {
        let canBeDefendedByWhitePawn = false;
        const pawnDirection = 1; // White pawns move up

        for (const f of [file - 1, file + 1]) {
          if (f >= 0 && f <= 7) {
            const pawnRank = rank - pawnDirection;
            if (pawnRank >= 0 && pawnRank <= 7) {
              const pawnSq = `${String.fromCharCode(97 + f)}${pawnRank + 1}` as Square;
              const piece = chess.get(pawnSq);
              if (piece && piece.type === 'p' && piece.color === 'w') {
                canBeDefendedByWhitePawn = true;
                break;
              }
            }
          }
        }

        if (!canBeDefendedByWhitePawn && squares[sq].blackAttacks > 0) {
          squares[sq].isWeakSquare = true;
        }
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

  const squareSize = boardSize / 8;

  return (
    <div className="board-visualization">
      <svg
        className="visualization-layer"
        viewBox={`0 0 ${boardSize} ${boardSize}`}
        style={{ width: boardSize, height: boardSize }}
      >
        {/* Attack heatmap overlay */}
        {showAttacks && Object.entries(visualizationData.squares).map(([sq, info]) => {
          const { x, y } = squareToPosition(sq, boardSize, orientation);
          const netControl = info.whiteAttacks - info.blackAttacks;

          if (netControl === 0) return null;

          const color = netControl > 0
            ? `rgba(74, 158, 255, ${Math.min(Math.abs(netControl) * 0.2, 0.6)})` // Blue for white
            : `rgba(209, 48, 32, ${Math.min(Math.abs(netControl) * 0.2, 0.6)})`; // Red for black

          return (
            <rect
              key={`attack-${sq}`}
              x={x - squareSize / 2}
              y={y - squareSize / 2}
              width={squareSize}
              height={squareSize}
              fill={color}
              className="attack-overlay"
            />
          );
        })}

        {/* Key squares */}
        {showKeySquares && Object.entries(visualizationData.squares)
          .filter(([_, info]) => info.isKeySquare)
          .map(([sq]) => {
            const { x, y } = squareToPosition(sq, boardSize, orientation);
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

        {/* Threat arrows with curved paths and severity-based styling */}
        {showThreats && visualizationData.threats.slice(0, 6).map((threat, i) => {
          const fromPos = squareToPosition(threat.from, boardSize, orientation);
          const toPos = squareToPosition(threat.to, boardSize, orientation);
          const style = getThreatStyle(threat);
          const curveOffset = (i % 3) - 1; // Alternate: -1, 0, 1 for left/straight/right curves

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
                    fill={style.color}
                  />
                </marker>
              </defs>
              <path
                d={calculateCurvedPath(fromPos, toPos, curveOffset)}
                stroke={style.color}
                strokeWidth={style.width}
                fill="none"
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
            <path
              d={calculateCurvedPath(
                squareToPosition(selectedMoveArrow.from, boardSize, orientation),
                squareToPosition(selectedMoveArrow.to, boardSize, orientation),
                0
              )}
              stroke="rgba(134, 184, 27, 0.9)"
              strokeWidth="5"
              fill="none"
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














