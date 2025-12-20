/**
 * Character Stats Panel
 * Quest for Glory-style attribute display
 * Adapted for chess: Tactics, Strategy, Endgame, etc.
 */

import React from 'react';
import './CharacterStats.css';

interface Stat {
  name: string;
  abbrev: string;
  value: number;
  max: number;
  color: string;
}

interface CharacterStatsProps {
  /** Player's skill rating */
  rating: number;
  /** Player's level */
  level: number;
  /** XP progress to next level (0-100) */
  xpProgress: number;
  /** Total games played */
  gamesPlayed: number;
  /** Accuracy percentage */
  accuracy: number;
  /** Win rate percentage */
  winRate?: number;
  /** Custom stats override */
  customStats?: Stat[];
}

/** Default chess-adapted stats derived from player performance */
const getDefaultStats = (props: CharacterStatsProps): Stat[] => {
  const { accuracy, rating } = props;
  
  // Derive stats from rating and accuracy
  const baseSkill = Math.floor(rating / 20); // 0-100 scale from rating
  
  return [
    {
      name: 'Tactics',
      abbrev: 'TAC',
      value: Math.min(99, Math.floor(baseSkill * (accuracy / 100) * 1.2)),
      max: 100,
      color: '#e74c3c',
    },
    {
      name: 'Strategy',
      abbrev: 'STR',
      value: Math.min(99, Math.floor(baseSkill * 0.9)),
      max: 100,
      color: '#3498db',
    },
    {
      name: 'Endgame',
      abbrev: 'END',
      value: Math.min(99, Math.floor(baseSkill * 0.7)),
      max: 100,
      color: '#9b59b6',
    },
    {
      name: 'Defense',
      abbrev: 'DEF',
      value: Math.min(99, Math.floor(baseSkill * 0.8)),
      max: 100,
      color: '#27ae60',
    },
    {
      name: 'Intuition',
      abbrev: 'INT',
      value: Math.min(99, Math.floor(accuracy * 0.9)),
      max: 100,
      color: '#f39c12',
    },
  ];
};

export const CharacterStats: React.FC<CharacterStatsProps> = (props) => {
  const { rating, level, xpProgress, gamesPlayed, customStats } = props;
  const stats = customStats || getDefaultStats(props);

  return (
    <div className="character-stats">
      {/* Header with class/level */}
      <div className="character-stats__header">
        <span className="character-stats__class">Chess Apprentice</span>
        <span className="character-stats__level">Lvl {level}</span>
      </div>

      {/* XP Bar */}
      <div className="character-stats__xp">
        <div className="character-stats__xp-label">
          <span>EXP</span>
          <span>{xpProgress}%</span>
        </div>
        <div className="character-stats__xp-bar">
          <div 
            className="character-stats__xp-fill"
            style={{ width: `${xpProgress}%` }}
          />
        </div>
      </div>

      {/* Rating display */}
      <div className="character-stats__rating">
        <span className="rating-label">Guild Rank</span>
        <span className="rating-value">{rating}</span>
      </div>

      {/* Stats grid */}
      <div className="character-stats__grid">
        {stats.map((stat) => (
          <div key={stat.abbrev} className="stat-row">
            <span className="stat-name" title={stat.name}>
              {stat.abbrev}
            </span>
            <div className="stat-bar">
              <div 
                className="stat-bar__fill"
                style={{ 
                  width: `${(stat.value / stat.max) * 100}%`,
                  backgroundColor: stat.color,
                }}
              />
            </div>
            <span className="stat-value">{stat.value}</span>
          </div>
        ))}
      </div>

      {/* Games played */}
      <div className="character-stats__footer">
        <span>Quests: {gamesPlayed}</span>
      </div>
    </div>
  );
};

export default CharacterStats;







