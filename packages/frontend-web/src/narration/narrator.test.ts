/**
 * Narrator Unit Tests
 */

import { describe, it, expect } from 'vitest';
import { narrate, narratePrediction, NarrationContext, TaggerOutput } from './index';

describe('narrate', () => {
  const mockTaggerOutput: TaggerOutput = {
    primaryTag: 'FOUND_BEST_MOVE',
    secondaryTags: [],
    evalDelta: 50,
    severity: 'good',
  };

  const mockContext: NarrationContext = {
    tags: mockTaggerOutput,
    input: {
      evalBefore: 0,
      evalAfter: 50,
      isCapture: false,
      isCheck: false,
      isMate: false,
      pieceType: 'n',
      fromSquare: 'g1',
      toSquare: 'f3',
      isPlayerMove: true,
      moveNumber: 3,
    },
    gameId: 'test-game-123',
    turnNumber: 3,
    playerColor: 'white',
    tone: 'gothic',
  };

  it('should return a narration result', () => {
    const result = narrate(mockContext);
    
    expect(result).toHaveProperty('text');
    expect(result).toHaveProperty('tag');
    expect(result).toHaveProperty('tone');
    expect(result.text.length).toBeGreaterThan(0);
  });

  it('should interpolate piece names correctly', () => {
    const result = narrate(mockContext);
    
    // Should not contain raw placeholders
    expect(result.text).not.toContain('{piece}');
    expect(result.text).not.toContain('{square}');
  });

  it('should return deterministic results for same seed', () => {
    const result1 = narrate(mockContext);
    const result2 = narrate(mockContext);
    
    expect(result1.templateId).toBe(result2.templateId);
  });

  it('should use fallback when no template exists', () => {
    const contextWithRareTag: NarrationContext = {
      ...mockContext,
      tags: {
        ...mockTaggerOutput,
        primaryTag: 'ENDGAME_CONVERSION',
        secondaryTags: [],
      },
    };
    
    const result = narrate(contextWithRareTag);
    
    // Should still return something
    expect(result.text.length).toBeGreaterThan(0);
  });
});

describe('narratePrediction', () => {
  it('should return celebratory text for correct predictions', () => {
    const result = narratePrediction(true, 'e4', 'e4', 1);
    
    expect(result).toContain('Correct');
    expect(result).toContain('e4');
  });

  it('should return special text for prediction streaks', () => {
    const result = narratePrediction(true, 'e4', 'e4', 5);
    
    expect(result).toContain('FIVE');
  });

  it('should explain incorrect predictions', () => {
    const result = narratePrediction(false, 'e4', 'd4', 0);
    
    expect(result).toContain('e4');
    expect(result).toContain('d4');
  });
});


