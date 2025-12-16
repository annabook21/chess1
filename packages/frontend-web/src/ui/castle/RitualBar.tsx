/**
 * Ritual Bar
 * Sierra-style verb bar with castle-themed toggle buttons
 * Inspired by Quest for Glory's icon bar interface
 */

import React from 'react';
import './RitualBar.css';

export interface RitualButton {
  id: string;
  /** Display label */
  label: string;
  /** Sierra-style verb name */
  verb: string;
  /** Emoji or icon */
  icon: string;
  /** Keyboard shortcut */
  shortcut: string;
  /** Is currently active/toggled */
  active?: boolean;
  /** Is disabled */
  disabled?: boolean;
  /** Tooltip description */
  tooltip?: string;
}

interface RitualBarProps {
  buttons: RitualButton[];
  onButtonClick: (id: string) => void;
  /** Show keyboard shortcuts in buttons */
  showShortcuts?: boolean;
  /** Compact mode for mobile */
  compact?: boolean;
}

export const RitualBar: React.FC<RitualBarProps> = ({
  buttons,
  onButtonClick,
  showShortcuts = true,
  compact = false,
}) => {
  return (
    <div className={`ritual-bar ${compact ? 'ritual-bar--compact' : ''}`}>
      <div className="ritual-bar__frame">
        <div className="ritual-bar__title">⚔ Rituals ⚔</div>
        <div className="ritual-bar__buttons">
          {buttons.map((button) => (
            <button
              key={button.id}
              className={`ritual-button ${button.active ? 'ritual-button--active' : ''} ${button.disabled ? 'ritual-button--disabled' : ''}`}
              onClick={() => !button.disabled && onButtonClick(button.id)}
              disabled={button.disabled}
              title={button.tooltip || `${button.label} (${button.shortcut})`}
              aria-pressed={button.active}
            >
              {/* Icon */}
              <span className="ritual-button__icon" aria-hidden="true">
                {button.icon}
              </span>
              
              {/* Verb name (Sierra style) */}
              <span className="ritual-button__verb">{button.verb}</span>
              
              {/* Keyboard shortcut badge */}
              {showShortcuts && (
                <span className="ritual-button__shortcut" aria-label={`Shortcut: ${button.shortcut}`}>
                  {button.shortcut}
                </span>
              )}
              
              {/* Active glow effect */}
              {button.active && <span className="ritual-button__glow" aria-hidden="true" />}
              
              {/* Disabled lock */}
              {button.disabled && (
                <span className="ritual-button__lock" aria-hidden="true">🔒</span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

/** 
 * Default ritual buttons - Sierra verb style
 * Each has a thematic verb name and keyboard shortcut
 */
export const DEFAULT_RITUALS: RitualButton[] = [
  {
    id: 'observe',
    label: 'Reveal Threats',
    verb: 'Observe',
    icon: '👁️',
    shortcut: 'O',
    tooltip: 'Reveal threats and attacks on the board',
  },
  {
    id: 'foresee',
    label: 'Gaze Ahead',
    verb: 'Foresee',
    icon: '🔮',
    shortcut: 'F',
    tooltip: 'See the principal variation (best continuation)',
  },
  {
    id: 'intuit',
    label: 'Predict Foe',
    verb: 'Intuit',
    icon: '🧠',
    shortcut: 'I',
    tooltip: 'Toggle opponent move prediction mode',
  },
  {
    id: 'undo',
    label: 'Invoke Rewind',
    verb: 'Undo Fate',
    icon: '⏪',
    shortcut: 'U',
    tooltip: 'Take back your last move (costs XP)',
    disabled: true,
  },
];

/**
 * Get ritual by ID
 */
export const getRitualById = (id: string): RitualButton | undefined => {
  return DEFAULT_RITUALS.find(r => r.id === id);
};

export default RitualBar;


