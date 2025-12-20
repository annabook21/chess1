/**
 * Maia Bridge
 * 
 * Bridges the XState game machine with the Maia neural network context.
 * Listens for state changes and triggers Maia inference when needed.
 */

import React, { useEffect, useCallback, useRef } from 'react';
import { Chess } from 'chess.js';
import { useMaiaContext, sampleMove, TEMPERATURE_PRESETS } from '../maia';
import type { MovePrediction } from '../maia';
import { useOptionalGameMachine } from './GameProvider';
import type { MaiaRating } from './types';
import { getRandomLegalMove } from './actors';

interface MaiaBridgeProps {
  children: React.ReactNode;
}

/**
 * Bridge component that connects XState to Maia
 * 
 * When the game machine enters the 'opponentTurn.generatingMove' state
 * with a human-like opponent, this component triggers Maia inference
 * and sends the result back to the machine.
 */
export function MaiaBridge({ children }: MaiaBridgeProps) {
  const machine = useOptionalGameMachine();
  const maiaContext = useMaiaContext();
  const isGeneratingRef = useRef(false);
  
  // Generate a Maia move
  const generateMaiaMove = useCallback(async (
    fen: string,
    targetRating: MaiaRating
  ): Promise<{ moveUci: string; moveSan: string; probability: number } | null> => {
    // Ensure the correct model is loaded
    if (maiaContext.state.currentModel !== targetRating) {
      try {
        await maiaContext.loadModel(targetRating);
      } catch (e) {
        console.error('[MaiaBridge] Failed to load Maia model:', e);
        return null;
      }
    }
    
    // Wait for model to be ready
    if (!maiaContext.state.isReady) {
      console.warn('[MaiaBridge] Maia not ready, using fallback');
      return null;
    }
    
    try {
      // Get predictions from Maia
      const result = await maiaContext.predict(fen);
      
      if (!result.predictions || result.predictions.length === 0) {
        console.warn('[MaiaBridge] No predictions from Maia');
        return null;
      }
      
      // Predictions from Maia are already in MovePrediction format
      const predictions = result.predictions as MovePrediction[];
      
      // Sample a move based on probability distribution (use 'realistic' temperature)
      const sampled = sampleMove(predictions, TEMPERATURE_PRESETS.realistic);
      
      if (!sampled) {
        console.warn('[MaiaBridge] Failed to sample move');
        return null;
      }
      
      // Convert UCI to SAN if not provided
      let san = sampled.san;
      if (!san) {
        try {
          const chess = new Chess(fen);
          const from = sampled.uci.slice(0, 2);
          const to = sampled.uci.slice(2, 4);
          const promotion = sampled.uci.length > 4 ? sampled.uci[4] : undefined;
          const move = chess.move({ from, to, promotion: promotion as any });
          san = move?.san || sampled.uci;
        } catch {
          san = sampled.uci;
        }
      }
      
      return {
        moveUci: sampled.uci,
        moveSan: san,
        probability: sampled.probability,
      };
    } catch (e) {
      console.error('[MaiaBridge] Maia prediction failed:', e);
      return null;
    }
  }, [maiaContext]);
  
  // Watch for opponent turn state
  useEffect(() => {
    if (!machine) return;
    
    const { state, context, onMaiaMoveReady, onMaiaMoveFailed, applyOpponentMove } = machine;
    
    // Check if we're in opponent turn with human-like opponent
    const isOpponentTurn = state.matches({ playing: { opponentTurn: 'generatingMove' } });
    const isHumanLike = context.opponentType === 'human-like';
    
    if (!isOpponentTurn || !isHumanLike || isGeneratingRef.current) {
      return;
    }
    
    // Prevent multiple generations
    isGeneratingRef.current = true;
    
    // Generate Maia move
    const currentFen = context.optimisticFen || context.fen;
    
    generateMaiaMove(currentFen, context.maiaOpponentRating)
      .then((result) => {
        if (result) {
          // Notify machine of successful move
          onMaiaMoveReady(result.moveUci, result.moveSan, result.probability);
          
          // Apply the move
          try {
            const chess = new Chess(currentFen);
            const from = result.moveUci.slice(0, 2);
            const to = result.moveUci.slice(2, 4);
            const promotion = result.moveUci.length > 4 ? result.moveUci[4] : undefined;
            chess.move({ from, to, promotion: promotion as any });
            
            applyOpponentMove(result.moveUci, result.moveSan, chess.fen());
          } catch (e) {
            console.error('[MaiaBridge] Failed to apply Maia move:', e);
            onMaiaMoveFailed(String(e));
          }
        } else {
          // Fallback to random move
          console.warn('[MaiaBridge] Using random fallback move');
          const fallback = getRandomLegalMove(currentFen);
          
          if (fallback) {
            onMaiaMoveReady(fallback.moveUci, fallback.moveSan, fallback.probability);
            
            try {
              const chess = new Chess(currentFen);
              const from = fallback.moveUci.slice(0, 2);
              const to = fallback.moveUci.slice(2, 4);
              const promotion = fallback.moveUci.length > 4 ? fallback.moveUci[4] : undefined;
              chess.move({ from, to, promotion: promotion as any });
              
              applyOpponentMove(fallback.moveUci, fallback.moveSan, chess.fen());
            } catch (e) {
              console.error('[MaiaBridge] Failed to apply fallback move:', e);
              onMaiaMoveFailed(String(e));
            }
          } else {
            onMaiaMoveFailed('No legal moves available');
          }
        }
      })
      .catch((e) => {
        console.error('[MaiaBridge] Generate move failed:', e);
        onMaiaMoveFailed(String(e));
      })
      .finally(() => {
        isGeneratingRef.current = false;
      });
  }, [machine, generateMaiaMove]);
  
  return <>{children}</>;
}

/**
 * Hook to manually trigger Maia inference
 * Useful for components that need predictions without the state machine
 */
export function useMaiaBridge() {
  const maiaContext = useMaiaContext();
  
  const generateMove = useCallback(async (
    fen: string,
    targetRating: MaiaRating = 1500
  ): Promise<{ moveUci: string; moveSan: string; probability: number } | null> => {
    // Ensure correct model
    if (maiaContext.state.currentModel !== targetRating) {
      try {
        await maiaContext.loadModel(targetRating);
      } catch {
        return null;
      }
    }
    
    if (!maiaContext.state.isReady) {
      return null;
    }
    
    try {
      const result = await maiaContext.predict(fen);
      
      if (!result.predictions?.length) {
        return null;
      }
      
      // Predictions are already in MovePrediction format
      const predictions = result.predictions as MovePrediction[];
      
      // Use 'realistic' temperature preset
      const sampled = sampleMove(predictions, TEMPERATURE_PRESETS.realistic);
      
      if (!sampled) {
        return null;
      }
      
      let san = sampled.san;
      if (!san) {
        try {
          const chess = new Chess(fen);
          const move = chess.move({
            from: sampled.uci.slice(0, 2),
            to: sampled.uci.slice(2, 4),
            promotion: sampled.uci.length > 4 ? sampled.uci[4] as any : undefined,
          });
          san = move?.san || sampled.uci;
        } catch {
          san = sampled.uci;
        }
      }
      
      return {
        moveUci: sampled.uci,
        moveSan: san,
        probability: sampled.probability,
      };
    } catch {
      return null;
    }
  }, [maiaContext]);
  
  return {
    generateMove,
    isReady: maiaContext.state.isReady,
    isLoading: maiaContext.state.isLoading,
    currentModel: maiaContext.state.currentModel,
  };
}
