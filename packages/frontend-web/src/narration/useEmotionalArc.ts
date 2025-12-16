/**
 * Emotional Arc React Hook
 * Tracks emotional trajectory across a game session
 */

import { useState, useCallback, useMemo } from 'react';
import { 
  EmotionalArc, 
  EmotionalPoint,
  ArcPattern,
  createEmotionalArc, 
  addEmotionalPoint,
  getArcNarrativeModifier 
} from './emotionalArc';

export interface UseEmotionalArcReturn {
  /** Current emotional arc state */
  arc: EmotionalArc;
  
  /** Add a new emotional point from a move */
  recordMove: (
    moveNumber: number,
    evalDelta: number,
    severity: EmotionalPoint['severity']
  ) => void;
  
  /** Current arc pattern */
  pattern: ArcPattern;
  
  /** Narrative modifier based on arc */
  narrativeModifier: string;
  
  /** Current momentum (-1 to 1) */
  momentum: number;
  
  /** Current streak info */
  streak: { count: number; type: 'positive' | 'negative' | 'neutral' };
  
  /** Reset for new game */
  reset: () => void;
}

export const useEmotionalArc = (): UseEmotionalArcReturn => {
  const [arc, setArc] = useState<EmotionalArc>(createEmotionalArc);
  
  const recordMove = useCallback((
    moveNumber: number,
    evalDelta: number,
    severity: EmotionalPoint['severity']
  ) => {
    setArc(currentArc => addEmotionalPoint(currentArc, moveNumber, evalDelta, severity));
  }, []);
  
  const reset = useCallback(() => {
    setArc(createEmotionalArc());
  }, []);
  
  const narrativeModifier = useMemo(() => 
    getArcNarrativeModifier(arc), 
    [arc]
  );
  
  const streak = useMemo(() => ({
    count: arc.streakCount,
    type: arc.streakType,
  }), [arc.streakCount, arc.streakType]);
  
  return {
    arc,
    recordMove,
    pattern: arc.currentPattern,
    narrativeModifier,
    momentum: arc.momentum,
    streak,
    reset,
  };
};

export default useEmotionalArc;


