/**
 * Selected Move Overlay Provider
 * Shows the currently selected move choice
 */

import type { OverlayProvider, OverlayFrame, OverlayContext, OverlayArrow, SquareHighlight } from '../types';

export const SelectedMoveProvider: OverlayProvider = {
  id: 'selectedMove',
  name: 'Selected Move',
  description: 'Highlights the currently selected move',
  defaultEnabled: true,

  compute(context: OverlayContext): OverlayFrame {
    const arrows: OverlayArrow[] = [];
    const highlights: SquareHighlight[] = [];
    
    // If a piece is selected, show legal moves
    if (context.selectedSquare && context.legalMoves) {
      // Highlight selected square
      highlights.push({
        square: context.selectedSquare,
        color: 'rgba(232, 185, 35, 0.6)',
        opacity: 0.6,
      });
      
      // Highlight legal move destinations
      for (const move of context.legalMoves) {
        const to = move.slice(2, 4); // UCI format: e2e4 -> e4
        highlights.push({
          square: to,
          color: 'rgba(34, 197, 94, 0.4)',
          opacity: 0.4,
        });
      }
    }
    
    // If a choice is being viewed (not hovered), show as arrow
    if (context.hoveredChoice) {
      const moveUci = context.hoveredChoice.moveUci;
      if (moveUci.length >= 4) {
        const from = moveUci.slice(0, 2);
        const to = moveUci.slice(2, 4);
        
        arrows.push({
          from,
          to,
          color: 'rgba(132, 204, 22, 0.9)', // Lime green
          opacity: 0.9,
          style: 'solid',
        });
      }
    }
    
    return {
      id: 'selectedMove',
      priority: 40,
      highlights,
      arrows,
      badges: [],
      ghostPieces: [],
    };
  },
};






