/**
 * Overlay System Types
 * Re-exports from contracts + frontend-specific additions
 */

export type {
  SquareHighlight,
  OverlayArrow,
  SquareBadge,
  GhostPiece,
  OverlayFrame,
  OverlayContext,
  OverlayProvider,
  OverlayState,
} from '@master-academy/contracts';

/** Board dimensions for coordinate calculations */
export const BOARD_SIZE = 440;
export const SQUARE_SIZE = BOARD_SIZE / 8;

/** Convert chess square to SVG coordinates */
export function squareToPosition(square: string): { x: number; y: number } {
  const file = square.charCodeAt(0) - 'a'.charCodeAt(0);
  const rank = parseInt(square[1]) - 1;
  return {
    x: file * SQUARE_SIZE + SQUARE_SIZE / 2,
    y: (7 - rank) * SQUARE_SIZE + SQUARE_SIZE / 2,
  };
}

/** Convert SVG coordinates to chess square */
export function positionToSquare(x: number, y: number): string {
  const file = Math.floor(x / SQUARE_SIZE);
  const rank = 7 - Math.floor(y / SQUARE_SIZE);
  return String.fromCharCode('a'.charCodeAt(0) + file) + (rank + 1);
}











