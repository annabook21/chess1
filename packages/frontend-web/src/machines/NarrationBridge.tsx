/**
 * Narration Bridge
 * 
 * Connects XState game machine events to the narration system.
 * Triggers narration when appropriate state transitions occur.
 * 
 * Note: This is a placeholder for Phase 4 of the migration.
 * Full integration requires passing TaggerInput from the pendingMove context
 * which includes move details not available in MoveFeedback alone.
 */

import React, { useEffect, useRef } from 'react';
import { useOptionalGameMachine } from './GameProvider';
import { useNarration } from '../hooks/useNarration';

interface NarrationBridgeProps {
  children: React.ReactNode;
}

/**
 * Bridge component that connects game machine to narration
 * 
 * Listens for feedback changes and triggers appropriate narration.
 * The actual narration logic remains in App.tsx for now and will be
 * migrated in a later phase when full TaggerInput data is available
 * in the machine context.
 */
export function NarrationBridge({ children }: NarrationBridgeProps) {
  const machine = useOptionalGameMachine();
  const prevFeedbackRef = useRef<any>(null);
  
  // Get narration hook (using gameId from machine if available)
  const gameId = machine?.context.gameId || 'new-game';
  const { showNarration, narratePredictionResult, getWelcomeNarration } = useNarration(gameId);
  
  // Show welcome narration when game starts
  useEffect(() => {
    if (!machine) return;
    
    const { gamePhase } = machine;
    
    // When transitioning from loading to playing, show welcome
    if (gamePhase === 'playing' && machine.context.moveCounter === 1 && !machine.context.feedback) {
      getWelcomeNarration();
    }
  }, [machine?.gamePhase, machine?.context.moveCounter, getWelcomeNarration]);
  
  // Watch for prediction results
  useEffect(() => {
    if (!machine) return;
    
    const { context } = machine;
    const { predictionResult, predictionStats } = context;
    
    if (predictionResult && predictionResult !== prevFeedbackRef.current) {
      prevFeedbackRef.current = predictionResult;
      
      narratePredictionResult(
        predictionResult.correct,
        predictionResult.predicted,
        predictionResult.actual,
        predictionStats.streak
      );
    }
  }, [machine?.context.predictionResult, narratePredictionResult]);
  
  return <>{children}</>;
}
