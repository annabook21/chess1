/**
 * Maia Sampling Unit Tests
 * 
 * Tests for move sampling with temperature control.
 * Ensures human-like move selection works correctly.
 */

import { describe, it, expect } from 'vitest';
import { sampleMove, TEMPERATURE_PRESETS, type MovePrediction } from './sampling';

describe('sampleMove', () => {
  const mockPredictions: MovePrediction[] = [
    { uci: 'e2e4', san: 'e4', probability: 0.4, from: 'e2', to: 'e4' },
    { uci: 'd2d4', san: 'd4', probability: 0.3, from: 'd2', to: 'd4' },
    { uci: 'c2c4', san: 'c4', probability: 0.2, from: 'c2', to: 'c4' },
    { uci: 'g1f3', san: 'Nf3', probability: 0.1, from: 'g1', to: 'f3' },
  ];

  describe('empty input', () => {
    it('should return null for empty predictions', () => {
      expect(sampleMove([], 1.0)).toBeNull();
    });

    it('should handle undefined predictions gracefully', () => {
      // The function may throw or return null depending on implementation
      // We just verify it doesn't crash unexpectedly
      try {
        const result = sampleMove(undefined as any, 1.0);
        expect(result === null || result === undefined).toBe(true);
      } catch (e) {
        // It's acceptable to throw for invalid input
        expect(e).toBeInstanceOf(Error);
      }
    });
  });

  describe('temperature = 0 (greedy)', () => {
    it('should always return the top move', () => {
      for (let i = 0; i < 50; i++) {
        const result = sampleMove(mockPredictions, 0);
        expect(result?.uci).toBe('e2e4');
      }
    });

    it('should work with single prediction', () => {
      const single = [mockPredictions[0]];
      const result = sampleMove(single, 0);
      expect(result?.uci).toBe('e2e4');
    });
  });

  describe('temperature = 1 (realistic)', () => {
    it('should return a valid prediction', () => {
      const result = sampleMove(mockPredictions, 1.0);
      expect(result).not.toBeNull();
      expect(mockPredictions.map(p => p.uci)).toContain(result?.uci);
    });

    it('should sample probabilistically over many trials', () => {
      const counts: Record<string, number> = {};
      const trials = 1000;

      for (let i = 0; i < trials; i++) {
        const result = sampleMove(mockPredictions, 1.0);
        if (result) {
          counts[result.uci] = (counts[result.uci] || 0) + 1;
        }
      }

      // e2e4 (40%) should be picked more than g1f3 (10%)
      expect(counts['e2e4']).toBeGreaterThan(counts['g1f3']);
      
      // All moves should be sampled at least once in 1000 trials
      expect(Object.keys(counts).length).toBe(4);
    });
  });

  describe('high temperature (> 1)', () => {
    it('should flatten the distribution', () => {
      const counts: Record<string, number> = {};
      const trials = 1000;

      for (let i = 0; i < trials; i++) {
        const result = sampleMove(mockPredictions, 2.0);
        if (result) {
          counts[result.uci] = (counts[result.uci] || 0) + 1;
        }
      }

      // With high temperature, distribution should be more uniform
      // The ratio between most and least common should be smaller
      const values = Object.values(counts);
      const max = Math.max(...values);
      const min = Math.min(...values);
      const ratio = max / min;

      // With temp=2, ratio should be closer to 1 than with temp=1
      expect(ratio).toBeLessThan(4); // Original ratio is 4:1
    });
  });

  describe('low temperature (< 1)', () => {
    it('should sharpen the distribution', () => {
      const counts: Record<string, number> = {};
      const trials = 1000;

      for (let i = 0; i < trials; i++) {
        const result = sampleMove(mockPredictions, 0.5);
        if (result) {
          counts[result.uci] = (counts[result.uci] || 0) + 1;
        }
      }

      // Top move should be selected even more frequently
      expect(counts['e2e4']).toBeGreaterThan(trials * 0.5);
    });
  });

  describe('edge cases', () => {
    it('should handle very small probabilities', () => {
      const tinyProbs: MovePrediction[] = [
        { uci: 'e2e4', san: 'e4', probability: 0.0001, from: 'e2', to: 'e4' },
        { uci: 'd2d4', san: 'd4', probability: 0.00001, from: 'd2', to: 'd4' },
      ];

      const result = sampleMove(tinyProbs, 1.0);
      expect(result).not.toBeNull();
    });

    it('should handle zero probabilities', () => {
      const zeroProbs: MovePrediction[] = [
        { uci: 'e2e4', san: 'e4', probability: 0, from: 'e2', to: 'e4' },
        { uci: 'd2d4', san: 'd4', probability: 0.1, from: 'd2', to: 'd4' },
      ];

      // Should still work, picking the non-zero probability move
      const result = sampleMove(zeroProbs, 1.0);
      expect(result?.uci).toBe('d2d4');
    });

    it('should handle all-zero probabilities', () => {
      const allZero: MovePrediction[] = [
        { uci: 'e2e4', san: 'e4', probability: 0, from: 'e2', to: 'e4' },
        { uci: 'd2d4', san: 'd4', probability: 0, from: 'd2', to: 'd4' },
      ];

      const result = sampleMove(allZero, 1.0);
      // Implementation dependent - could return null, first move, or any move (uniform sampling)
      if (result !== null) {
        // If a result is returned, it should be one of the input moves
        const validUcis = allZero.map(p => p.uci);
        expect(validUcis).toContain(result.uci);
      }
      // Either null or a valid move is acceptable
      expect(result === null || typeof result.uci === 'string').toBe(true);
    });

    it('should handle equal probabilities', () => {
      const equal: MovePrediction[] = [
        { uci: 'e2e4', san: 'e4', probability: 0.25, from: 'e2', to: 'e4' },
        { uci: 'd2d4', san: 'd4', probability: 0.25, from: 'd2', to: 'd4' },
        { uci: 'c2c4', san: 'c4', probability: 0.25, from: 'c2', to: 'c4' },
        { uci: 'g1f3', san: 'Nf3', probability: 0.25, from: 'g1', to: 'f3' },
      ];

      const counts: Record<string, number> = {};
      const trials = 1000;

      for (let i = 0; i < trials; i++) {
        const result = sampleMove(equal, 1.0);
        if (result) {
          counts[result.uci] = (counts[result.uci] || 0) + 1;
        }
      }

      // All should be roughly equal (within margin of error)
      const values = Object.values(counts);
      values.forEach(count => {
        expect(count).toBeGreaterThan(trials * 0.15); // At least 15%
        expect(count).toBeLessThan(trials * 0.35);    // At most 35%
      });
    });
  });
});

describe('TEMPERATURE_PRESETS', () => {
  it('should have deterministic preset near 0', () => {
    expect(TEMPERATURE_PRESETS.deterministic).toBeLessThan(0.5);
  });

  it('should have realistic preset = 1', () => {
    expect(TEMPERATURE_PRESETS.realistic).toBe(1);
  });

  it('should have exploratory preset > 1', () => {
    expect(TEMPERATURE_PRESETS.exploratory).toBeGreaterThan(1);
  });

  it('should have random preset > exploratory', () => {
    expect(TEMPERATURE_PRESETS.random).toBeGreaterThan(TEMPERATURE_PRESETS.exploratory);
  });

  it('should have all presets be non-negative', () => {
    Object.values(TEMPERATURE_PRESETS).forEach(temp => {
      expect(temp).toBeGreaterThanOrEqual(0);
    });
  });
});
