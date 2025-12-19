/**
 * Test Utilities
 * 
 * Common utilities for testing React components with proper providers.
 */

import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { MaiaProvider } from './maia';
import { AchievementProvider } from './achievements';

/**
 * Custom render function that wraps components with necessary providers
 */
function customRender(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
    return (
      <MaiaProvider>
        <AchievementProvider>
          {children}
        </AchievementProvider>
      </MaiaProvider>
    );
  };

  return render(ui, { wrapper: AllTheProviders, ...options });
}

// Re-export everything from testing-library
export * from '@testing-library/react';

// Override render method
export { customRender as render };

// ============================================================================
// CHESS FIXTURES
// ============================================================================

/**
 * Standard chess positions for testing
 */
export const POSITIONS = {
  /** Standard starting position */
  starting: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  
  /** After 1. e4 */
  afterE4: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
  
  /** After 1. e4 e5 2. Nf3 Nc6 3. Bb5 (Ruy Lopez) */
  ruyLopez: 'r1bqkbnr/pppp1ppp/2n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3',
  
  /** Knight fork position */
  knightFork: 'r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4',
  
  /** Pin on the king */
  pinPosition: 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4',
  
  /** Pawn promotion position */
  promotion: '8/P7/8/8/8/8/8/4K2k w - - 0 1',
  
  /** Checkmate (fool's mate) */
  checkmate: 'rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3',
  
  /** Stalemate */
  stalemate: '8/8/8/8/8/5k2/5p2/5K2 w - - 0 1',
  
  /** King and pawn endgame */
  kpkEndgame: '8/8/8/8/4k3/8/4P3/4K3 w - - 0 1',
  
  /** Limited legal moves (king in corner) */
  limitedMoves: '7k/8/6K1/8/8/8/8/8 b - - 0 1',
  
  /** En passant available */
  enPassant: 'rnbqkbnr/pppp1ppp/8/4pP2/8/8/PPPPP1PP/RNBQKBNR w KQkq e6 0 3',
  
  /** Castling rights (both sides) */
  canCastle: 'r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1',
  
  /** Many queens (stress test) */
  manyQueens: 'QQQQQQQQ/QQQQQQQQ/8/8/8/8/8/4K2k w - - 0 1',
} as const;

/**
 * Mock move predictions for testing
 */
export const MOCK_PREDICTIONS = [
  { uci: 'e2e4', san: 'e4', probability: 0.4, from: 'e2', to: 'e4' },
  { uci: 'd2d4', san: 'd4', probability: 0.3, from: 'd2', to: 'd4' },
  { uci: 'c2c4', san: 'c4', probability: 0.2, from: 'c2', to: 'c4' },
  { uci: 'g1f3', san: 'Nf3', probability: 0.1, from: 'g1', to: 'f3' },
];

/**
 * Mock turn package for testing
 */
export const MOCK_TURN_PACKAGE = {
  gameId: 'test-game-123',
  fen: POSITIONS.starting,
  sideToMove: 'w' as const,
  choices: [
    {
      id: 'A',
      moveUci: 'e2e4',
      styleId: 'fischer' as const,
      planOneLiner: 'Control the center with the king pawn',
      pv: ['e2e4', 'e7e5', 'g1f3'],
      eval: 30,
      conceptTags: ['center_control', 'development'],
    },
    {
      id: 'B',
      moveUci: 'd2d4',
      styleId: 'capablanca' as const,
      planOneLiner: 'Establish a strong pawn center',
      pv: ['d2d4', 'd7d5', 'c2c4'],
      eval: 25,
      conceptTags: ['center_control', 'pawn_structure'],
    },
    {
      id: 'C',
      moveUci: 'g1f3',
      styleId: 'karpov' as const,
      planOneLiner: 'Develop the knight flexibly',
      pv: ['g1f3', 'd7d5', 'd2d3'],
      eval: 20,
      conceptTags: ['development', 'piece_activity'],
    },
  ],
  bestMove: { moveUci: 'e2e4', eval: 30 },
  difficulty: { engineElo: 1500, hintLevel: 2 },
  telemetryHints: { timeBudgetMs: 60000 },
};

/**
 * Mock move response for testing
 */
export const MOCK_MOVE_RESPONSE = {
  accepted: true,
  newFen: POSITIONS.afterE4,
  feedback: {
    evalBefore: 0,
    evalAfter: 30,
    delta: 30,
    coachText: 'Good opening move! You control the center.',
    conceptTags: ['center_control', 'development'],
    blunder: false,
    aiMove: {
      moveSan: 'e5',
      styleId: 'capablanca',
      justification: 'Fighting for central control.',
    },
  },
  nextTurn: {
    ...MOCK_TURN_PACKAGE,
    fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2',
    sideToMove: 'w' as const,
  },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Wait for async operations to complete
 */
export const waitForAsync = () => new Promise(resolve => setTimeout(resolve, 0));

/**
 * Create a mock API response
 */
export function mockApiResponse<T>(data: T, delay = 0): Promise<T> {
  return new Promise(resolve => {
    setTimeout(() => resolve(data), delay);
  });
}

/**
 * Create a rejected API response
 */
export function mockApiError(message: string, delay = 0): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error(message)), delay);
  });
}

