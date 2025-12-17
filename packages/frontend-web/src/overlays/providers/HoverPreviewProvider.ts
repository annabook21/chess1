/**
 * Hover Preview Overlay Provider
 * Shows preview of move consequences when hovering a choice
 */

import type { OverlayProvider, OverlayFrame, OverlayContext, OverlayArrow, GhostPiece, SquareHighlight, SquareBadge } from '../types';
import type { MoveChoiceWithPreview } from '@master-academy/contracts';
import { Chess } from 'chess.js';

export const HoverPreviewProvider: OverlayProvider = {
  id: 'hoverPreview',
  name: 'Move Preview',
  description: 'Shows what happens after you make a move',
  defaultEnabled: true,

  compute(context: OverlayContext): OverlayFrame {
    const arrows: OverlayArrow[] = [];
    const ghostPieces: GhostPiece[] = [];
    const highlights: SquareHighlight[] = [];
    const badges: SquareBadge[] = [];
    
    const hoveredChoice = context.hoveredChoice as MoveChoiceWithPreview | undefined;
    
    if (!hoveredChoice?.pvPreview) {
      return {
        id: 'hoverPreview',
        priority: 50,
        highlights: [],
        arrows: [],
        badges: [],
        ghostPieces: [],
      };
    }
    
    const preview = hoveredChoice.pvPreview;
    
    // Convert your move UCI to readable format
    const yourMoveLabel = (() => {
      try {
        const chess = new Chess(context.fen);
        const move = chess.move({
          from: preview.yourMove.from,
          to: preview.yourMove.to,
        });
        return move ? move.san : `${preview.yourMove.from}→${preview.yourMove.to}`;
      } catch {
        return `${preview.yourMove.from}→${preview.yourMove.to}`;
      }
    })();
    
    // 1. Your move (green arrow)
    arrows.push({
      from: preview.yourMove.from,
      to: preview.yourMove.to,
      color: 'rgba(34, 197, 94, 0.9)', // Green
      opacity: 0.9,
      style: 'solid',
      label: `You: ${yourMoveLabel}`,
    });
    
    // 2. Opponent's likely reply (red dashed arrow)
    if (preview.opponentReply) {
      arrows.push({
        from: preview.opponentReply.from,
        to: preview.opponentReply.to,
        color: 'rgba(239, 68, 68, 0.7)', // Red
        opacity: 0.7,
        style: 'dashed',
        label: `Opponent: ${preview.opponentReply.san}`,
      });
    }
    
    // 3. Your follow-up (blue dashed arrow)
    if (preview.yourFollowUp) {
      arrows.push({
        from: preview.yourFollowUp.from,
        to: preview.yourFollowUp.to,
        color: 'rgba(59, 130, 246, 0.6)', // Blue
        opacity: 0.6,
        style: 'dashed',
        label: `You: ${preview.yourFollowUp.san}`,
      });
    }
    
    // 4. Highlight newly attacked squares
    if (preview.newlyAttacked) {
      for (const square of preview.newlyAttacked) {
        highlights.push({
          square,
          color: 'rgba(251, 146, 60, 0.4)', // Orange
          opacity: 0.4,
        });
      }
    }
    
    // 5. Highlight newly defended squares
    if (preview.newlyDefended) {
      for (const square of preview.newlyDefended) {
        highlights.push({
          square,
          color: 'rgba(74, 222, 128, 0.3)', // Light green
          opacity: 0.3,
        });
      }
    }
    
    // 6. Show eval shift badge at destination square
    if (hoveredChoice.eval !== undefined) {
      const evalPawns = hoveredChoice.eval / 100;
      const evalText = evalPawns >= 0 ? `+${evalPawns.toFixed(1)}` : evalPawns.toFixed(1);
      badges.push({
        square: preview.yourMove.to,
        text: evalText,
        severity: evalPawns >= 0.3 ? 'success' : evalPawns <= -0.5 ? 'danger' : 'info',
        tooltip: `Evaluation: ${evalText} pawns`,
      });
    }
    
    return {
      id: 'hoverPreview',
      priority: 50, // High priority - on top of other overlays
      highlights,
      arrows,
      badges,
      ghostPieces,
    };
  },
};

