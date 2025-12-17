/**
 * Optimized Lc0/Maia FEN Encoder
 * 
 * Converts chess positions (FEN strings) to the 112-plane tensor format
 * expected by Leela Chess Zero / Maia neural networks.
 * 
 * OPTIMIZED based on research from:
 * - maia-platform-frontend (CSSLab)
 * - lczero.org documentation
 * - a0lite-js implementation
 * 
 * Input Format (112 planes of 8x8):
 * ═════════════════════════════════════════════════════════════
 * Planes 0-95:   Piece positions over 8 time steps
 *                (6 piece types × 2 colors × 8 history = 96 planes)
 * Planes 96-99:  Castling rights (4 planes)
 * Plane 100:     Side to move (1 if black)
 * Planes 101-102: Repetition counters
 * Plane 103:     Fifty-move counter
 * Planes 104-110: Reserved / unused
 * Plane 111:     All ones (constant plane)
 * ═════════════════════════════════════════════════════════════
 * 
 * IMPORTANT: Board is always encoded from the perspective of the 
 * side to move. For black's turn, the board is flipped.
 */

import { Chess, PieceSymbol, Color } from 'chess.js';
import { LC0_INPUT_SIZE } from './types';

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

/** Piece type indices for encoding */
const PIECE_INDICES: Record<PieceSymbol, number> = {
  p: 0, n: 1, b: 2, r: 3, q: 4, k: 5,
};

/** Total planes per time step (6 piece types × 2 colors) */
const PLANES_PER_STEP = 12;

/** Number of history time steps */
const HISTORY_STEPS = 8;

// ═══════════════════════════════════════════════════════════════════════════
// OPTIMIZED ENCODER
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Encode a FEN string to Lc0/Maia 112-plane input format
 * 
 * @param fen - Current position FEN
 * @param history - Array of previous FEN positions (up to 7, most recent first)
 * @returns Float32Array of shape [112, 8, 8] flattened to [7168]
 */
