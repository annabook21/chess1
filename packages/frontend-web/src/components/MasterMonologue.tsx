/**
 * Master Monologue Component
 * Shows the master's inner thoughts when analyzing a position
 */

import React, { useState, useEffect } from 'react';
import { PixelIcon } from '../ui/castle/PixelIcon';
import './MasterMonologue.css';

interface MasterMonologueProps {
  masterStyle: string;
  justification: string;
  threats?: string;
  isThinking?: boolean;
}

/**
 * Master metadata for UI display
 * Sourced from game-api ChoiceBuilder strategies
 */
const MASTER_DATA: Record<string, { name: string; nickname: string; iconName: string; color: string }> = {
  fischer: {
    name: 'Bobby Fischer',
    nickname: 'The Perfectionist',
    iconName: 'trophy',
    color: '#86b81b',
  },
  tal: {
    name: 'Mikhail Tal',
    nickname: 'The Magician',
    iconName: 'sword',
    color: '#d13020',
  },
  capablanca: {
    name: 'José Raúl Capablanca',
    nickname: 'The Chess Machine',
    iconName: 'crown',
    color: '#e6b100',
  },
  karpov: {
    name: 'Anatoly Karpov',
    nickname: 'The Constrictor',
    iconName: 'target',
    color: '#4a9eff',
  },
  'human-like': {
    name: 'Human-like',
    nickname: 'Like You',
    iconName: 'user',
    color: '#9c27b0',
  },
};

export const MasterMonologue: React.FC<MasterMonologueProps> = ({
  masterStyle,
  justification,
  threats,
  isThinking = false,
}) => {
  const master = MASTER_DATA[masterStyle] || MASTER_DATA.fischer;
  const [showThinking, setShowThinking] = useState(false);

  // Only show thinking indicator for operations >1 second
  useEffect(() => {
    if (isThinking) {
      const timer = setTimeout(() => setShowThinking(true), 1000);
      return () => clearTimeout(timer);
    } else {
      setShowThinking(false);
    }
  }, [isThinking]);

  return (
    <div
      className={`master-monologue ${showThinking ? 'thinking' : ''}`}
      role="complementary"
      aria-label={`${master.name}'s analysis`}
      style={{ '--master-color': master.color } as React.CSSProperties}
    >
      <div className="monologue-header">
        <div className="master-avatar-lg">
          <PixelIcon name={master.iconName as any} size="small" />
        </div>
        <div className="master-identity">
          <span className="master-name-lg">{master.name}</span>
          <span className="master-nickname">{master.nickname}</span>
        </div>
        {showThinking && (
          <div className="thinking-indicator" aria-label="Analyzing">
            <span className="dot"></span>
            <span className="dot"></span>
            <span className="dot"></span>
          </div>
        )}
      </div>

      <div className="monologue-content">
        <blockquote className="thought-bubble">
          <p className="thought-text">
            "{showThinking ? 'Analyzing the position...' : justification}"
          </p>
        </blockquote>

        {threats && !showThinking && (
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





