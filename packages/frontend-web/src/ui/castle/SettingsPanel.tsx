/**
 * Settings Panel
 * Castle-themed settings with tone slider and effect toggles
 */

import React, { useState, useEffect } from 'react';
import { PixelIcon } from './PixelIcon';
import './SettingsPanel.css';

export type NarrationTone = 'whimsical' | 'gothic' | 'ruthless';
export type OpponentType = 'ai-master' | 'human-like';
export type MaiaRating = 1100 | 1200 | 1300 | 1400 | 1500 | 1600 | 1700 | 1800 | 1900;
export type PlayMode = 'guided' | 'free';
export type PlayerColor = 'white' | 'black';
export type DeviceMode = 'mobile' | 'desktop';

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
  // Opponent settings
  opponentType?: OpponentType;
  onOpponentTypeChange?: (type: OpponentType) => void;
  maiaRating?: MaiaRating;
  onMaiaRatingChange?: (rating: MaiaRating) => void;
  // Play mode settings
  playMode?: PlayMode;
  onPlayModeChange?: (mode: PlayMode) => void;
  playerColor?: PlayerColor;
  onPlayerColorChange?: (color: PlayerColor) => void;
  // Device mode settings
  deviceMode?: DeviceMode;
  onDeviceModeChange?: (mode: DeviceMode) => void;
  // Coach logs
  onOpenCoachLogs?: () => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  isOpen,
  onClose,
  onSettingsChange,
  opponentType = 'ai-master',
  onOpponentTypeChange,
  maiaRating = 1500,
  onMaiaRatingChange,
  playMode = 'guided',
  onPlayModeChange,
  playerColor = 'white',
  onPlayerColorChange,
  deviceMode = 'desktop',
  onDeviceModeChange,
  onOpenCoachLogs,
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
          <h2 className="settings-title"><PixelIcon name="gear" size="medium" /> Castle Settings</h2>
          <button className="settings-close" onClick={onClose}>✕</button>
        </div>

        {/* Coach's Logs */}
        {onOpenCoachLogs && (
          <div className="settings-section">
            <h3 className="settings-section-title">📋 Coach's Logs</h3>
            <p className="settings-section-desc">
              Review past coaching feedback and analysis
            </p>
            
            <button
              className="coach-logs-open-btn"
              onClick={() => {
                onClose();
                onOpenCoachLogs();
              }}
            >
              <span className="btn-icon">📋</span>
              View Coach's Logs
            </button>
          </div>
        )}

        {/* Device Mode */}
        <div className="settings-section">
          <h3 className="settings-section-title">📱 Display Mode</h3>
          <p className="settings-section-desc">
            Choose your preferred layout
          </p>
          
          <div className="device-mode-selector">
            <button
              className={`device-mode-btn ${deviceMode === 'mobile' ? 'active' : ''}`}
              onClick={() => onDeviceModeChange?.('mobile')}
            >
              <span className="device-mode-icon">📱</span>
              <span className="device-mode-label">Mobile</span>
              <span className="device-mode-desc">Touch-friendly, full-screen board</span>
            </button>
            
            <button
              className={`device-mode-btn ${deviceMode === 'desktop' ? 'active' : ''}`}
              onClick={() => onDeviceModeChange?.('desktop')}
            >
              <span className="device-mode-icon">🖥️</span>
              <span className="device-mode-label">Desktop</span>
              <span className="device-mode-desc">Sidebar with move history</span>
            </button>
          </div>
        </div>

        {/* Play Mode */}
        <div className="settings-section">
          <h3 className="settings-section-title">🎯 Play Mode</h3>
          <p className="settings-section-desc">
            How do you want to play?
          </p>
          
          <div className="play-mode-selector">
            <button
              className={`play-mode-btn ${playMode === 'guided' ? 'active' : ''}`}
              onClick={() => onPlayModeChange?.('guided')}
            >
              <span className="play-mode-icon">📚</span>
              <span className="play-mode-label">Guided</span>
              <span className="play-mode-desc">Choose from master suggestions</span>
            </button>
            
            <button
              className={`play-mode-btn ${playMode === 'free' ? 'active' : ''}`}
              onClick={() => onPlayModeChange?.('free')}
            >
              <span className="play-mode-icon">♟️</span>
              <span className="play-mode-label">Free Play</span>
              <span className="play-mode-desc">Move pieces manually</span>
            </button>
          </div>
        </div>

        {/* Player Color */}
        <div className="settings-section">
          <h3 className="settings-section-title">⚫⚪ Your Color</h3>
          <p className="settings-section-desc">
            Play as White or Black
          </p>
          
          <div className="color-selector">
            <button
              className={`color-btn white ${playerColor === 'white' ? 'active' : ''}`}
              onClick={() => onPlayerColorChange?.('white')}
            >
              <span className="color-piece">♔</span>
              <span className="color-label">White</span>
              <span className="color-desc">Move first</span>
            </button>
            
            <button
              className={`color-btn black ${playerColor === 'black' ? 'active' : ''}`}
              onClick={() => onPlayerColorChange?.('black')}
            >
              <span className="color-piece">♚</span>
              <span className="color-label">Black</span>
              <span className="color-desc">Respond to opponent</span>
            </button>
          </div>
        </div>

        {/* Opponent Type */}
        <div className="settings-section">
          <h3 className="settings-section-title">🎮 Opponent Type</h3>
          <p className="settings-section-desc">
            Choose your adversary
          </p>
          
          <div className="opponent-selector">
            <button
              className={`opponent-btn ${opponentType === 'ai-master' ? 'active' : ''}`}
              onClick={() => onOpponentTypeChange?.('ai-master')}
            >
              <span className="opponent-icon">🤖</span>
              <span className="opponent-label">AI Master</span>
              <span className="opponent-desc">Grandmaster-style moves</span>
            </button>
            
            <button
              className={`opponent-btn ${opponentType === 'human-like' ? 'active' : ''}`}
              onClick={() => onOpponentTypeChange?.('human-like')}
            >
              <span className="opponent-icon">🧠</span>
              <span className="opponent-label">Human-like</span>
              <span className="opponent-desc">Realistic player moves</span>
            </button>
          </div>

          {opponentType === 'human-like' && (
            <div className="maia-rating-selector">
              <label className="maia-rating-label">
                Opponent Rating: <strong>~{maiaRating}</strong>
              </label>
              <select
                value={maiaRating}
                onChange={e => onMaiaRatingChange?.(Number(e.target.value) as MaiaRating)}
                className="maia-rating-select"
              >
                <option value={1100}>1100 (Beginner)</option>
                <option value={1300}>1300 (Intermediate)</option>
                <option value={1500}>1500 (Advanced)</option>
                <option value={1700}>1700 (Expert)</option>
                <option value={1900}>1900 (Master)</option>
              </select>
              <p className="maia-info">
                Predictions unlock when facing human-like opponents!
              </p>
            </div>
          )}
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
                <PixelIcon name="sparkle" size="small" /> Whimsical
              </span>
              <span className={settings.tone === 'gothic' ? 'active' : ''}>
                <PixelIcon name="castle" size="small" /> Gothic
              </span>
              <span className={settings.tone === 'ruthless' ? 'active' : ''}>
                <PixelIcon name="skull" size="small" /> Ruthless
              </span>
            </div>
            
            <div className="tone-buttons">
              {(['whimsical', 'gothic', 'ruthless'] as NarrationTone[]).map(tone => (
                <button
                  key={tone}
                  className={`tone-btn ${settings.tone === tone ? 'active' : ''}`}
                  onClick={() => updateTone(tone)}
                >
                  {tone === 'whimsical' && <PixelIcon name="sparkle" size="small" />}
                  {tone === 'gothic' && <PixelIcon name="castle" size="small" />}
                  {tone === 'ruthless' && <PixelIcon name="skull" size="small" />}
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
                <span className="toggle-icon"><PixelIcon name="castle" size="small" /></span>
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

