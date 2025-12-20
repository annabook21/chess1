/**
 * Game State Machine Provider
 * 
 * Provides game state machine context to the app.
 * Enables gradual migration from useState hooks to XState.
 */

import React, { createContext, useContext, ReactNode } from 'react';
import { useGameMachine, UseGameMachine } from './useGameMachine';

// Feature flag for XState migration
// Set to true to enable XState state machine
// Phase 2: XState infrastructure complete, AppXState component ready.
// Enable to use XState for all game state management.
export const USE_XSTATE = true;

// Context for the game machine
const GameMachineContext = createContext<UseGameMachine | null>(null);

/**
 * Provider component for game state machine
 */
export function GameMachineProvider({ children }: { children: ReactNode }) {
  const machine = useGameMachine();
  
  return (
    <GameMachineContext.Provider value={machine}>
      {children}
    </GameMachineContext.Provider>
  );
}

/**
 * Hook to access the game machine from context
 * Throws if used outside of GameMachineProvider
 */
export function useGameMachineContext(): UseGameMachine {
  const context = useContext(GameMachineContext);
  
  if (!context) {
    throw new Error(
      'useGameMachineContext must be used within a GameMachineProvider'
    );
  }
  
  return context;
}

/**
 * Optional hook that returns null if not in provider
 * Useful during migration when some components aren't wrapped yet
 */
export function useOptionalGameMachine(): UseGameMachine | null {
  return useContext(GameMachineContext);
}
