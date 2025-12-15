/**
 * Overlay Renderer Component
 * Renders all active overlay frames as SVG layers
 */

import React, { useMemo } from 'react';
import type { OverlayFrame, OverlayArrow, SquareHighlight, SquareBadge, GhostPiece } from './types';
import { BOARD_SIZE, SQUARE_SIZE, squareToPosition } from './types';
import './OverlayRenderer.css';

interface OverlayRendererProps {
  frames: OverlayFrame[];
  boardSize?: number;
}

export const OverlayRenderer: React.FC<OverlayRendererProps> = ({
  frames,
  boardSize = BOARD_SIZE,
}) => {
  // Sort frames by priority (lower first, so higher priority renders on top)
  const sortedFrames = useMemo(() => 
    [...frames].sort((a, b) => a.priority - b.priority),
    [frames]
  );

  const scale = boardSize / BOARD_SIZE;

  return (
    <div className="overlay-renderer" style={{ width: boardSize, height: boardSize }}>
      <svg 
        className="overlay-svg" 
        viewBox={`0 0 ${BOARD_SIZE} ${BOARD_SIZE}`}
        style={{ width: boardSize, height: boardSize }}
      >
        <defs>
          {/* Arrow markers for different styles */}
          <marker
            id="arrow-solid"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill="currentColor" />
          </marker>
          <marker
            id="arrow-dashed"
            markerWidth="8"
            markerHeight="6"
            refX="7"
            refY="3"
            orient="auto"
          >
            <polygon points="0 0, 8 3, 0 6" fill="currentColor" opacity="0.8" />
          </marker>
          <marker
            id="arrow-ghost"
            markerWidth="8"
            markerHeight="6"
            refX="7"
            refY="3"
            orient="auto"
          >
            <polygon points="0 0, 8 3, 0 6" fill="currentColor" opacity="0.5" />
          </marker>
        </defs>

        {/* Render each frame's elements */}
        {sortedFrames.map((frame, frameIdx) => (
          <g key={`frame-${frame.id}-${frameIdx}`} className={`overlay-frame overlay-${frame.id}`}>
            {/* Highlights (squares) */}
            {frame.highlights.map((h, i) => (
              <HighlightRect key={`h-${i}`} highlight={h} />
            ))}

            {/* Arrows */}
            {frame.arrows.map((arrow, i) => (
              <ArrowLine key={`a-${i}`} arrow={arrow} index={i} frameId={frame.id} />
            ))}

            {/* Badges */}
            {frame.badges.map((badge, i) => (
              <BadgeElement key={`b-${i}`} badge={badge} />
            ))}

            {/* Ghost pieces */}
            {frame.ghostPieces.map((ghost, i) => (
              <GhostPieceElement key={`g-${i}`} ghost={ghost} />
            ))}
          </g>
        ))}
      </svg>
    </div>
  );
};

// Sub-components for each overlay element type

const HighlightRect: React.FC<{ highlight: SquareHighlight }> = ({ highlight }) => {
  const { x, y } = squareToPosition(highlight.square);
  const opacity = highlight.opacity ?? 0.5;

  return (
    <g className="highlight-group">
      <rect
        x={x - SQUARE_SIZE / 2}
        y={y - SQUARE_SIZE / 2}
        width={SQUARE_SIZE}
        height={SQUARE_SIZE}
        fill={highlight.color}
        opacity={opacity}
        className="highlight-rect"
      />
      {highlight.label && (
        <text
          x={x}
          y={y}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="white"
          fontSize="12"
          fontWeight="bold"
          className="highlight-label"
        >
          {highlight.label}
        </text>
      )}
    </g>
  );
};

