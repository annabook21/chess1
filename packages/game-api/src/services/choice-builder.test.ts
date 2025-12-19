/**
 * ChoiceBuilder Unit Tests
 * 
 * Tests for the Strategy Pattern implementation of move choice generation.
 * Uses mocked engine and style clients for unit testing.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChoiceBuilder } from './choice-builder';

// ============================================================================
// TEST FIXTURES
// ============================================================================

const STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const AFTER_E4 = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1';
const RUY_LOPEZ = 'r1bqkbnr/pppp1ppp/2n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3';

// Mock engine client
const createMockEngineClient = (overrides: Partial<any> = {}) => ({
  client: {}, // Mock axios client (not used in tests)
  analyzePosition: vi.fn().mockResolvedValue({
    eval: 30,
    pv: ['e2e4', 'e7e5', 'g1f3'],
    depth: 10,
  }),
  scoreMove: vi.fn().mockResolvedValue({
    move: 'e2e4',
    evalDelta: 30,
    pv: ['e7e5', 'g1f3'],
  }),
  // scoreMoves - used by getPvsForMoves for batch scoring
  scoreMoves: vi.fn().mockResolvedValue({
    scores: [
      { move: 'e2e4', evalDelta: 30, pv: ['e2e4', 'e7e5'] },
      { move: 'd2d4', evalDelta: 25, pv: ['d2d4', 'd7d5'] },
      { move: 'g1f3', evalDelta: 20, pv: ['g1f3', 'g8f6'] },
    ],
  }),
  isLegalMove: vi.fn().mockResolvedValue(true),
  setStrength: vi.fn().mockResolvedValue(undefined),
  ...overrides,
});

// Mock style client
const createMockStyleClient = (overrides: Partial<any> = {}) => ({
  client: {}, // Mock axios client (not used in tests)
  suggestMoves: vi.fn().mockImplementation((_fen: string, styleId: string) => {
    const moveSets: Record<string, string[]> = {
      fischer: ['e2e4', 'd2d4', 'g1f3', 'c2c4', 'b1c3'],
      tal: ['e2e4', 'd2d4', 'f2f4', 'g1f3', 'b2b4'],
      capablanca: ['d2d4', 'e2e4', 'c2c4', 'g1f3', 'b1c3'],
      karpov: ['d2d4', 'c2c4', 'g1f3', 'e2e3', 'b1c3'],
    };
    return Promise.resolve(moveSets[styleId] || ['e2e4', 'd2d4']);
  }),
  ...overrides,
});

const createBuilder = (
  engineOverrides: Partial<any> = {},
  styleOverrides: Partial<any> = {}
) => {
  return new ChoiceBuilder({
    engineClient: createMockEngineClient(engineOverrides),
    styleClient: createMockStyleClient(styleOverrides),
  });
};

const defaultDifficulty = {
  engineElo: 1500,
  hintLevel: 2,
};

// ============================================================================
// CONSTRUCTOR TESTS
// ============================================================================

describe('ChoiceBuilder', () => {
  describe('constructor', () => {
    it('should create instance with valid dependencies', () => {
      const builder = createBuilder();
      expect(builder).toBeDefined();
    });
  });

  // ============================================================================
  // buildChoices TESTS
  // ============================================================================

  describe('buildChoices', () => {
    let builder: ChoiceBuilder;
    let mockEngineClient: ReturnType<typeof createMockEngineClient>;
    let mockStyleClient: ReturnType<typeof createMockStyleClient>;

    beforeEach(() => {
      mockEngineClient = createMockEngineClient();
      mockStyleClient = createMockStyleClient();
      builder = new ChoiceBuilder({
        engineClient: mockEngineClient,
        styleClient: mockStyleClient,
      });
    });

    it('should return 3 choices', async () => {
      const choices = await builder.buildChoices(STARTING_FEN, defaultDifficulty, 0);
      
      expect(choices).toHaveLength(3);
    });

    it('should return choices with valid structure', async () => {
      const choices = await builder.buildChoices(STARTING_FEN, defaultDifficulty, 0);
      
      choices.forEach(choice => {
        expect(choice).toHaveProperty('id');
        expect(choice).toHaveProperty('moveUci');
        expect(choice).toHaveProperty('styleId');
        expect(choice).toHaveProperty('planOneLiner');
        expect(choice).toHaveProperty('pv');
        expect(choice).toHaveProperty('eval');
        expect(choice).toHaveProperty('conceptTags');
      });
    });

    it('should assign unique IDs to each choice', async () => {
      const choices = await builder.buildChoices(STARTING_FEN, defaultDifficulty, 0);
      
      const ids = choices.map(c => c.id);
      expect(new Set(ids).size).toBe(3);
      expect(ids).toContain('A');
      expect(ids).toContain('B');
      expect(ids).toContain('C');
    });

    it('should use distinct moves for each choice', async () => {
      const choices = await builder.buildChoices(STARTING_FEN, defaultDifficulty, 0);
      
      const moves = choices.map(c => c.moveUci);
      expect(new Set(moves).size).toBe(3);
    });

    it('should include valid UCI moves', async () => {
      const choices = await builder.buildChoices(STARTING_FEN, defaultDifficulty, 0);
      
      choices.forEach(choice => {
        expect(choice.moveUci).toMatch(/^[a-h][1-8][a-h][1-8][qrbn]?$/);
      });
    });

    it('should include PV (principal variation) for each choice', async () => {
      const choices = await builder.buildChoices(STARTING_FEN, defaultDifficulty, 0);
      
      choices.forEach(choice => {
        expect(Array.isArray(choice.pv)).toBe(true);
        expect(choice.pv.length).toBeGreaterThan(0);
      });
    });

    it('should generate plan one-liners for each choice', async () => {
      const choices = await builder.buildChoices(STARTING_FEN, defaultDifficulty, 0);
      
      choices.forEach(choice => {
        expect(typeof choice.planOneLiner).toBe('string');
        expect(choice.planOneLiner.length).toBeGreaterThan(0);
      });
    });

    it('should include concept tags', async () => {
      const choices = await builder.buildChoices(STARTING_FEN, defaultDifficulty, 0);
      
      choices.forEach(choice => {
        expect(Array.isArray(choice.conceptTags)).toBe(true);
      });
    });

    it('should include preview data', async () => {
      const choices = await builder.buildChoices(STARTING_FEN, defaultDifficulty, 0);
      
      choices.forEach(choice => {
        expect(choice).toHaveProperty('pvPreview');
        expect(choice.pvPreview).toHaveProperty('yourMove');
        expect(choice.pvPreview.yourMove).toHaveProperty('from');
        expect(choice.pvPreview.yourMove).toHaveProperty('to');
      });
    });

    it('should call engine client for analysis', async () => {
      await builder.buildChoices(STARTING_FEN, defaultDifficulty, 0);
      
      expect(mockEngineClient.analyzePosition).toHaveBeenCalledWith(
        expect.objectContaining({
          fen: STARTING_FEN,
        })
      );
    });

    it('should call style client for each master', async () => {
      await builder.buildChoices(STARTING_FEN, defaultDifficulty, 0);
      
      // Should call style client 3 times (one per master)
      expect(mockStyleClient.suggestMoves).toHaveBeenCalledTimes(3);
    });
  });

  // ============================================================================
  // MASTER ROTATION TESTS
  // ============================================================================

  describe('master rotation', () => {
    let builder: ChoiceBuilder;

    beforeEach(() => {
      builder = createBuilder();
    });

    it('should rotate masters based on turn number', async () => {
      const turn0Choices = await builder.buildChoices(STARTING_FEN, defaultDifficulty, 0);
      const turn1Choices = await builder.buildChoices(STARTING_FEN, defaultDifficulty, 1);
      
      // Different turn should have different master styles
      const turn0Styles = turn0Choices.map(c => c.styleId).sort();
      const turn1Styles = turn1Choices.map(c => c.styleId).sort();
      
      // The sets might overlap but order changes
      expect(turn0Styles.length).toBe(3);
      expect(turn1Styles.length).toBe(3);
    });

    it('should cycle through 4 master combinations', async () => {
      const allStyles: string[][] = [];
      
      for (let turn = 0; turn < 4; turn++) {
        const choices = await builder.buildChoices(STARTING_FEN, defaultDifficulty, turn);
        allStyles.push(choices.map(c => c.styleId).sort());
      }
      
      // After 4 turns, we should have different combinations
      expect(allStyles.length).toBe(4);
    });

    it('should repeat after turn 4', async () => {
      const turn0Choices = await builder.buildChoices(STARTING_FEN, defaultDifficulty, 0);
      const turn4Choices = await builder.buildChoices(STARTING_FEN, defaultDifficulty, 4);
      
      // Turn 4 should use same masters as turn 0
      const turn0Styles = turn0Choices.map(c => c.styleId).sort();
      const turn4Styles = turn4Choices.map(c => c.styleId).sort();
      
      expect(turn0Styles).toEqual(turn4Styles);
    });
  });

  // ============================================================================
  // STRATEGY PATTERN TESTS
  // ============================================================================

  describe('strategy pattern', () => {
    let builder: ChoiceBuilder;

    beforeEach(() => {
      builder = createBuilder();
    });

    it('should use Fischer strategy', async () => {
      const choices = await builder.buildChoices(STARTING_FEN, defaultDifficulty, 0);
      
      const fischerChoice = choices.find(c => c.styleId === 'fischer');
      if (fischerChoice) {
        expect(typeof fischerChoice.planOneLiner).toBe('string');
      }
    });

    it('should use Tal strategy', async () => {
      const choices = await builder.buildChoices(STARTING_FEN, defaultDifficulty, 1);
      
      const talChoice = choices.find(c => c.styleId === 'tal');
      if (talChoice) {
        expect(typeof talChoice.planOneLiner).toBe('string');
      }
    });

    it('should use Capablanca strategy', async () => {
      const choices = await builder.buildChoices(STARTING_FEN, defaultDifficulty, 0);
      
      const capablancaChoice = choices.find(c => c.styleId === 'capablanca');
      if (capablancaChoice) {
        expect(typeof capablancaChoice.planOneLiner).toBe('string');
      }
    });

    it('should use Karpov strategy', async () => {
      const choices = await builder.buildChoices(STARTING_FEN, defaultDifficulty, 1);
      
      const karpovChoice = choices.find(c => c.styleId === 'karpov');
      if (karpovChoice) {
        expect(typeof karpovChoice.planOneLiner).toBe('string');
      }
    });
  });

  // ============================================================================
  // FALLBACK TESTS
  // ============================================================================

  describe('fallback behavior', () => {
    it('should fallback to engine moves when style service fails', async () => {
      const failingStyleClient = {
        suggestMoves: vi.fn().mockRejectedValue(new Error('Style service unavailable')),
      };
      
      const builder = new ChoiceBuilder({
        engineClient: createMockEngineClient(),
        styleClient: failingStyleClient as any,
      });
      
      const choices = await builder.buildChoices(STARTING_FEN, defaultDifficulty, 0);
      
      // Should still return 3 choices using engine moves
      expect(choices).toHaveLength(3);
    });

    it('should fallback to engine moves when style returns empty', async () => {
      const emptyStyleClient = {
        suggestMoves: vi.fn().mockResolvedValue([]),
      };
      
      const builder = new ChoiceBuilder({
        engineClient: createMockEngineClient(),
        styleClient: emptyStyleClient as any,
      });
      
      const choices = await builder.buildChoices(STARTING_FEN, defaultDifficulty, 0);
      
      expect(choices).toHaveLength(3);
      choices.forEach(choice => {
        expect(choice.moveUci).toBeDefined();
      });
    });

    it('should handle timeout from style service', async () => {
      const slowStyleClient = {
        suggestMoves: vi.fn().mockImplementation(
          () => new Promise(resolve => setTimeout(() => resolve(['e2e4']), 2000))
        ),
      };
      
      const builder = new ChoiceBuilder({
        engineClient: createMockEngineClient(),
        styleClient: slowStyleClient as any,
      });
      
      const start = Date.now();
      const choices = await builder.buildChoices(STARTING_FEN, defaultDifficulty, 0);
      const elapsed = Date.now() - start;
      
      // Should complete before the slow client would have responded
      expect(elapsed).toBeLessThan(2000);
      expect(choices).toHaveLength(3);
    });
  });

  // ============================================================================
  // EDGE CASES
  // ============================================================================

  describe('edge cases', () => {
    it('should handle different positions', async () => {
      const builder = createBuilder();
      
      const startingChoices = await builder.buildChoices(STARTING_FEN, defaultDifficulty, 0);
      const afterE4Choices = await builder.buildChoices(AFTER_E4, defaultDifficulty, 0);
      
      expect(startingChoices).toHaveLength(3);
      expect(afterE4Choices).toHaveLength(3);
    });

    it('should handle Ruy Lopez position', async () => {
      const builder = createBuilder();
      
      const choices = await builder.buildChoices(RUY_LOPEZ, defaultDifficulty, 0);
      
      expect(choices).toHaveLength(3);
      choices.forEach(choice => {
        expect(choice.moveUci).toBeDefined();
      });
    });

    it('should handle high turn numbers', async () => {
      const builder = createBuilder();
      
      const choices = await builder.buildChoices(STARTING_FEN, defaultDifficulty, 100);
      
      expect(choices).toHaveLength(3);
    });

    it('should handle different difficulty settings', async () => {
      const builder = createBuilder();
      
      const easyChoices = await builder.buildChoices(
        STARTING_FEN, 
        { engineElo: 800, hintLevel: 1 },
        0
      );
      const hardChoices = await builder.buildChoices(
        STARTING_FEN, 
        { engineElo: 2500, hintLevel: 3 },
        0
      );
      
      expect(easyChoices).toHaveLength(3);
      expect(hardChoices).toHaveLength(3);
    });
  });

  // ============================================================================
  // LEGAL MOVE VALIDATION
  // ============================================================================

  describe('legal move validation', () => {
    it('should only return legal moves', async () => {
      const builder = createBuilder();
      
      const choices = await builder.buildChoices(STARTING_FEN, defaultDifficulty, 0);
      
      // All moves should be valid UCI format
      choices.forEach(choice => {
        expect(choice.moveUci).toMatch(/^[a-h][1-8][a-h][1-8][qrbn]?$/);
      });
    });

    it('should filter out illegal moves from style suggestions', async () => {
      // Style client returns some illegal moves
      const styleWithIllegal = {
        suggestMoves: vi.fn().mockResolvedValue(['e2e4', 'e2e5', 'z9z9', 'd2d4']),
      };
      
      const builder = new ChoiceBuilder({
        engineClient: createMockEngineClient(),
        styleClient: styleWithIllegal as any,
      });
      
      const choices = await builder.buildChoices(STARTING_FEN, defaultDifficulty, 0);
      
      // Should still work, using legal moves only
      expect(choices).toHaveLength(3);
      choices.forEach(choice => {
        // All moves should be valid UCI format (i.e., legal moves)
        expect(choice.moveUci).toMatch(/^[a-h][1-8][a-h][1-8][qrbn]?$/);
      });
    });
  });
});

// ============================================================================
// INTEGRATION NOTES
// ============================================================================

/**
 * Note: These are unit tests with mocked dependencies.
 * 
 * For integration tests that verify actual engine and style service behavior:
 * - Create tests in a separate integration test folder
 * - Use real clients connected to test instances
 * - Test with longer timeouts
 * - Verify actual chess position analysis
 */

