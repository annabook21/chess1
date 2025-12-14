/**
 * Move Tracker Utility
 * Stores move data for weakness analysis
 */

import { MoveRecord, MoveQuality, GamePhase } from '@master-academy/contracts';
import { Chess } from 'chess.js';

const STORAGE_KEY = 'masterAcademy_moveHistory';
const MAX_MOVES = 500; // Keep last 500 moves

/**
 * Determine the game phase based on the position
 */
export function getGamePhase(fen: string): GamePhase {
  const chess = new Chess(fen);
  const pieces = chess.board().flat().filter(p => p !== null);
  
  // Count material (excluding kings)
  const materialCount = pieces.filter(p => p?.type !== 'k').length;
  
  // Opening: lots of pieces, pawns on starting ranks
  if (materialCount >= 24) {
    return 'opening';
  }
  
  // Endgame: few pieces remaining
  if (materialCount <= 10) {
    return 'endgame';
  }
  
  return 'middlegame';
}

/**
 * Classify move quality based on evaluation delta
 */
export function getMoveQuality(delta: number, wasBestMove: boolean): MoveQuality {
  if (wasBestMove && delta >= 50) return 'brilliant';
  if (delta >= 50) return 'great';
  if (delta >= -10) return 'good';
  if (delta >= -30) return 'book';
  if (delta >= -100) return 'inaccuracy';
  if (delta >= -200) return 'mistake';
  return 'blunder';
}

/**
 * Detect missed tactics in the position
 */
export function detectMissedTactics(
  fen: string,
  playedMove: string,
  bestMove: string,
  evalDelta: number
): string[] {
  if (evalDelta >= -30) return []; // No significant miss
  
  const missed: string[] = [];
  const chess = new Chess(fen);
  
  // Check best move for tactical patterns
  const bestMoveObj = chess.move({ from: bestMove.slice(0, 2), to: bestMove.slice(2, 4) });
  if (bestMoveObj) {
    // Fork detection (simplified)
    if (bestMoveObj.piece === 'n' || bestMoveObj.piece === 'p') {
      const attacks = getAttackedSquares(chess, bestMoveObj.to);
      const valuableTargets = attacks.filter(sq => {
        const piece = chess.get(sq as 'a1');
        return piece && piece.color !== chess.turn() && ['q', 'r', 'k'].includes(piece.type);
      });
      if (valuableTargets.length >= 2) {
        missed.push('fork');
      }
    }
    
    // Capture of hanging piece
    if (bestMoveObj.captured) {
      missed.push('removing_defender');
    }
    
    // Check detection
    if (bestMoveObj.san.includes('+')) {
      missed.push('discovered_attack');
    }
    
    // Pin detection (simplified)
    if (evalDelta <= -100) {
      missed.push('pin');
    }
  }
  
  return missed;
}

/**
 * Get squares attacked by a piece
 */
function getAttackedSquares(chess: Chess, square: string): string[] {
  const attacks: string[] = [];
  
  try {
    // Get all legal moves from this square
    const moves = chess.moves({ square: square as 'a1', verbose: true });
    for (const move of moves) {
      attacks.push(move.to);
    }
  } catch {
    // Invalid square or no moves
  }
  
  return attacks;
}

/**
 * Save a move record to storage
 */
export function trackMove(record: Omit<MoveRecord, 'id' | 'timestamp'>): void {
  const fullRecord: MoveRecord = {
    ...record,
    id: `${record.gameId}-${record.moveNumber}-${Date.now()}`,
    timestamp: Date.now(),
  };
  
  // Get existing moves
  const existing = getMoveHistory();
  
  // Add new move
  existing.push(fullRecord);
  
  // Keep only last MAX_MOVES
  const trimmed = existing.slice(-MAX_MOVES);
  
  // Save to localStorage
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
}

/**
 * Get all stored move history
 */
export function getMoveHistory(): MoveRecord[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to load move history:', e);
  }
  return [];
}

/**
 * Clear move history
 */
export function clearMoveHistory(): void {
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Convert UCI to SAN notation
 */
export function uciToSan(fen: string, uci: string): string {
  try {
    const chess = new Chess(fen);
    const from = uci.slice(0, 2);
    const to = uci.slice(2, 4);
    const promotion = uci.length > 4 ? uci[4] : undefined;
    
    const move = chess.move({ 
      from, 
      to, 
      promotion: promotion as 'q' | 'r' | 'b' | 'n' | undefined 
    });
    
    return move ? move.san : uci;
  } catch {
    return uci;
  }
}

/**
 * Get concept tags present in a position
 */
export function getPositionConcepts(fen: string): string[] {
  const concepts: string[] = [];
  const chess = new Chess(fen);
  const phase = getGamePhase(fen);
  
  // Opening concepts
  if (phase === 'opening') {
    concepts.push('development');
    concepts.push('center_control');
    
    // Check if not castled
    if (fen.includes('K') || fen.includes('Q') || fen.includes('k') || fen.includes('q')) {
      concepts.push('king_safety');
    }
  }
  
  // Check for open files
  const files = 'abcdefgh';
  for (const file of files) {
    const pieces = chess.board().map(row => row[files.indexOf(file)]).filter(p => p !== null);
    const pawns = pieces.filter(p => p?.type === 'p');
    if (pawns.length === 0) {
      concepts.push('open_file');
      break;
    }
  }
  
  // Endgame concepts
  if (phase === 'endgame') {
    concepts.push('king_activity');
    concepts.push('passed_pawn');
  }
  
  // Middlegame strategy
  if (phase === 'middlegame') {
    concepts.push('piece_activity');
    concepts.push('pawn_structure');
  }
  
  return [...new Set(concepts)]; // Remove duplicates
}

