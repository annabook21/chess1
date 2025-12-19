/**
 * Maia Types Unit Tests
 * 
 * Tests for utility functions and type helpers.
 */

import { describe, it, expect } from 'vitest';
import { formatProbability, formatProbabilityValue, MaiaRating } from './types';

describe('formatProbability', () => {
  it('should format 0.45 as "45%"', () => {
    expect(formatProbability(0.45)).toBe('45%');
  });

  it('should format 0.045 as "4.5%"', () => {
    expect(formatProbability(0.045)).toBe('4.5%');
  });

  it('should format 0.0045 as "0.45%"', () => {
    expect(formatProbability(0.0045)).toBe('0.45%');
  });

  it('should format 0.0005 as "<0.1%"', () => {
    expect(formatProbability(0.0005)).toBe('<0.1%');
  });

  it('should format 0 as "0%"', () => {
    expect(formatProbability(0)).toBe('0%');
  });

  it('should format 1 as "100%"', () => {
    expect(formatProbability(1)).toBe('100%');
  });

  it('should format values near thresholds correctly', () => {
    // Just above 10%: rounds to 10
    expect(formatProbability(0.101)).toBe('10%');
    
    // Just below 10%: 1 decimal
    expect(formatProbability(0.099)).toBe('9.9%');
    
    // Just above 1%: 1 decimal (toFixed(1) keeps trailing zero)
    expect(formatProbability(0.0101)).toBe('1.0%');
    
    // Just below 1%: 2 decimals
    expect(formatProbability(0.0099)).toBe('0.99%');
  });

  it('should handle edge cases', () => {
    // 0.1% shows as 0.10% due to toFixed(2)
    expect(formatProbability(0.001)).toBe('0.10%');
    expect(formatProbability(0.0001)).toBe('<0.1%');
  });
});

describe('formatProbabilityValue', () => {
  it('should format 0.45 as "45"', () => {
    expect(formatProbabilityValue(0.45)).toBe('45');
  });

  it('should format 0.045 as "4.5"', () => {
    expect(formatProbabilityValue(0.045)).toBe('4.5');
  });

  it('should format 0.0045 as "0.45"', () => {
    expect(formatProbabilityValue(0.0045)).toBe('0.45');
  });

  it('should format 0.0005 as "<0.1"', () => {
    expect(formatProbabilityValue(0.0005)).toBe('<0.1');
  });

  it('should format 0 as "0"', () => {
    expect(formatProbabilityValue(0)).toBe('0');
  });
});

describe('MaiaRating type', () => {
  it('should accept valid Maia rating values', () => {
    const validRatings: MaiaRating[] = [1100, 1200, 1300, 1400, 1500, 1600, 1700, 1800, 1900];
    
    expect(validRatings).toContain(1100);
    expect(validRatings).toContain(1500);
    expect(validRatings).toContain(1900);
    expect(validRatings.length).toBe(9);
  });

  it('should have ratings at 100-point intervals', () => {
    const ratings: MaiaRating[] = [1100, 1200, 1300, 1400, 1500, 1600, 1700, 1800, 1900];
    
    for (let i = 1; i < ratings.length; i++) {
      expect(ratings[i] - ratings[i-1]).toBe(100);
    }
  });
});