const ArrowLine: React.FC<{ arrow: OverlayArrow; index: number; frameId: string }> = ({ 
  arrow, 
  index, 
  frameId 
}) => {
  const fromPos = squareToPosition(arrow.from);
  const toPos = squareToPosition(arrow.to);
  const opacity = arrow.opacity ?? 0.8;
  const style = arrow.style ?? 'solid';

  // Calculate arrow shortening to not overlap with pieces
  const dx = toPos.x - fromPos.x;
  const dy = toPos.y - fromPos.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  const shortenStart = 15;
  const shortenEnd = 20;

  const startX = fromPos.x + (dx / len) * shortenStart;
  const startY = fromPos.y + (dy / len) * shortenStart;
  const endX = toPos.x - (dx / len) * shortenEnd;
  const endY = toPos.y - (dy / len) * shortenEnd;

  // Midpoint for label
  const midX = (startX + endX) / 2;
  const midY = (startY + endY) / 2;

  const markerId = `arrow-${frameId}-${index}`;
  const strokeDasharray = style === 'dashed' ? '8,4' : style === 'ghost' ? '4,8' : undefined;

  return (
    <g className={`arrow-group arrow-${style}`}>
      <defs>
        <marker
          id={markerId}
          markerWidth="10"
          markerHeight="7"
          refX="9"
          refY="3.5"
          orient="auto"
        >
          <polygon points="0 0, 10 3.5, 0 7" fill={arrow.color} opacity={opacity} />
        </marker>
      </defs>
      <line
        x1={startX}
        y1={startY}
        x2={endX}
        y2={endY}
        stroke={arrow.color}
        strokeWidth={style === 'ghost' ? 3 : 4}
        strokeLinecap="round"
        strokeDasharray={strokeDasharray}
        opacity={opacity}
        markerEnd={`url(#${markerId})`}
        className="arrow-line"
      />
      {arrow.label && (
        <g className="arrow-label-group">
          <rect
            x={midX - 15}
            y={midY - 8}
            width="30"
            height="16"
            rx="4"
            fill="rgba(0,0,0,0.7)"
          />
          <text
            x={midX}
            y={midY}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="white"
            fontSize="10"
            fontWeight="bold"
          >
            {arrow.label}
          </text>
        </g>
      )}
    </g>
  );
};

const BadgeElement: React.FC<{ badge: SquareBadge }> = ({ badge }) => {
  const { x, y } = squareToPosition(badge.square);
  
  const bgColor = {
    info: 'rgba(59, 130, 246, 0.9)',
    warning: 'rgba(245, 158, 11, 0.9)',
    danger: 'rgba(239, 68, 68, 0.9)',
    success: 'rgba(34, 197, 94, 0.9)',
  }[badge.severity];

  return (
    <g className={`badge-group badge-${badge.severity}`}>
      <circle
        cx={x + SQUARE_SIZE / 3}
        cy={y - SQUARE_SIZE / 3}
        r="12"
        fill={bgColor}
        stroke="white"
        strokeWidth="1"
      />
      <text
        x={x + SQUARE_SIZE / 3}
        y={y - SQUARE_SIZE / 3}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize="14"
      >
        {badge.text}
      </text>
      {badge.tooltip && (
        <title>{badge.tooltip}</title>
      )}
    </g>
  );
};

const GhostPieceElement: React.FC<{ ghost: GhostPiece }> = ({ ghost }) => {
  const { x, y } = squareToPosition(ghost.square);
  
  // Map piece to Unicode chess symbol
  const pieceSymbols: Record<string, string> = {
    'K': '♔', 'Q': '♕', 'R': '♖', 'B': '♗', 'N': '♘', 'P': '♙',
    'k': '♚', 'q': '♛', 'r': '♜', 'b': '♝', 'n': '♞', 'p': '♟',
  };

  const symbol = pieceSymbols[ghost.piece] || ghost.piece;
  const isWhite = ghost.piece === ghost.piece.toUpperCase();

  return (
    <text
      x={x}
      y={y}
      textAnchor="middle"
      dominantBaseline="middle"
      fontSize="40"
      fill={isWhite ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)'}
      opacity={ghost.opacity}
      className="ghost-piece"
      style={{ 
        textShadow: isWhite 
          ? '0 0 3px rgba(0,0,0,0.5)' 
          : '0 0 3px rgba(255,255,255,0.5)'
      }}
    >
      {symbol}
    </text>
  );
};

export default OverlayRenderer;

