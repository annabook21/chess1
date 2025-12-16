/**
 * Attacks Overlay Provider
 * Shows square control heatmap (who controls each square)
 */

import { Chess, Square } from 'chess.js';
import type { OverlayProvider, OverlayFrame, OverlayContext, SquareHighlight } from '../types';

export const AttacksProvider: OverlayProvider = {
  id: 'attacks',
  name: 'Square Control',
  description: 'Shows which squares are controlled by each side',
  defaultEnabled: false,

  compute(context: OverlayContext): OverlayFrame {
    const highlights: SquareHighlight[] = [];
    
    try {
      const chess = new Chess(context.fen);
      const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
      const ranks = ['1', '2', '3', '4', '5', '6', '7', '8'];
      
      // Count attacks on each square
      const squareControl: Record<string, { white: number; black: number }> = {};
      
      for (const file of files) {
        for (const rank of ranks) {
          squareControl[`${file}${rank}`] = { white: 0, black: 0 };
        }
      }
      
      // Analyze all pieces' attacks
      const pieces = chess.board().flat().filter(Boolean);
      
      for (const piece of pieces) {
        if (!piece) continue;
        
        const moves = chess.moves({ square: piece.square as Square, verbose: true });
        for (const move of moves) {
          const target = move.to;
          if (piece.color === 'w') {
            squareControl[target].white++;
          } else {
            squareControl[target].black++;
          }
        }
      }
      
      // Generate highlights based on control
      for (const [square, control] of Object.entries(squareControl)) {
        const netControl = control.white - control.black;
        
        if (netControl === 0) continue;
        
        const intensity = Math.min(Math.abs(netControl) * 0.2, 0.6);
        const color = netControl > 0 
          ? `rgba(74, 158, 255, ${intensity})`   // Blue for white control
          : `rgba(209, 48, 32, ${intensity})`;    // Red for black control
        
        highlights.push({
          square,
          color,
          opacity: intensity,
          label: Math.abs(netControl) > 2 ? `${netControl > 0 ? '+' : ''}${netControl}` : undefined,
        });
      }
    } catch (e) {
      console.error('AttacksProvider error:', e);
    }
    
    return {
      id: 'attacks',
      priority: 10,
      highlights,
      arrows: [],
      badges: [],
      ghostPieces: [],
    };
  },
};




