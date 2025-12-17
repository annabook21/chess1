/**
 * Master Monologue Component
 * Shows the master's inner thoughts when analyzing a position
 */

import React from 'react';
import { PixelIcon } from '../ui/castle/PixelIcon';
import './MasterMonologue.css';

interface MasterMonologueProps {
  masterStyle: string;
  justification: string;
  threats?: string;
  isThinking?: boolean;
}

const MASTER_DATA: Record<string, { name: string; nickname: string; icon: React.ReactNode; color: string }> = {
  tal: {
    name: 'Tal',
    nickname: 'The Magician',
    icon: <PixelIcon name="sword" size="small" />,
    color: '#d13020',
  },
  fischer: {
    name: 'Fischer',
    nickname: 'The Perfectionist',
    icon: <PixelIcon name="trophy" size="small" />,
    color: '#86b81b',
  },
  capablanca: {
    name: 'Capablanca',
    nickname: 'The Chess Machine',
    icon: <PixelIcon name="crown" size="small" />,
    color: '#e6b100',
  },
  karpov: {
    name: 'Karpov',
    nickname: 'The Constrictor',
    icon: <PixelIcon name="target" size="small" />,
    color: '#4a9eff',
  },
};

export const MasterMonologue: React.FC<MasterMonologueProps> = ({
  masterStyle,
  justification,
  threats,
  isThinking = false,
}) => {
  const master = MASTER_DATA[masterStyle] || MASTER_DATA.fischer;

  return (
    <div 
      className={`master-monologue ${isThinking ? 'thinking' : ''}`}
      style={{ '--master-color': master.color } as React.CSSProperties}
    >
      <div className="monologue-header">
        <div className="master-avatar-lg">
          <span className="master-emoji-lg">{master.icon}</span>
        </div>
        <div className="master-identity">
          <span className="master-name-lg">{master.name}</span>
          <span className="master-nickname">{master.nickname}</span>
        </div>
        {isThinking && (
          <div className="thinking-indicator">
            <span className="dot"></span>
            <span className="dot"></span>
            <span className="dot"></span>
          </div>
        )}
      </div>

      <div className="monologue-content">
        <div className="thought-bubble">
          <span className="quote-mark">"</span>
          <p className="thought-text">
            {isThinking ? 'Analyzing the position...' : justification}
          </p>
          <span className="quote-mark end">"</span>
        </div>

        {threats && !isThinking && (
          <div className="threats-section">
            <span className="threats-label"><PixelIcon name="explosion" size="small" /> Creates:</span>
            <span className="threats-text">{threats}</span>
          </div>
        )}
      </div>

      <div className="monologue-footer">
        <span className="style-badge" style={{ borderColor: master.color }}>
          {master.nickname}
        </span>
      </div>
    </div>
  );
};





