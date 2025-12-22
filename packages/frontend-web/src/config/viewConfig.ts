/**
 * View Configuration System
 * Separate layout configurations for mobile and desktop views
 * 
 * This provides a centralized place to manage UI differences between
 * mobile and desktop layouts, making it easy to customize each experience.
 */

import type { DeviceMode } from '../hooks/useDeviceMode';

/**
 * Layout configuration for action bar/bottom navigation
 */
export interface ActionBarConfig {
  /** Whether to show the action bar */
  visible: boolean;
  /** Position of the action bar */
  position: 'bottom' | 'top' | 'floating-right';
  /** Whether to use transparent/glassmorphism style */
  transparent: boolean;
  /** Actions to show */
  actions: ActionConfig[];
  /** Compact mode (icons only) */
  compact: boolean;
}

export interface ActionConfig {
  id: string;
  label: string;
  icon: string;
  /** Whether this action is visible */
  visible: boolean;
  /** Whether this is a primary/highlighted action */
  primary?: boolean;
  /** Action type for toggle buttons */
  type?: 'button' | 'toggle';
}

/**
 * Layout configuration for the main game area
 */
export interface GameAreaConfig {
  /** Show sidebar (move history, achievements, etc.) */
  showSidebar: boolean;
  /** Sidebar position */
  sidebarPosition: 'right' | 'below' | 'hidden';
  /** Show eval bar next to board */
  showEvalBar: boolean;
  /** Board sizing strategy */
  boardSize: 'fill' | 'fixed' | 'responsive';
  /** Show quick action buttons (floating) */
  showQuickActions: boolean;
  /** Quick actions position */
  quickActionsPosition: 'bottom-right' | 'top-right' | 'hidden';
}

/**
 * Overlay/Modal configuration
 */
export interface OverlayConfig {
  /** Move choices display style */
  moveChoicesStyle: 'overlay' | 'inline' | 'bottom-sheet';
  /** Prediction panel style */
  predictionStyle: 'overlay' | 'inline' | 'modal';
  /** Narration (spirit whisper) position */
  narrationPosition: 'bottom' | 'top' | 'overlay';
  /** Use glassmorphism for overlays */
  glassmorphism: boolean;
}

/**
 * Complete view configuration
 */
export interface ViewConfig {
  mode: DeviceMode;
  actionBar: ActionBarConfig;
  gameArea: GameAreaConfig;
  overlay: OverlayConfig;
}

/**
 * Mobile View Configuration
 * Optimized for touch interfaces and smaller screens
 */
export const mobileViewConfig: ViewConfig = {
  mode: 'mobile',
  actionBar: {
    visible: true,
    position: 'bottom',
    transparent: true, // GLASSMORPHISM - as requested
    compact: false,
    actions: [
      { 
        id: 'predict', 
        label: 'Predict', 
        icon: '🧠', 
        visible: true, 
        type: 'toggle' 
      },
      { 
        id: 'analyze', 
        label: 'Analyze', 
        icon: '🔍', 
        visible: true, 
        type: 'button' 
      },
      { 
        id: 'newGame', 
        label: 'New Game', 
        icon: '🔄', 
        visible: true, 
        primary: true, 
        type: 'button' 
      },
    ],
  },
  gameArea: {
    showSidebar: false,
    sidebarPosition: 'hidden',
    showEvalBar: false,
    boardSize: 'fill',
    showQuickActions: true,
    quickActionsPosition: 'bottom-right',
  },
  overlay: {
    moveChoicesStyle: 'overlay',
    predictionStyle: 'overlay',
    narrationPosition: 'overlay',
    glassmorphism: true,
  },
};

/**
 * Desktop View Configuration
 * Optimized for larger screens with mouse/keyboard input
 */
export const desktopViewConfig: ViewConfig = {
  mode: 'desktop',
  actionBar: {
    visible: true, // NOW VISIBLE ON DESKTOP TOO
    position: 'bottom',
    transparent: true, // GLASSMORPHISM - as requested
    compact: false,
    actions: [
      { 
        id: 'predict', 
        label: 'Predict Opponent', 
        icon: '🧠', 
        visible: true, 
        type: 'toggle' 
      },
      { 
        id: 'analyze', 
        label: 'Analyze Weaknesses', 
        icon: '🔍', 
        visible: true, 
        type: 'button' 
      },
      { 
        id: 'settings', 
        label: 'Settings', 
        icon: '⚙️', 
        visible: true, 
        type: 'button' 
      },
      { 
        id: 'map', 
        label: 'Castle Map', 
        icon: '🏰', 
        visible: true, 
        type: 'button' 
      },
      { 
        id: 'newGame', 
        label: 'New Game', 
        icon: '🔄', 
        visible: true, 
        primary: true, 
        type: 'button' 
      },
    ],
  },
  gameArea: {
    showSidebar: true,
    sidebarPosition: 'right',
    showEvalBar: true,
    boardSize: 'responsive',
    showQuickActions: false, // Actions in bottom bar now
    quickActionsPosition: 'hidden',
  },
  overlay: {
    moveChoicesStyle: 'overlay',
    predictionStyle: 'inline',
    narrationPosition: 'bottom',
    glassmorphism: true,
  },
};

/**
 * Get the appropriate view configuration for a device mode
 */
export function getViewConfig(mode: DeviceMode): ViewConfig {
  return mode === 'mobile' ? mobileViewConfig : desktopViewConfig;
}

/**
 * Get a specific config value with type safety
 */
export function getConfigValue<K extends keyof ViewConfig>(
  mode: DeviceMode,
  key: K
): ViewConfig[K] {
  const config = getViewConfig(mode);
  return config[key];
}

export default getViewConfig;
