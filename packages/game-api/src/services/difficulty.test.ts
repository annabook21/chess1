/**
 * Difficulty Service Tests
 * 
 * Tests pure functions for difficulty calculation.
 * Based on the actual implementation in difficulty.ts.
 */

import { describe, it, expect } from 'vitest';
import { calculateDifficulty, calculateTimeBudget, DifficultyParams } from './difficulty';

describe('calculateDifficulty', () => {
  describe('engineElo calculation', () => {
    it('should set engine ELO 100 points above user ELO', () => {
      const result = calculateDifficulty(1200);
      expect(result.engineElo).toBe(1300);
    });

    it('should cap engine ELO at 3000 maximum', () => {
      const result = calculateDifficulty(3000);
      expect(result.engineElo).toBe(3000); // 3000 + 100 = 3100, but capped at 3000
    });

    it('should enforce minimum engine ELO of 800', () => {
      const result = calculateDifficulty(600);
      expect(result.engineElo).toBe(800); // 600 + 100 = 700, but min is 800
    });

    it('should handle edge case at lower boundary', () => {
      const result = calculateDifficulty(700);
      expect(result.engineElo).toBe(800); // 700 + 100 = 800, exactly at min
    });

    it('should handle intermediate ELO values', () => {
      expect(calculateDifficulty(1500).engineElo).toBe(1600);
      expect(calculateDifficulty(2000).engineElo).toBe(2100);
      expect(calculateDifficulty(2500).engineElo).toBe(2600);
    });
  });

  describe('hintLevel calculation', () => {
    it('should give maximum hints (level 3) for beginners under 1200', () => {
      expect(calculateDifficulty(800).hintLevel).toBe(3);
      expect(calculateDifficulty(1000).hintLevel).toBe(3);
      expect(calculateDifficulty(1199).hintLevel).toBe(3);
    });

    it('should give moderate hints (level 2) for intermediate players 1200-1599', () => {
      expect(calculateDifficulty(1200).hintLevel).toBe(2);
      expect(calculateDifficulty(1400).hintLevel).toBe(2);
      expect(calculateDifficulty(1599).hintLevel).toBe(2);
    });

    it('should give minimal hints (level 1) for advanced players 1600+', () => {
      expect(calculateDifficulty(1600).hintLevel).toBe(1);
      expect(calculateDifficulty(2000).hintLevel).toBe(1);
      expect(calculateDifficulty(2500).hintLevel).toBe(1);
    });
  });

  describe('return type', () => {
    it('should return DifficultyParams object with correct shape', () => {
      const result = calculateDifficulty(1500);
      
      expect(result).toHaveProperty('engineElo');
      expect(result).toHaveProperty('hintLevel');
      expect(typeof result.engineElo).toBe('number');
      expect(typeof result.hintLevel).toBe('number');
    });
  });
});

describe('calculateTimeBudget', () => {
  const beginnerDifficulty: DifficultyParams = { engineElo: 1100, hintLevel: 3 };
  const intermediateDifficulty: DifficultyParams = { engineElo: 1500, hintLevel: 2 };
  const advancedDifficulty: DifficultyParams = { engineElo: 1900, hintLevel: 1 };

  describe('base time by game phase', () => {
    it('should use 30s base time in opening (moves 1-19)', () => {
      // With hintLevel 1: 30000 * (1 + 0.1) = 33000
      const result = calculateTimeBudget(advancedDifficulty, 10);
      expect(result).toBe(33000);
    });

    it('should use 20s base time in middlegame (moves 20-39)', () => {
      // With hintLevel 1: 20000 * (1 + 0.1) = 22000
      const result = calculateTimeBudget(advancedDifficulty, 25);
      expect(result).toBe(22000);
    });

    it('should use 15s base time in endgame (moves 40+)', () => {
      // With hintLevel 1: 15000 * (1 + 0.1) = 16500
      const result = calculateTimeBudget(advancedDifficulty, 50);
      expect(result).toBe(16500);
    });
  });

  describe('hint level adjustment', () => {
    it('should increase time by 10% per hint level', () => {
      // Opening with hintLevel 3: 30000 * (1 + 0.3) = 39000
      const beginnerResult = calculateTimeBudget(beginnerDifficulty, 10);
      expect(beginnerResult).toBe(39000);

      // Opening with hintLevel 2: 30000 * (1 + 0.2) = 36000
      const intermediateResult = calculateTimeBudget(intermediateDifficulty, 10);
      expect(intermediateResult).toBe(36000);

      // Opening with hintLevel 1: 30000 * (1 + 0.1) = 33000
      const advancedResult = calculateTimeBudget(advancedDifficulty, 10);
      expect(advancedResult).toBe(33000);
    });
  });

  describe('edge cases', () => {
    it('should handle move 1', () => {
      const result = calculateTimeBudget(advancedDifficulty, 1);
      expect(result).toBe(33000); // Opening time
    });

    it('should handle boundary move 19 (last opening move)', () => {
      const result = calculateTimeBudget(advancedDifficulty, 19);
      expect(result).toBe(33000); // Still opening
    });

    it('should handle boundary move 20 (first middlegame move)', () => {
      const result = calculateTimeBudget(advancedDifficulty, 20);
      expect(result).toBe(22000); // Middlegame
    });

    it('should handle boundary move 39 (last middlegame move)', () => {
      const result = calculateTimeBudget(advancedDifficulty, 39);
      expect(result).toBe(22000); // Still middlegame
    });

    it('should handle boundary move 40 (first endgame move)', () => {
      const result = calculateTimeBudget(advancedDifficulty, 40);
      expect(result).toBe(16500); // Endgame
    });

    it('should return rounded integer', () => {
      const result = calculateTimeBudget(advancedDifficulty, 10);
      expect(Number.isInteger(result)).toBe(true);
    });
  });
});


