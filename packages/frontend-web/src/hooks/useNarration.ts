/**
 * useNarration Hook
 * Connects the narration system to game moves
 */

import { useState, useCallback, useEffect } from 'react';
import { tagMove, TaggerInput, TaggerOutput } from '../narration/tagger';
import { narrate, narratePrediction } from '../narration/narrator';
import { NarrationResult } from '../narration/types';

export type NarrationTone = 'whimsical' | 'gothic' | 'ruthless';

interface NarrationState {
  text: string;
  severity: 'neutral' | 'good' | 'great' | 'bad' | 'terrible';
  isVisible: boolean;
}

const STORAGE_KEY = 'masterAcademy_narratorTone';

export const useNarration = (gameId: string) => {
  const [narration, setNarration] = useState<NarrationState>({
    text: '',
    severity: 'neutral',
    isVisible: false,
  });
  
  const [tone, setToneState] = useState<NarrationTone>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return (saved as NarrationTone) || 'gothic';
  });

  // Persist tone preference
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, tone);
  }, [tone]);

  const setTone = useCallback((newTone: NarrationTone) => {
    setToneState(newTone);
  }, []);

  /**
   * Generate narration for a move
   */
  const narrateMove = useCallback((
    input: TaggerInput,
    turnNumber: number
  ): NarrationResult => {
    // Tag the move
    const tags: TaggerOutput = tagMove(input);
    
    // Generate narration
    const result = narrate({
      tags,
      input,
      gameId,
      turnNumber,
      playerColor: 'white', // TODO: get from game state
      tone,
    });

    // Update state
    setNarration({
      text: result.text,
      severity: tags.severity,
      isVisible: true,
    });

    return result;
  }, [gameId, tone]);

  /**
   * Generate narration for a prediction outcome
   */
  const narratePredictionResult = useCallback((
    correct: boolean,
    predictedMove: string,
    actualMove: string,
    streak: number
  ): string => {
    const text = narratePrediction(correct, predictedMove, actualMove, streak);
    
    setNarration({
      text,
      severity: correct ? 'good' : 'neutral',
      isVisible: true,
    });

    return text;
  }, []);

  /**
   * Show custom narration text
   */
  const showNarration = useCallback((
    text: string,
    severity: NarrationState['severity'] = 'neutral'
  ) => {
    setNarration({
      text,
      severity,
      isVisible: true,
    });
  }, []);

  /**
   * Hide the narration
   */
  const hideNarration = useCallback(() => {
    setNarration(prev => ({ ...prev, isVisible: false }));
  }, []);

  /**
   * Get welcome narration for game start
   */
  const getWelcomeNarration = useCallback((): string => {
    const welcomes = [
      "*Candles flicker to life* Ah, another seeker enters the castle. The spirits have been... restless.",
      "*Stone walls groan* Welcome, brave soul. The masters await your challenge.",
      "*A cold wind whispers* The castle recognizes you. Shall we begin the trials?",
      "*Dust swirls in ethereal patterns* The spirits stir. Another game... another lesson.",
    ];
    const text = welcomes[Math.floor(Math.random() * welcomes.length)];
    
    setNarration({
      text,
      severity: 'neutral',
      isVisible: true,
    });

    return text;
  }, []);

  return {
    narration,
    tone,
    setTone,
    narrateMove,
    narratePredictionResult,
    showNarration,
    hideNarration,
    getWelcomeNarration,
  };
};

export default useNarration;

