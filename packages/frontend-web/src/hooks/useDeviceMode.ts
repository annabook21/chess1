/**
 * useDeviceMode Hook
 * Manages user preference for mobile vs desktop layout
 * 
 * Features:
 * - Prompts user on first visit to choose their preferred view
 * - Persists preference in localStorage
 * - Provides reactive state for components to adapt layouts
 * - Allows manual switching between modes
 */

import { useState, useEffect, useCallback } from 'react';

export type DeviceMode = 'mobile' | 'desktop';

export interface DeviceModeState {
  /** Current active device mode */
  mode: DeviceMode;
  /** Whether user has explicitly chosen a mode (vs auto-detected) */
  hasUserChoice: boolean;
  /** Whether the prompt should be shown */
  showPrompt: boolean;
  /** Set the device mode preference */
  setMode: (mode: DeviceMode) => void;
  /** Reset to show prompt again */
  resetChoice: () => void;
  /** Dismiss prompt without choosing (uses auto-detected) */
  dismissPrompt: () => void;
  /** Auto-detected mode based on screen size */
  autoDetectedMode: DeviceMode;
}

const STORAGE_KEY = 'qfg_deviceMode';
const STORAGE_KEY_PROMPTED = 'qfg_deviceModePrompted';

/**
 * Detect device mode based on screen characteristics
 */
function detectDeviceMode(): DeviceMode {
  if (typeof window === 'undefined') return 'desktop';
  
  // Check multiple signals for mobile detection
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const isNarrowScreen = window.innerWidth <= 768;
  const isMobileUserAgent = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
  
  // If any strong mobile signal, suggest mobile
  if (isNarrowScreen || (isTouchDevice && isMobileUserAgent)) {
    return 'mobile';
  }
  
  return 'desktop';
}

export function useDeviceMode(): DeviceModeState {
  // Auto-detected mode (can change on resize)
  const [autoDetectedMode, setAutoDetectedMode] = useState<DeviceMode>(() => detectDeviceMode());
  
  // User's explicit choice (persisted)
  const [userChoice, setUserChoice] = useState<DeviceMode | null>(() => {
    if (typeof window === 'undefined') return null;
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved as DeviceMode | null;
  });
  
  // Whether user has been prompted before
  const [hasBeenPrompted, setHasBeenPrompted] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(STORAGE_KEY_PROMPTED) === 'true';
  });
  
  // Whether to show the prompt
  const [showPrompt, setShowPrompt] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    // Show prompt if no saved choice and not previously dismissed
    const hasSavedChoice = localStorage.getItem(STORAGE_KEY) !== null;
    const hasBeenPrompted = localStorage.getItem(STORAGE_KEY_PROMPTED) === 'true';
    return !hasSavedChoice && !hasBeenPrompted;
  });
  
  // Update auto-detected mode on resize
  useEffect(() => {
    const handleResize = () => {
      setAutoDetectedMode(detectDeviceMode());
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Set user preference
  const setMode = useCallback((mode: DeviceMode) => {
    setUserChoice(mode);
    setShowPrompt(false);
    setHasBeenPrompted(true);
    localStorage.setItem(STORAGE_KEY, mode);
    localStorage.setItem(STORAGE_KEY_PROMPTED, 'true');
  }, []);
  
  // Reset to show prompt again
  const resetChoice = useCallback(() => {
    setUserChoice(null);
    setShowPrompt(true);
    setHasBeenPrompted(false);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(STORAGE_KEY_PROMPTED);
  }, []);
  
  // Dismiss prompt without explicit choice (use auto-detected)
  const dismissPrompt = useCallback(() => {
    setShowPrompt(false);
    setHasBeenPrompted(true);
    localStorage.setItem(STORAGE_KEY_PROMPTED, 'true');
  }, []);
  
  // Active mode: user choice takes precedence, then auto-detected
  const mode = userChoice ?? autoDetectedMode;
  
  return {
    mode,
    hasUserChoice: userChoice !== null,
    showPrompt,
    setMode,
    resetChoice,
    dismissPrompt,
    autoDetectedMode,
  };
}

export default useDeviceMode;
