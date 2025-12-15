/**
 * Ritual Bar
 * Bottom action bar with castle-themed toggle buttons
 */

import React from 'react';
import './RitualBar.css';

interface RitualButton {
  id: string;
  label: string;
  icon: string;
  active?: boolean;
  disabled?: boolean;
}

interface RitualBarProps {
  buttons: RitualButton[];
  onButtonClick: (id: string) => void;
}

export const RitualBar: React.FC<RitualBarProps> = ({
  buttons,
  onButtonClick,
}) => {
  return (
    <div className="ritual-bar">
      <div className="ritual-bar__frame">
        {buttons.map((button) => (
          <button
            key={button.id}
            className={`ritual-button ${button.active ? 'ritual-button--active' : ''}`}
            onClick={() => onButtonClick(button.id)}
            disabled={button.disabled}
            title={button.label}
          >
            <span className="ritual-button__icon">{button.icon}</span>
            <span className="ritual-button__label">{button.label}</span>
            {button.active && <span className="ritual-button__glow" />}
          </button>
        ))}
      </div>
    </div>
  );
};

/** Default ritual buttons configuration */
export const DEFAULT_RITUALS: RitualButton[] = [
  {
    id: 'threats',
    label: 'Reveal Threats',
    icon: '⚠️',
  },
  {
    id: 'gaze',
    label: 'Gaze Ahead',
    icon: '👁️',
  },
  {
    id: 'predict',
    label: 'Predict Foe',
    icon: '🔮',
  },
  {
    id: 'rewind',
    label: 'Invoke Rewind',
    icon: '⏪',
    disabled: true,
  },
];

export default RitualBar;
