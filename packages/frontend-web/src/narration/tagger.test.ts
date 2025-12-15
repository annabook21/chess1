/**
 * Tagger Unit Tests
 */

import { describe, it, expect } from 'vitest';
import { tagMove, calcEvalDelta, getSeverity, TaggerInput } from './tagger';

describe('calcEvalDelta', () => {
  it('should calculate positive delta for improving position', () => {
    expect(calcEvalDelta(0, 100, true)).toBe(100);
  });

  it('should calculate negative delta for worsening position', () => {
    expect(calcEvalDelta(100, -100, true)).toBe(-200);
  });

  it('should flip perspective for opponent moves', () => {
    expect(calcEvalDelta(0, 100, false)).toBe(-100);
  });
});

describe('getSeverity', () => {
  it('should return great for large positive delta', () => {
    expect(getSeverity(200)).toBe('great');
  });

  it('should return good for moderate positive delta', () => {
    expect(getSeverity(75)).toBe('good');
  });

  it('should return neutral for small delta', () => {
    expect(getSeverity(10)).toBe('neutral');
  });

  it('should return bad for moderate negative delta', () => {
    expect(getSeverity(-150)).toBe('bad');
  });

  it('should return terrible for large negative delta', () => {
    expect(getSeverity(-300)).toBe('terrible');
  });
});

describe('tagMove', () => {
  const baseInput: TaggerInput = {
    evalBefore: 0,
    evalAfter: 0,
    isCapture: false,
    isCheck: false,
    isMate: false,
    pieceType: 'n',
    fromSquare: 'g1',
    toSquare: 'f3',
    isPlayerMove: true,
    moveNumber: 5,
  };

  it('should tag a blunder that hangs a piece', () => {
    const input: TaggerInput = {
      ...baseInput,
      evalBefore: 0,
      evalAfter: -350,
      isCapture: true,
    };
    
    const result = tagMove(input);
    
    expect(result.primaryTag).toBe('BLUNDER_HANGS_PIECE');
    expect(result.severity).toBe('terrible');
    expect(result.evalDelta).toBe(-350);
  });

  it('should tag a brilliant move', () => {
    const input: TaggerInput = {
      ...baseInput,
      evalBefore: 0,
      evalAfter: 400,
    };
    
    const result = tagMove(input);
    
    expect(result.primaryTag).toBe('FOUND_BRILLIANT_MOVE');
    expect(result.severity).toBe('great');
  });

  it('should tag a fork tactic from concept tags', () => {
    const input: TaggerInput = {
      ...baseInput,
      evalBefore: 0,
      evalAfter: 200,
      conceptTags: ['fork'],
    };
    
    const result = tagMove(input);
    
    expect(result.primaryTag).toBe('TACTIC_FORK');
  });

  it('should include secondary tags for checks', () => {
    const input: TaggerInput = {
      ...baseInput,
      isCheck: true,
    };
    
    const result = tagMove(input);
    
    expect(result.secondaryTags).toContain('KING_SAFETY_CRACKED');
  });

  it('should tag mate as brilliant or blunder based on who delivers it', () => {
    const winningMate: TaggerInput = {
      ...baseInput,
      isMate: true,
      evalBefore: 500,
      evalAfter: 10000,
    };
    
    expect(tagMove(winningMate).primaryTag).toBe('FOUND_BRILLIANT_MOVE');
    
    const losingMate: TaggerInput = {
      ...baseInput,
      isMate: true,
      evalBefore: 0,
      evalAfter: -10000,
    };
    
    expect(tagMove(losingMate).primaryTag).toBe('BLUNDER_HANGS_MATE');
  });
});
