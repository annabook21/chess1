/**
 * Audio Provider
 * Placeholder audio system for Sierra-style sound effects
 * Currently logs to console - can be connected to real audio later
 */

import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

// Sound effect identifiers
export type SoundEffect = 
  | 'typewriter_char'     // Single character typed
  | 'typewriter_space'    // Space or punctuation
  | 'move_submit'         // Move submitted
  | 'move_capture'        // Piece captured
  | 'move_check'          // Check given
  | 'blunder'             // Blunder made
  | 'brilliant'           // Brilliant move
  | 'achievement_unlock'  // Achievement unlocked
  | 'room_unlock'         // Castle room unlocked
  | 'prediction_correct'  // Correct prediction
  | 'prediction_wrong'    // Wrong prediction
  | 'game_start'          // Game started
  | 'game_over'           // Game ended (loss)
  | 'victory'             // Game won
  | 'draw'                // Game drawn
  | 'spirit_speak'        // Spirit begins speaking
  | 'ui_click'            // UI button click
  | 'ui_hover';           // UI hover

interface AudioSettings {
  /** Master volume (0-1) */
  masterVolume: number;
  /** Sound effects enabled */
  sfxEnabled: boolean;
  /** Music enabled (future) */
  musicEnabled: boolean;
  /** Typewriter sounds enabled */
  typewriterEnabled: boolean;
}

interface AudioContextValue {
  settings: AudioSettings;
  updateSettings: (settings: Partial<AudioSettings>) => void;
  playSound: (sound: SoundEffect) => void;
  /** Stop all sounds */
  stopAll: () => void;
}

const defaultSettings: AudioSettings = {
  masterVolume: 0.7,
  sfxEnabled: true,
  musicEnabled: true,
  typewriterEnabled: true,
};

const AudioContext = createContext<AudioContextValue | null>(null);

interface AudioProviderProps {
  children: React.ReactNode;
  /** Enable console logging of audio events */
  debug?: boolean;
}

/**
 * Audio Provider - wraps app to provide audio context
 * Currently a stub that logs to console
 */
export const AudioProvider: React.FC<AudioProviderProps> = ({ 
  children, 
  debug = false 
}) => {
  const [settings, setSettings] = useState<AudioSettings>(() => {
    const saved = localStorage.getItem('masterAcademy_audio');
    return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
  });

  const updateSettings = useCallback((newSettings: Partial<AudioSettings>) => {
    setSettings(prev => {
      const updated = { ...prev, ...newSettings };
      localStorage.setItem('masterAcademy_audio', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const playSound = useCallback((sound: SoundEffect) => {
    // Check if sound should play
    if (!settings.sfxEnabled) return;
    if (sound.startsWith('typewriter') && !settings.typewriterEnabled) return;
    
    // Log to console (placeholder for real audio)
    if (debug) {
      console.log(`[Audio] ${sound} (vol: ${settings.masterVolume})`);
    }
    
    // TODO: Connect to real audio system
    // Example implementation:
    // const audio = new Audio(`/sounds/${sound}.mp3`);
    // audio.volume = settings.masterVolume;
    // audio.play().catch(() => {});
  }, [settings, debug]);

  const stopAll = useCallback(() => {
    if (debug) {
      console.log('[Audio] Stopping all sounds');
    }
    // TODO: Stop all playing audio
  }, [debug]);

  const value = useMemo(() => ({
    settings,
    updateSettings,
    playSound,
    stopAll,
  }), [settings, updateSettings, playSound, stopAll]);

  return (
    <AudioContext.Provider value={value}>
      {children}
    </AudioContext.Provider>
  );
};

/**
 * Hook to access audio system
 */
export const useAudio = (): AudioContextValue => {
  const context = useContext(AudioContext);
  if (!context) {
    // Return stub if no provider (graceful degradation)
    return {
      settings: defaultSettings,
      updateSettings: () => {},
      playSound: () => {},
      stopAll: () => {},
    };
  }
  return context;
};

/**
 * Hook for typewriter audio specifically
 * Returns a callback optimized for rapid character typing
 */
export const useTypewriterAudio = () => {
  const { playSound, settings } = useAudio();
  
  const onCharacter = useCallback((char: string) => {
    if (!settings.typewriterEnabled) return;
    
    if (char === ' ' || /[.,!?;:]/.test(char)) {
      playSound('typewriter_space');
    } else {
      playSound('typewriter_char');
    }
  }, [playSound, settings.typewriterEnabled]);
  
  return { onCharacter };
};

export default AudioProvider;







