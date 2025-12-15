/**
 * Hover Preview Overlay Provider
 * Shows preview of move consequences when hovering a choice
 */

import type { OverlayProvider, OverlayFrame, OverlayContext, OverlayArrow, GhostPiece, SquareHighlight } from '../types';
import type { MoveChoiceWithPreview } from '@master-academy/contracts';

export const HoverPreviewProvider: OverlayProvider = {
  id: 'hoverPreview',
  name: 'Move Preview',
  description: 'Shows what happens after you make a move',
  defaultEnabled: true,

  compute(context: OverlayContext): OverlayFrame {
    const arrows: OverlayArrow[] = [];
    const ghostPieces: GhostPiece[] = [];
    const highlights: SquareHighlight[] = [];
    
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
    
    // 1. Your move (green arrow)
    arrows.push({
      from: preview.yourMove.from,
      to: preview.yourMove.to,
      color: 'rgba(34, 197, 94, 0.9)', // Green
      opacity: 0.9,
      style: 'solid',
      label: 'You',
    });
    
    // 2. Opponent's likely reply (red dashed arrow)
    if (preview.opponentReply) {
      arrows.push({
        from: preview.opponentReply.from,
        to: preview.opponentReply.to,
        color: 'rgba(239, 68, 68, 0.7)', // Red
        opacity: 0.7,
        style: 'dashed',
        label: preview.opponentReply.san,
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
        label: preview.yourFollowUp.san,
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
    
    return {
      id: 'hoverPreview',
      priority: 50, // High priority - on top of other overlays
      highlights,
      arrows,
      badges: [],
      ghostPieces,
    };
  },
};

