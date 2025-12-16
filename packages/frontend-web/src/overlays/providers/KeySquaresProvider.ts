/**
 * Key Squares Overlay Provider
 * Shows strategically important squares (center, outposts, weak squares)
 */

import { Chess, Square } from 'chess.js';
import type { OverlayProvider, OverlayFrame, OverlayContext, SquareHighlight, SquareBadge } from '../types';

// Central squares are strategically important
const CENTER_SQUARES = ['d4', 'd5', 'e4', 'e5'];
const EXTENDED_CENTER = ['c3', 'c4', 'c5', 'c6', 'd3', 'd6', 'e3', 'e6', 'f3', 'f4', 'f5', 'f6'];

export const KeySquaresProvider: OverlayProvider = {
  id: 'keySquares',
  name: 'Key Squares',
  description: 'Shows strategically important squares',
  defaultEnabled: false,

  compute(context: OverlayContext): OverlayFrame {
    const highlights: SquareHighlight[] = [];
    const badges: SquareBadge[] = [];
    
    try {
      const chess = new Chess(context.fen);
      
      // Highlight center squares
      for (const square of CENTER_SQUARES) {
        const piece = chess.get(square as Square);
        
        if (!piece) {
          // Empty center square - good to control
          highlights.push({
            square,
            color: 'rgba(234, 179, 8, 0.4)', // Gold
            opacity: 0.4,
          });
        } else {
          // Occupied center square
          highlights.push({
            square,
            color: 'rgba(234, 179, 8, 0.25)',
            opacity: 0.25,
          });
        }
      }
      
      // Find outposts (squares in enemy territory that can't be attacked by pawns)
      const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
      
      // Check for knight outposts on ranks 4-6
      for (const file of files) {
        for (const rank of ['4', '5', '6']) {
          const square = `${file}${rank}`;
          const piece = chess.get(square as Square);
          
          // Check if this could be an outpost
          if (piece && piece.type === 'n') {
            const fileIdx = files.indexOf(file);
            const isOutpost = checkIfOutpost(chess, square, piece.color, files, fileIdx);
            
            if (isOutpost) {
              badges.push({
                square,
                text: '🏰',
                severity: 'success',
                tooltip: 'Knight outpost - cannot be attacked by pawns',
              });
            }
          }
        }
      }
      
      // Find weak squares (controlled by only one side)
      const weakSquares = findWeakSquares(chess, context.sideToMove);
      
      for (const square of weakSquares) {
        highlights.push({
          square,
          color: 'rgba(239, 68, 68, 0.3)', // Red tint for weak squares
          opacity: 0.3,
        });
      }
      
    } catch (e) {
      console.error('KeySquaresProvider error:', e);
    }
    
    return {
      id: 'keySquares',
      priority: 20,
      highlights,
      arrows: [],
      badges,
      ghostPieces: [],
    };
  },
};

function checkIfOutpost(
  chess: Chess, 
  square: string, 
  pieceColor: 'w' | 'b',
  files: string[],
  fileIdx: number
): boolean {
  const enemyPawn = pieceColor === 'w' ? 'p' : 'P';
  const checkRanks = pieceColor === 'w' ? ['5', '6', '7'] : ['2', '3', '4'];
  
  // Check adjacent files for enemy pawns that could attack this square
  const adjacentFiles = [];
  if (fileIdx > 0) adjacentFiles.push(files[fileIdx - 1]);
  if (fileIdx < 7) adjacentFiles.push(files[fileIdx + 1]);
  
  for (const adjFile of adjacentFiles) {
    for (const rank of checkRanks) {
      const checkSquare = `${adjFile}${rank}` as Square;
      const piece = chess.get(checkSquare);
      if (piece && piece.type === 'p' && piece.color !== pieceColor) {
        return false; // Can be attacked by enemy pawn
      }
    }
  }
  
  return true;
}

function findWeakSquares(chess: Chess, sideToMove: 'w' | 'b'): string[] {
  const weakSquares: string[] = [];
  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  
  // Check squares around the king that might be weak
  const kingSquare = findKingSquare(chess, sideToMove);
  if (!kingSquare) return weakSquares;
  
  const kingFile = files.indexOf(kingSquare[0]);
  const kingRank = parseInt(kingSquare[1]);
  
  // Check squares near the king
  for (let df = -2; df <= 2; df++) {
    for (let dr = -2; dr <= 2; dr++) {
      const newFile = kingFile + df;
      const newRank = kingRank + dr;
      
      if (newFile >= 0 && newFile < 8 && newRank >= 1 && newRank <= 8) {
        const square = `${files[newFile]}${newRank}`;
        const piece = chess.get(square as Square);
        
        // Empty squares near king that aren't well defended could be weak
        if (!piece && isWeaklyDefended(chess, square, sideToMove)) {
          weakSquares.push(square);
        }
      }
    }
  }
  
  return weakSquares.slice(0, 4); // Limit to top 4 weak squares
}

function findKingSquare(chess: Chess, color: 'w' | 'b'): string | null {
  const board = chess.board();
  for (let rank = 0; rank < 8; rank++) {
    for (let file = 0; file < 8; file++) {
      const piece = board[rank][file];
      if (piece && piece.type === 'k' && piece.color === color) {
        return piece.square;
      }
    }
  }
  return null;
}

function isWeaklyDefended(chess: Chess, square: string, defenderColor: 'w' | 'b'): boolean {
  // Simplified check - count defenders vs attackers
  // In a real implementation, this would be more sophisticated
  return true; // Placeholder - would need proper implementation
}





