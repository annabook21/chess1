/**
 * Keyboard Shortcuts Hook
 * Sierra games had keyboard shortcuts - we do too!
 * Provides accessible control for power users
 */

import { useEffect, useCallback, useRef } from 'react';

export interface KeyboardShortcuts {
  // Ritual bar actions
  observe?: () => void;      // O - Toggle threats overlay
  foresee?: () => void;      // F - Toggle PV preview
  intuit?: () => void;       // I - Toggle prediction
  undoFate?: () => void;     // U - Rewind move
  
  // Move selection
  selectChoice1?: () => void; // 1 - Select choice A
  selectChoice2?: () => void; // 2 - Select choice B
  selectChoice3?: () => void; // 3 - Select choice C
  confirmMove?: () => void;   // Enter - Confirm selected move
  
  // Navigation
  openMap?: () => void;       // M - Open castle map
  openHero?: () => void;      // H - Open hero sheet
  openSettings?: () => void;  // S - Open settings
  
  // General
  dismiss?: () => void;       // Escape - Close modal/dismiss
  newGame?: () => void;       // N - New game
}

interface UseKeyboardShortcutsOptions {
  /** Disable all shortcuts */
  disabled?: boolean;
  /** Show toast on first shortcut use */
  showHints?: boolean;
  /** Callback when hint should be shown */
  onHint?: (message: string) => void;
}

/**
 * Hook to register keyboard shortcuts
 * Shortcuts are disabled when typing in inputs
 */
export const useKeyboardShortcuts = (
  shortcuts: KeyboardShortcuts,
  options: UseKeyboardShortcutsOptions = {}
) => {
  const { disabled = false, showHints = true, onHint } = options;
  const hasShownHint = useRef(false);
  
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Don't trigger if typing in an input
    const target = event.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable
    ) {
      return;
    }
    
    // Don't trigger if modifier keys are held (except Escape)
    if ((event.ctrlKey || event.metaKey || event.altKey) && event.key !== 'Escape') {
      return;
    }
    
    const key = event.key.toLowerCase();
    let handled = false;
    let shortcutName = '';
    
    switch (key) {
      // Ritual bar
      case 'o':
        if (shortcuts.observe) {
          shortcuts.observe();
          handled = true;
          shortcutName = 'Observe (threats)';
        }
        break;
        
      case 'f':
        if (shortcuts.foresee) {
          shortcuts.foresee();
          handled = true;
          shortcutName = 'Foresee (PV)';
        }
        break;
        
      case 'i':
        if (shortcuts.intuit) {
          shortcuts.intuit();
          handled = true;
          shortcutName = 'Intuit (predict)';
        }
        break;
        
      case 'u':
        if (shortcuts.undoFate) {
          shortcuts.undoFate();
          handled = true;
          shortcutName = 'Undo Fate';
        }
        break;
        
      // Move selection
      case '1':
        if (shortcuts.selectChoice1) {
          shortcuts.selectChoice1();
          handled = true;
          shortcutName = 'Select choice A';
        }
        break;
        
      case '2':
        if (shortcuts.selectChoice2) {
          shortcuts.selectChoice2();
          handled = true;
          shortcutName = 'Select choice B';
        }
        break;
        
      case '3':
        if (shortcuts.selectChoice3) {
          shortcuts.selectChoice3();
          handled = true;
          shortcutName = 'Select choice C';
        }
        break;
        
      case 'enter':
        if (shortcuts.confirmMove) {
          shortcuts.confirmMove();
          handled = true;
          shortcutName = 'Confirm move';
        }
        break;
        
      // Navigation
      case 'm':
        if (shortcuts.openMap) {
          shortcuts.openMap();
          handled = true;
          shortcutName = 'Castle Map';
        }
        break;
        
      case 'h':
        if (shortcuts.openHero) {
          shortcuts.openHero();
          handled = true;
          shortcutName = 'Hero Sheet';
        }
        break;
        
      case 's':
        if (shortcuts.openSettings) {
          shortcuts.openSettings();
          handled = true;
          shortcutName = 'Settings';
        }
        break;
        
      // General
      case 'escape':
        if (shortcuts.dismiss) {
          shortcuts.dismiss();
          handled = true;
          shortcutName = 'Dismiss';
        }
        break;
        
      case 'n':
        if (shortcuts.newGame) {
          shortcuts.newGame();
          handled = true;
          shortcutName = 'New Game';
        }
        break;
    }
    
    if (handled) {
      event.preventDefault();
      
      // Show hint on first use
      if (showHints && !hasShownHint.current && onHint) {
        hasShownHint.current = true;
        onHint(`Keyboard shortcuts enabled! Press ${key.toUpperCase()} for ${shortcutName}`);
      }
    }
  }, [shortcuts, showHints, onHint]);
  
  useEffect(() => {
    if (disabled) return;
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown, disabled]);
};

/**
 * Get display label for a shortcut key
 */
export const getShortcutLabel = (key: string): string => {
  const labels: Record<string, string> = {
    o: 'O',
    f: 'F',
    i: 'I',
    u: 'U',
    m: 'M',
    h: 'H',
    s: 'S',
    n: 'N',
    '1': '1',
    '2': '2',
    '3': '3',
    enter: '⏎',
    escape: 'Esc',
  };
  return labels[key.toLowerCase()] || key.toUpperCase();
};

export default useKeyboardShortcuts;



