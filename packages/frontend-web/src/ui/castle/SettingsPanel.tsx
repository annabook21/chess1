/**
 * Settings Panel
 * Castle-themed settings with tone slider and effect toggles
 */

import React, { useState, useEffect } from 'react';
import './SettingsPanel.css';

export type NarrationTone = 'whimsical' | 'gothic' | 'ruthless';

export interface CastleSettings {
  tone: NarrationTone;
  effects: {
    scanlines: boolean;
    vignette: boolean;
    grain: boolean;
    pixelScale: boolean;
  };
  narrationSpeed: number; // 1-5
  soundEnabled: boolean;
}

const DEFAULT_SETTINGS: CastleSettings = {
  tone: 'gothic',
  effects: {
    scanlines: true,
    vignette: true,
    grain: false,
    pixelScale: false,
  },
  narrationSpeed: 3,
  soundEnabled: false,
};

const STORAGE_KEY = 'masterAcademy_castleSettings';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSettingsChange?: (settings: CastleSettings) => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  isOpen,
  onClose,
  onSettingsChange,
}) => {
  const [settings, setSettings] = useState<CastleSettings>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
  });

  // Persist settings
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    onSettingsChange?.(settings);
  }, [settings, onSettingsChange]);

  // Apply effects to body
  useEffect(() => {
    const body = document.body;
    body.classList.toggle('effect-scanlines', settings.effects.scanlines);
    body.classList.toggle('effect-vignette', settings.effects.vignette);
    body.classList.toggle('effect-grain', settings.effects.grain);
    body.classList.toggle('effect-pixel-scale', settings.effects.pixelScale);
  }, [settings.effects]);

  const updateTone = (tone: NarrationTone) => {
    setSettings(prev => ({ ...prev, tone }));
  };

  const toggleEffect = (effect: keyof CastleSettings['effects']) => {
    setSettings(prev => ({
      ...prev,
      effects: { ...prev.effects, [effect]: !prev.effects[effect] },
    }));
  };

  const updateSpeed = (speed: number) => {
    setSettings(prev => ({ ...prev, narrationSpeed: speed }));
  };

  if (!isOpen) return null;

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-panel" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="settings-header">
          <h2 className="settings-title">⚙️ Castle Settings</h2>
          <button className="settings-close" onClick={onClose}>✕</button>
        </div>

        {/* Tone Slider */}
        <div className="settings-section">
          <h3 className="settings-section-title">Spirit Tone</h3>
          <p className="settings-section-desc">
            Adjust the narrator's personality
          </p>
          
          <div className="tone-slider">
            <div className="tone-labels">
              <span className={settings.tone === 'whimsical' ? 'active' : ''}>
                ✨ Whimsical
              </span>
              <span className={settings.tone === 'gothic' ? 'active' : ''}>
                🏰 Gothic
              </span>
              <span className={settings.tone === 'ruthless' ? 'active' : ''}>
                💀 Ruthless
              </span>
            </div>
            
            <div className="tone-buttons">
              {(['whimsical', 'gothic', 'ruthless'] as NarrationTone[]).map(tone => (
                <button
                  key={tone}
                  className={`tone-btn ${settings.tone === tone ? 'active' : ''}`}
                  onClick={() => updateTone(tone)}
                >
                  {tone === 'whimsical' && '✨'}
                  {tone === 'gothic' && '🏰'}
                  {tone === 'ruthless' && '💀'}
                </button>
              ))}
            </div>
            
            <div className="tone-preview">
              {settings.tone === 'whimsical' && (
                <p>"*The spirit giggles* Oh dear, that piece was rather lonely there, wasn't it?"</p>
              )}
              {settings.tone === 'gothic' && (
                <p>"*The spirit watches* The shadows deepen. Your knight treads dangerous ground..."</p>
              )}
              {settings.tone === 'ruthless' && (
                <p>"*The spirit sneers* Pathetic. Even a novice would see that blunder."</p>
              )}
            </div>
          </div>
        </div>

        {/* Visual Effects */}
        <div className="settings-section">
          <h3 className="settings-section-title">Visual Effects</h3>
          
          <div className="effect-toggles">
            <label className="effect-toggle">
              <input
                type="checkbox"
                checked={settings.effects.scanlines}
                onChange={() => toggleEffect('scanlines')}
              />
              <span className="toggle-label">
                <span className="toggle-icon">📺</span>
                CRT Scanlines
              </span>
            </label>

            <label className="effect-toggle">
              <input
                type="checkbox"
                checked={settings.effects.vignette}
                onChange={() => toggleEffect('vignette')}
              />
              <span className="toggle-label">
                <span className="toggle-icon">🕯️</span>
                Candle Vignette
              </span>
            </label>

            <label className="effect-toggle">
              <input
                type="checkbox"
                checked={settings.effects.grain}
                onChange={() => toggleEffect('grain')}
              />
              <span className="toggle-label">
                <span className="toggle-icon">📼</span>
                Film Grain
              </span>
            </label>

            <label className="effect-toggle">
              <input
                type="checkbox"
                checked={settings.effects.pixelScale}
                onChange={() => toggleEffect('pixelScale')}
              />
              <span className="toggle-label">
                <span className="toggle-icon">🎮</span>
                Pixel Scaling
              </span>
            </label>
          </div>
        </div>

        {/* Narration Speed */}
        <div className="settings-section">
          <h3 className="settings-section-title">Narration Speed</h3>
          
          <div className="speed-slider">
            <input
              type="range"
              min="1"
              max="5"
              value={settings.narrationSpeed}
              onChange={e => updateSpeed(Number(e.target.value))}
            />
            <div className="speed-labels">
              <span>Slow</span>
              <span>Normal</span>
              <span>Fast</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="settings-footer">
          <button 
            className="settings-reset"
            onClick={() => setSettings(DEFAULT_SETTINGS)}
          >
            Reset to Defaults
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;

// Export hook for easy access to settings
export const useCastleSettings = (): CastleSettings => {
  const [settings, setSettings] = useState<CastleSettings>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
  });

  useEffect(() => {
    const handleStorage = () => {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(saved) });
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  return settings;
};

