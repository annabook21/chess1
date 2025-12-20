/**
 * Hero Sheet
 * RPG-style character stats panel
 */

import React from 'react';
import './HeroSheet.css';

interface HeroStats {
  ego: number;       // Confidence - prediction streak related
  cunning: number;   // Tactical vision - tactics found
  foresight: number; // Planning - best moves found
  resolve: number;   // Resilience - recovery from mistakes
}

interface HeroSheetProps {
  stats: HeroStats;
  playerName?: string;
  rating?: number;
  gamesPlayed?: number;
}

const StatBar: React.FC<{ label: string; value: number; color: string; icon: string }> = ({
  label,
  value,
  color,
  icon,
}) => {
  const displayValue = Math.min(100, Math.max(0, value));
  
  return (
    <div className="hero-stat">
      <div className="hero-stat__header">
        <span className="hero-stat__icon">{icon}</span>
        <span className="hero-stat__label">{label}</span>
        <span className="hero-stat__value">{displayValue}</span>
      </div>
      <div className="hero-stat__bar">
        <div 
          className="hero-stat__fill"
          style={{ 
            width: `${displayValue}%`,
            backgroundColor: color,
          }}
        />
      </div>
    </div>
  );
};

export const HeroSheet: React.FC<HeroSheetProps> = ({
  stats,
  playerName = 'Wanderer',
  rating = 1200,
  gamesPlayed = 0,
}) => {
  return (
    <div className="hero-sheet">
      {/* Header with name and rating */}
      <div className="hero-sheet__header">
        <div className="hero-sheet__avatar">⚔️</div>
        <div className="hero-sheet__info">
          <div className="hero-sheet__name">{playerName}</div>
          <div className="hero-sheet__rating">
            <span className="hero-sheet__rating-label">Guild Rank:</span>
            <span className="hero-sheet__rating-value">{rating}</span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="hero-sheet__stats">
        <StatBar 
          label="Ego" 
          value={stats.ego} 
          color="var(--castle-accent2)" 
          icon="👑"
        />
        <StatBar 
          label="Cunning" 
          value={stats.cunning} 
          color="var(--castle-danger)" 
          icon="🗡️"
        />
        <StatBar 
          label="Foresight" 
          value={stats.foresight} 
          color="var(--castle-info)" 
          icon="👁️"
        />
        <StatBar 
          label="Resolve" 
          value={stats.resolve} 
          color="var(--castle-success)" 
          icon="🛡️"
        />
      </div>

      {/* Footer with games played */}
      <div className="hero-sheet__footer">
        <span className="hero-sheet__games">
          Trials Completed: {gamesPlayed}
        </span>
      </div>
    </div>
  );
};

export default HeroSheet;









