/**
 * Threats Overlay Provider
 * Shows capture threats and hanging pieces
 */

import { Chess, Square } from 'chess.js';
import type { OverlayProvider, OverlayFrame, OverlayContext, OverlayArrow, SquareBadge } from '../types';

// Piece values for evaluating threats
const PIECE_VALUES: Record<string, number> = {
  p: 1, n: 3, b: 3, r: 5, q: 9, k: 0,
};

export const ThreatsProvider: OverlayProvider = {
  id: 'threats',
  name: 'Capture Threats',
  description: 'Shows pieces that can be captured and hanging pieces',
  defaultEnabled: false,

  compute(context: OverlayContext): OverlayFrame {
    const arrows: OverlayArrow[] = [];
    const badges: SquareBadge[] = [];
    
    try {
      const chess = new Chess(context.fen);
      const sideToMove = context.sideToMove;
      const attackerColor = sideToMove; // Who can attack now
      
      // Find all capture threats
      const moves = chess.moves({ verbose: true });
      const captureThreats: Array<{ from: string; to: string; attacker: string; victim: string; value: number }> = [];
      
      for (const move of moves) {
        if (move.captured) {
          const victimValue = PIECE_VALUES[move.captured.toLowerCase()] || 0;
          captureThreats.push({
            from: move.from,
            to: move.to,
            attacker: move.piece,
            victim: move.captured,
            value: victimValue,
          });
        }
      }
      
      // Sort by value (highest value captures first)
      captureThreats.sort((a, b) => b.value - a.value);
      
      // Show top threats as arrows
      const topThreats = captureThreats.slice(0, 5);
      for (const threat of topThreats) {
        const intensity = Math.min(0.4 + threat.value * 0.1, 0.9);
        arrows.push({
          from: threat.from,
          to: threat.to,
          color: `rgba(220, 38, 38, ${intensity})`, // Red threat arrows
          opacity: intensity,
          style: 'solid',
        });
      }
      
      // Find hanging pieces (pieces that can be captured for free)
      const hangingSquares = new Set<string>();
      
      for (const threat of captureThreats) {
        // Check if the victim is defended
        const tempChess = new Chess(context.fen);
        
        // Make the capture
        try {
          tempChess.move({ from: threat.from as Square, to: threat.to as Square });
          
          // Now check if the attacker can be recaptured
          const recaptures = tempChess.moves({ verbose: true });
          const canRecapture = recaptures.some(m => m.to === threat.to && m.captured);
          
          if (!canRecapture && threat.value >= 3) {
            hangingSquares.add(threat.to);
          }
        } catch {
          // Move failed, skip
        }
      }
      
      // Add badges for hanging pieces
      for (const square of hangingSquares) {
        badges.push({
          square,
          text: '⚠️',
          severity: 'danger',
          tooltip: 'Hanging piece!',
        });
      }
      
    } catch (e) {
      console.error('ThreatsProvider error:', e);
    }
    
    return {
      id: 'threats',
      priority: 30,
      highlights: [],
      arrows,
      badges,
      ghostPieces: [],
    };
  },
};




