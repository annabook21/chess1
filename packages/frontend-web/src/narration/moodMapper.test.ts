/**
 * Mood Mapper Tests
 * Tests for tag-to-mood mapping functions
 */

import { describe, it, expect } from 'vitest';
import { 
  tagToMood, 
  taggerOutputToMood, 
  evalDeltaToIntensity,
  shouldNarrate,
  getMoodAnimation 
} from './moodMapper';
import { TaggerOutput, NarrationTag } from './types';

describe('tagToMood', () => {
  it('maps blunder tags to dismayed mood', () => {
    expect(tagToMood('BLUNDER_HANGS_PIECE')).toBe('dismayed');
    expect(tagToMood('BLUNDER_HANGS_MATE')).toBe('dismayed');
    expect(tagToMood('BLUNDER_POSITIONAL')).toBe('dismayed');
  });

  it('maps mistake tags to concerned mood', () => {
    expect(tagToMood('MISTAKE_MISSED_TACTIC')).toBe('concerned');
    expect(tagToMood('INACCURACY_SUBOPTIMAL')).toBe('concerned');
  });

  it('maps brilliant/mate moves to impressed mood', () => {
    expect(tagToMood('FOUND_BRILLIANT_MOVE')).toBe('impressed');
    expect(tagToMood('FOUND_MATE_THREAT')).toBe('impressed');
    expect(tagToMood('FOUND_TACTIC')).toBe('impressed');
  });

  it('maps best/only moves to pleased mood', () => {
    expect(tagToMood('FOUND_BEST_MOVE')).toBe('pleased');
    expect(tagToMood('FOUND_ONLY_MOVE')).toBe('pleased');
  });

  it('maps tactical themes to excited mood', () => {
    expect(tagToMood('TACTIC_FORK')).toBe('excited');
    expect(tagToMood('TACTIC_PIN')).toBe('excited');
    expect(tagToMood('TACTIC_SKEWER')).toBe('excited');
    expect(tagToMood('TACTIC_DISCOVERY')).toBe('excited');
  });

  it('maps positional themes to thinking mood', () => {
    expect(tagToMood('POS_IMPROVE_WORST_PIECE')).toBe('thinking');
    expect(tagToMood('POS_CONTROL_CENTER')).toBe('thinking');
    expect(tagToMood('POS_KING_SAFETY')).toBe('thinking');
  });

  it('maps prediction outcomes correctly', () => {
    expect(tagToMood('PREDICTION_CORRECT')).toBe('excited');
    expect(tagToMood('PREDICTION_WRONG')).toBe('concerned');
    expect(tagToMood('PREDICTION_CLOSE')).toBe('thinking');
  });

  it('returns neutral for unknown tags', () => {
    // Cast to test unknown tag handling
    expect(tagToMood('UNKNOWN_TAG' as NarrationTag)).toBe('neutral');
  });
});

describe('taggerOutputToMood', () => {
  const createOutput = (
    severity: TaggerOutput['severity'],
    tag: NarrationTag
  ): TaggerOutput => ({
    primaryTag: tag,
    secondaryTags: [],
    evalDelta: 0,
    severity,
  });

  it('prioritizes terrible severity as dismayed', () => {
    const output = createOutput('terrible', 'FOUND_BEST_MOVE');
    expect(taggerOutputToMood(output)).toBe('dismayed');
  });

  it('prioritizes bad severity as concerned', () => {
    const output = createOutput('bad', 'FOUND_BEST_MOVE');
    expect(taggerOutputToMood(output)).toBe('concerned');
  });

  it('prioritizes great severity as impressed', () => {
    const output = createOutput('great', 'BLUNDER_HANGS_PIECE');
    expect(taggerOutputToMood(output)).toBe('impressed');
  });

  it('prioritizes good severity as pleased', () => {
    const output = createOutput('good', 'BLUNDER_HANGS_PIECE');
    expect(taggerOutputToMood(output)).toBe('pleased');
  });

  it('falls back to tag-based mood for neutral severity', () => {
    const output = createOutput('neutral', 'TACTIC_FORK');
    expect(taggerOutputToMood(output)).toBe('excited');
  });
});

describe('evalDeltaToIntensity', () => {
  it('returns maximum intensity for huge swings', () => {
    expect(evalDeltaToIntensity(300)).toBe(1.0);
    expect(evalDeltaToIntensity(-300)).toBe(1.0);
    expect(evalDeltaToIntensity(500)).toBe(1.0);
  });

  it('returns high intensity for major swings', () => {
    expect(evalDeltaToIntensity(200)).toBe(0.85);
    expect(evalDeltaToIntensity(-250)).toBe(0.85);
  });

  it('returns medium intensity for significant swings', () => {
    expect(evalDeltaToIntensity(100)).toBe(0.7);
    expect(evalDeltaToIntensity(-150)).toBe(0.7);
  });

  it('returns low intensity for minor swings', () => {
    expect(evalDeltaToIntensity(50)).toBe(0.5);
    expect(evalDeltaToIntensity(20)).toBe(0.3);
  });

  it('returns minimal intensity for negligible swings', () => {
    expect(evalDeltaToIntensity(10)).toBe(0.1);
    expect(evalDeltaToIntensity(0)).toBe(0.1);
  });
});

describe('shouldNarrate', () => {
  const createOutput = (
    severity: TaggerOutput['severity'],
    tag: NarrationTag
  ): TaggerOutput => ({
    primaryTag: tag,
    secondaryTags: [],
    evalDelta: 0,
    severity,
  });

  it('always narrates significant moves', () => {
    expect(shouldNarrate(createOutput('great', 'FOUND_BEST_MOVE'))).toBe(true);
    expect(shouldNarrate(createOutput('terrible', 'BLUNDER_HANGS_PIECE'))).toBe(true);
    expect(shouldNarrate(createOutput('good', 'FOUND_TACTIC'))).toBe(true);
    expect(shouldNarrate(createOutput('bad', 'MISTAKE_MISSED_TACTIC'))).toBe(true);
  });

  it('always narrates tactics', () => {
    expect(shouldNarrate(createOutput('neutral', 'TACTIC_FORK'))).toBe(true);
    expect(shouldNarrate(createOutput('neutral', 'TACTIC_PIN'))).toBe(true);
  });

  it('always narrates blunders and great finds', () => {
    expect(shouldNarrate(createOutput('neutral', 'BLUNDER_HANGS_PIECE'))).toBe(true);
    expect(shouldNarrate(createOutput('neutral', 'FOUND_BRILLIANT_MOVE'))).toBe(true);
  });

  it('always narrates predictions', () => {
    expect(shouldNarrate(createOutput('neutral', 'PREDICTION_CORRECT'))).toBe(true);
    expect(shouldNarrate(createOutput('neutral', 'PREDICTION_WRONG'))).toBe(true);
  });
});

describe('getMoodAnimation', () => {
  it('returns correct animation class for each mood', () => {
    expect(getMoodAnimation('impressed')).toBe('glow');
    expect(getMoodAnimation('excited')).toBe('glow');
    expect(getMoodAnimation('dismayed')).toBe('shake');
    expect(getMoodAnimation('concerned')).toBe('worry');
    expect(getMoodAnimation('pleased')).toBe('nod');
    expect(getMoodAnimation('thinking')).toBe('ponder');
    expect(getMoodAnimation('neutral')).toBe('idle');
  });
});



