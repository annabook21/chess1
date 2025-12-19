/**
 * Overlay Manager Hook
 * Manages active overlays and computes frames from providers
 */

import { useState, useMemo, useCallback } from 'react';
import type { OverlayFrame, OverlayContext, OverlayProvider, OverlayState } from './types';
import { ALL_PROVIDERS, getDefaultProviders } from './providers';

interface UseOverlayManagerOptions {
  defaultActiveProviders?: string[];
}

interface UseOverlayManagerResult {
  /** Current overlay state */
  state: OverlayState;
  
  /** Compute frames for a given context */
  computeFrames: (context: OverlayContext) => OverlayFrame[];
  
  /** Toggle a provider on/off */
  toggleProvider: (providerId: string) => void;
  
  /** Enable a provider */
  enableProvider: (providerId: string) => void;
  
  /** Disable a provider */
  disableProvider: (providerId: string) => void;
  
  /** Check if a provider is active */
  isProviderActive: (providerId: string) => boolean;
  
  /** All available providers */
  providers: OverlayProvider[];
}

export function useOverlayManager(
  options: UseOverlayManagerOptions = {}
): UseOverlayManagerResult {
  // Initialize with default providers
  const defaultActive = options.defaultActiveProviders 
    ?? getDefaultProviders().map(p => p.id);
  
  const [activeProviders, setActiveProviders] = useState<Set<string>>(
    new Set(defaultActive)
  );

  const toggleProvider = useCallback((providerId: string) => {
    setActiveProviders(prev => {
      const next = new Set(prev);
      if (next.has(providerId)) {
        next.delete(providerId);
      } else {
        next.add(providerId);
      }
      return next;
    });
  }, []);

  const enableProvider = useCallback((providerId: string) => {
    setActiveProviders(prev => new Set([...prev, providerId]));
  }, []);

  const disableProvider = useCallback((providerId: string) => {
    setActiveProviders(prev => {
      const next = new Set(prev);
      next.delete(providerId);
      return next;
    });
  }, []);

  const isProviderActive = useCallback((providerId: string) => {
    return activeProviders.has(providerId);
  }, [activeProviders]);

  const computeFrames = useCallback((context: OverlayContext): OverlayFrame[] => {
    const frames: OverlayFrame[] = [];
    
    for (const provider of ALL_PROVIDERS) {
      if (activeProviders.has(provider.id)) {
        try {
          const frame = provider.compute(context);
          // Only add non-empty frames
          if (
            frame.highlights.length > 0 ||
            frame.arrows.length > 0 ||
            frame.badges.length > 0 ||
            frame.ghostPieces.length > 0
          ) {
            frames.push(frame);
          }
        } catch (e) {
          console.error(`Overlay provider ${provider.id} error:`, e);
        }
      }
    }
    
    return frames;
  }, [activeProviders]);

  const state = useMemo<OverlayState>(() => ({
    frames: [],
    activeProviders: Array.from(activeProviders),
  }), [activeProviders]);

  return {
    state,
    computeFrames,
    toggleProvider,
    enableProvider,
    disableProvider,
    isProviderActive,
    providers: ALL_PROVIDERS,
  };
}

export default useOverlayManager;







