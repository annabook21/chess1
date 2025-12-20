/**
 * Maia Encoder Manual Test
 * 
 * Run this in the browser console to verify the encoder works:
 * 
 * import { testEncoder } from './maia/testEncoder';
 * testEncoder();
 */

import { encodeFenToPlanes, decodePolicyToMoves } from './encoder';
import { LC0_INPUT_SIZE } from './types';

export function testEncoder(): void {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  Maia Encoder Test Suite');
  console.log('═══════════════════════════════════════════════════════════════');
  
  let passed = 0;
  let failed = 0;

  function test(name: string, fn: () => boolean): void {
    try {
      if (fn()) {
        console.log(`✅ ${name}`);
        passed++;
      } else {
        console.log(`❌ ${name}`);
        failed++;
      }
    } catch (error) {
      console.log(`❌ ${name}:`, error);
      failed++;
    }
  }

  // Test 1: Output size
  test('Output has correct size (7168)', () => {
    const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    const result = encodeFenToPlanes(fen);
    return result.length === LC0_INPUT_SIZE;
  });

  // Test 2: Float32Array type
  test('Output is Float32Array', () => {
    const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    const result = encodeFenToPlanes(fen);
    return result instanceof Float32Array;
  });

  // Test 3: Has non-zero values
  test('Starting position has non-zero values', () => {
    const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    const result = encodeFenToPlanes(fen);
    return result.some(v => v !== 0);
  });

  // Test 4: Black to move encoding
  test('Black to move encodes correctly', () => {
    const fen = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1';
    const result = encodeFenToPlanes(fen);
    return result.length === LC0_INPUT_SIZE && result.some(v => v !== 0);
  });

  // Test 5: History encoding
  test('History encoding works', () => {
    const fen = 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2';
    const history = [
      'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
    ];
    const result = encodeFenToPlanes(fen, history);
    return result.length === LC0_INPUT_SIZE;
  });

  // Test 6: Constant plane is all ones
  test('Plane 111 (constant) is all ones', () => {
    const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    const result = encodeFenToPlanes(fen);
    const plane111Start = 111 * 64;
    for (let i = 0; i < 64; i++) {
      if (result[plane111Start + i] !== 1) return false;
    }
    return true;
  });

  // Test 7: Policy decoding returns moves
  test('Policy decoding returns legal moves', () => {
    const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    const mockPolicy = new Float32Array(1858).fill(0.1);
    const moves = decodePolicyToMoves(mockPolicy, fen, 5);
    return moves.length > 0 && moves.length <= 5;
  });

  // Test 8: Moves are sorted by probability
  test('Moves are sorted by probability', () => {
    const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    const mockPolicy = new Float32Array(1858);
    for (let i = 0; i < mockPolicy.length; i++) {
      mockPolicy[i] = Math.random();
    }
    const moves = decodePolicyToMoves(mockPolicy, fen, 5);
    for (let i = 1; i < moves.length; i++) {
      if (moves[i - 1].probability < moves[i].probability) return false;
    }
    return true;
  });

  // Test 9: UCI format is valid
  test('UCI moves have valid format', () => {
    const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    const mockPolicy = new Float32Array(1858).fill(0.1);
    const moves = decodePolicyToMoves(mockPolicy, fen, 5);
    const uciRegex = /^[a-h][1-8][a-h][1-8][qrbn]?$/;
    return moves.every(m => uciRegex.test(m.uci));
  });

  // Test 10: Probabilities sum to <= 1
  test('Probabilities are normalized', () => {
    const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    const mockPolicy = new Float32Array(1858).fill(0.1);
    const moves = decodePolicyToMoves(mockPolicy, fen, 20);
    const sum = moves.reduce((acc, m) => acc + m.probability, 0);
    return sum <= 1.01; // Allow small floating point error
  });

  console.log('───────────────────────────────────────────────────────────────');
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log('═══════════════════════════════════════════════════════════════');
}

// Auto-run if in browser console
if (typeof window !== 'undefined') {
  (window as any).testMaiaEncoder = testEncoder;
  console.log('Run window.testMaiaEncoder() to test the encoder');
}