export function encodeFenToPlanes(fen: string, history: string[] = []): Float32Array {
  const result = new Float32Array(LC0_INPUT_SIZE);
  
  // Parse side to move
  const parts = fen.split(' ');
  const sideToMove = parts[1] === 'b' ? 'b' : 'w';
  const isBlackTurn = sideToMove === 'b';
  
  // Build position stack (current + up to 7 previous)
  const positions = [fen, ...history.slice(0, 7)];
  
  // Fill missing history with the oldest available position
  while (positions.length < HISTORY_STEPS) {
    positions.push(positions[positions.length - 1]);
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // PIECE PLANES (0-95): 8 time steps × 12 planes
  // ─────────────────────────────────────────────────────────────────────────
  
  for (let t = 0; t < HISTORY_STEPS; t++) {
    try {
      const chess = new Chess(positions[t]);
      encodePiecesForStep(result, chess, t, isBlackTurn);
    } catch {
      // Invalid FEN - leave planes as zeros
    }
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // AUXILIARY PLANES (96-111)
  // ─────────────────────────────────────────────────────────────────────────
  
  encodeAuxiliaryPlanes(result, fen, isBlackTurn);
  
  return result;
}

/**
 * Encode piece positions for a single time step
 * Optimized with direct array access
 */
function encodePiecesForStep(
  result: Float32Array,
  chess: Chess,
  timeStep: number,
  isBlackTurn: boolean
): void {
  const baseOffset = timeStep * PLANES_PER_STEP * 64;
  const board = chess.board();
  
  for (let rank = 0; rank < 8; rank++) {
    for (let file = 0; file < 8; file++) {
      const piece = board[7 - rank][file]; // board() is rank 8 to 1
      if (!piece) continue;
      
      // Determine piece plane index
      const pieceIdx = PIECE_INDICES[piece.type];
      
      // Color offset: 0 for "our" pieces, 6 for "their" pieces
      // "Our" = same color as side to move
      const isOurPiece = piece.color === (isBlackTurn ? 'b' : 'w');
      const colorOffset = isOurPiece ? 0 : 6;
      
      // Calculate plane and position
      const planeIdx = pieceIdx + colorOffset;
      
      // Transform coordinates for black's perspective
      let [r, c] = [rank, file];
      if (isBlackTurn) {
        r = 7 - rank;
        c = 7 - file;
      }
      
      // Set the bit
      const offset = baseOffset + planeIdx * 64 + r * 8 + c;
      result[offset] = 1.0;
    }
  }
}

/**
 * Encode auxiliary planes (castling, side to move, etc.)
 */
function encodeAuxiliaryPlanes(
  result: Float32Array,
  fen: string,
  isBlackTurn: boolean
): void {
  const parts = fen.split(' ');
  const castling = parts[2] || '-';
  const halfMoveClock = parseInt(parts[4] || '0');
  
  // Plane offsets
  const AUX_START = 96 * 64;
  
  // ─────────────────────────────────────────────────────────────────────────
  // Castling rights (planes 96-99)
  // From the perspective of side to move
  // ─────────────────────────────────────────────────────────────────────────
  
  if (isBlackTurn) {
    // Black's turn: our castling = k/q, their castling = K/Q
    fillPlane(result, AUX_START + 0 * 64, castling.includes('k') ? 1 : 0);
    fillPlane(result, AUX_START + 1 * 64, castling.includes('q') ? 1 : 0);
    fillPlane(result, AUX_START + 2 * 64, castling.includes('K') ? 1 : 0);
    fillPlane(result, AUX_START + 3 * 64, castling.includes('Q') ? 1 : 0);
  } else {
    // White's turn: our castling = K/Q, their castling = k/q
    fillPlane(result, AUX_START + 0 * 64, castling.includes('K') ? 1 : 0);
    fillPlane(result, AUX_START + 1 * 64, castling.includes('Q') ? 1 : 0);
    fillPlane(result, AUX_START + 2 * 64, castling.includes('k') ? 1 : 0);
    fillPlane(result, AUX_START + 3 * 64, castling.includes('q') ? 1 : 0);
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // Side to move (plane 100) - always 0 since we encode from mover's view
  // ─────────────────────────────────────────────────────────────────────────
  
  // Plane 100 is all zeros (we're always encoding from "our" perspective)
  
  // ─────────────────────────────────────────────────────────────────────────
  // Repetition counters (planes 101-102) - simplified, always 0
  // In a full implementation, track position repetitions
  // ─────────────────────────────────────────────────────────────────────────
  
  // Planes 101-102 are zeros (no repetition tracking for now)
  
  // ─────────────────────────────────────────────────────────────────────────
  // Fifty-move counter (plane 103)
  // Normalized to [0, 1] range
  // ─────────────────────────────────────────────────────────────────────────
  
  const normalizedClock = Math.min(halfMoveClock / 100, 1);
  fillPlane(result, AUX_START + 7 * 64, normalizedClock);
  
  // ─────────────────────────────────────────────────────────────────────────
  // Constant plane (plane 111) - all ones
  // ─────────────────────────────────────────────────────────────────────────
  
  fillPlane(result, 111 * 64, 1);
}

/**
 * Fill a plane with a constant value
 */
function fillPlane(result: Float32Array, offset: number, value: number): void {
  if (value === 0) return; // Already zero-initialized
  for (let i = 0; i < 64; i++) {
    result[offset + i] = value;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// MOVE POLICY MAPPING
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Pre-computed move mapping for Lc0 policy output
 * 
 * Lc0 uses a specific encoding for 1858 possible moves:
 * - Queen moves (56 per square = 8 directions × 7 distances)
 * - Knight moves (8 per square)
 * - Underpromotions (knight, bishop, rook)
 * 
 * This mapping is generated once and cached.
 */

// Lazy-initialized move mappings
let _policyToUci: string[] | null = null;
let _uciToPolicy: Map<string, number> | null = null;

const FILES = 'abcdefgh';
const RANKS = '12345678';

/**
 * Generate the LC0 1858-format move mapping tables.
 * 
 * LC0 policy format (1858 indices):
 * - 73 "move types" per square: 56 queen-like + 8 knight + 9 underpromotion
 * - Only valid (on-board) moves are included, giving ~1858 total
 * - Moves are from the perspective of the player to move
 * 
 * This encoding matches the standard Leela Chess Zero format.
 */
function initMoveMappings(): void {
  if (_policyToUci !== null) return;
  
  _policyToUci = [];
  _uciToPolicy = new Map();
  
  // Queen-like moves: 8 directions × 7 distances = 56 move types
  // Order: N, NE, E, SE, S, SW, W, NW (standard LC0 order)
  const QUEEN_DIRS: [number, number][] = [
    [0, 1],   // N
    [1, 1],   // NE
    [1, 0],   // E
    [1, -1],  // SE
    [0, -1],  // S
    [-1, -1], // SW
    [-1, 0],  // W
    [-1, 1],  // NW
  ];
  
  // Knight moves: 8 directions
  const KNIGHT_DIRS: [number, number][] = [
    [1, 2], [2, 1], [2, -1], [1, -2],
    [-1, -2], [-2, -1], [-2, 1], [-1, 2],
  ];
  
  // Underpromotion directions (relative file change)
  const PROMO_DIRS = [-1, 0, 1]; // Capture left, push, capture right
  const PROMO_PIECES = ['n', 'b', 'r']; // Knight, bishop, rook (no queen - that's default)
  
  // Build the mapping: iterate through all 64 squares and 73 move types
  // This matches the LC0 policy vector layout
  for (let fromRank = 0; fromRank < 8; fromRank++) {
    for (let fromFile = 0; fromFile < 8; fromFile++) {
      const from = FILES[fromFile] + RANKS[fromRank];
      
      // Move types 0-55: Queen-like moves (8 directions × 7 distances)
      for (const [df, dr] of QUEEN_DIRS) {
        for (let dist = 1; dist <= 7; dist++) {
          const toFile = fromFile + df * dist;
          const toRank = fromRank + dr * dist;
          
          // Only add if on board
          if (toFile >= 0 && toFile < 8 && toRank >= 0 && toRank < 8) {
            const uci = from + FILES[toFile] + RANKS[toRank];
            const idx = _policyToUci.length;
            _policyToUci.push(uci);
            _uciToPolicy.set(uci, idx);
          }
        }
      }
      
      // Move types 56-63: Knight moves
      for (const [df, dr] of KNIGHT_DIRS) {
        const toFile = fromFile + df;
        const toRank = fromRank + dr;
        
        if (toFile >= 0 && toFile < 8 && toRank >= 0 && toRank < 8) {
          const uci = from + FILES[toFile] + RANKS[toRank];
          const idx = _policyToUci.length;
          _policyToUci.push(uci);
          _uciToPolicy.set(uci, idx);
        }
      }
      
      // Move types 64-72: Underpromotions (only from 7th rank for white perspective)
      // In LC0, promotions are encoded from mover's perspective (always 7th rank)
      if (fromRank === 6) { // 7th rank (0-indexed: rank 6 is "7" in notation)
        for (const dFile of PROMO_DIRS) {
          const toFile = fromFile + dFile;
          if (toFile >= 0 && toFile < 8) {
            for (const promo of PROMO_PIECES) {
              const uci = from + FILES[toFile] + '8' + promo;
              const idx = _policyToUci.length;
              _policyToUci.push(uci);
              _uciToPolicy.set(uci, idx);
            }
          }
        }
      }
    }
  }
  
  console.log(`[Maia] Initialized ${_policyToUci.length} move mappings (expected ~1858)`);
}

// ═══════════════════════════════════════════════════════════════════════════
// POLICY DECODING
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Decode policy output to UCI moves with probabilities
 * 
 * @param policy - Raw policy logits from the model
 * @param fen - Current position FEN (to filter legal moves)
 * @param topK - Number of top moves to return
 * @returns Array of {uci, probability} sorted by probability
 */
export function decodePolicyToMoves(
  policy: Float32Array,
  fen: string,
  topK: number = 5
): Array<{ uci: string; probability: number }> {
  initMoveMappings();
  if (!_uciToPolicy) return [];
  
  const chess = new Chess(fen);
  const legalMoves = chess.moves({ verbose: true });
  const isBlackTurn = fen.split(' ')[1] === 'b';
  
  // Build set of legal UCIs
  const legalUcis = new Map<string, string>();
  for (const m of legalMoves) {
    const uci = m.from + m.to + (m.promotion || '');
    legalUcis.set(uci, m.san);
  }
  
  // Apply softmax to policy logits
  const maxLogit = Math.max(...policy);
  let sumExp = 0;
  const expValues = new Float32Array(policy.length);
  
  for (let i = 0; i < policy.length; i++) {
    expValues[i] = Math.exp(policy[i] - maxLogit);
    sumExp += expValues[i];
  }
  
  // Collect legal moves with probabilities
  const moveProbs: Array<{ uci: string; probability: number }> = [];
  
  // Debug: track how many moves we process
  let foundCount = 0;
  let missedCount = 0;
  let outOfBoundsCount = 0;
  
  for (const [uci] of legalUcis) {
    // Transform UCI if black to move (policy is from mover's perspective)
    const lookupUci = isBlackTurn ? flipUci(uci) : uci;
    
    // For queen promotions, look up the base move (Lc0 doesn't have separate queen promo indices)
    let policyUci = lookupUci;
    if (lookupUci.length === 5 && lookupUci[4] === 'q') {
      policyUci = lookupUci.slice(0, 4);
    }
    
    const idx = _uciToPolicy.get(policyUci);
    if (idx === undefined) {
      missedCount++;
      // Try without flip as fallback
      const altIdx = _uciToPolicy.get(uci.length === 5 && uci[4] === 'q' ? uci.slice(0, 4) : uci);
      if (altIdx !== undefined && altIdx < expValues.length) {
        const probability = expValues[altIdx] / sumExp;
        moveProbs.push({ uci, probability });
        foundCount++;
      }
    } else if (idx >= expValues.length) {
      outOfBoundsCount++;
    } else {
      const probability = expValues[idx] / sumExp;
      moveProbs.push({ uci, probability });
      foundCount++;
    }
  }
  
  // Debug log if we had issues
  if (missedCount > 0 || outOfBoundsCount > 0) {
    console.warn('[Maia Decoder] Policy lookup issues:', {
      legalMoves: legalUcis.size,
      found: foundCount,
      missed: missedCount,
      outOfBounds: outOfBoundsCount,
      policySize: policy.length,
      mappingSize: _uciToPolicy?.size,
      isBlackTurn,
    });
  }
  
  // Sort by probability descending
  moveProbs.sort((a, b) => b.probability - a.probability);
  
  return moveProbs.slice(0, topK);
}

/**
 * Flip a UCI move for black's perspective
 * Lc0 encodes moves from the side to move's perspective
 */
function flipUci(uci: string): string {
  const flipSquare = (sq: string): string => {
    const file = String.fromCharCode('h'.charCodeAt(0) - (sq.charCodeAt(0) - 'a'.charCodeAt(0)));
    const rank = String.fromCharCode('9'.charCodeAt(0) - sq.charCodeAt(1));
    return file + rank;
  };
  
  const from = uci.slice(0, 2);
  const to = uci.slice(2, 4);
  const promo = uci.slice(4);
  
  return flipSquare(from) + flipSquare(to) + promo;
}

/**
 * Get the policy index for a UCI move
 */
export function getUciPolicyIndex(uci: string): number | undefined {
  initMoveMappings();
  return _uciToPolicy?.get(uci);
}

/**
 * Get the UCI move for a policy index
 */
export function getPolicyUci(index: number): string | undefined {
  initMoveMappings();
  return _policyToUci?.[index];
}



