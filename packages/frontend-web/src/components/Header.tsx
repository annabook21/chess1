/**
 * Header Component
 * Shows game title, player stats, and actions
 */

import './Header.css';

interface PlayerStats {
  xp: number;
  level: number;
  streak: number;
  gamesPlayed: number;
  goodMoves: number;
  blunders: number;
}

interface HeaderProps {
  stats: PlayerStats;
  onNewGame: () => void;
}

export const Header: React.FC<HeaderProps> = ({ stats, onNewGame }) => {
  const xpForNextLevel = stats.level * 100;
  const xpProgress = (stats.xp / xpForNextLevel) * 100;

  return (
    <header className="app-header">
      <div className="header-content">
        {/* Logo & Title */}
        <div className="header-brand">
          <div className="brand-logo">♔</div>
          <div className="brand-text">
            <h1>Master Academy</h1>
            <p>Learn from the Legends</p>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="header-stats">
          {/* Level */}
          <div className="stat-item level-badge">
            <span className="stat-icon">⭐</span>
            <div className="stat-content">
              <span className="stat-value">Level {stats.level}</span>
              <div className="xp-bar-mini">
                <div 
                  className="xp-bar-fill" 
                  style={{ width: `${xpProgress}%` }} 
                />
              </div>
            </div>
          </div>

          {/* Streak */}
          <div className="stat-item streak-item">
            <span className="stat-icon">🔥</span>
            <span className="stat-value">{stats.streak} day streak</span>
          </div>

          {/* Games */}
          <div className="stat-item">
            <span className="stat-icon">🎮</span>
            <span className="stat-value">{stats.gamesPlayed} games</span>
          </div>

          {/* Accuracy */}
          <div className="stat-item">
            <span className="stat-icon">🎯</span>
            <span className="stat-value">
              {stats.goodMoves + stats.blunders > 0 
                ? Math.round((stats.goodMoves / (stats.goodMoves + stats.blunders)) * 100)
                : 0}% accuracy
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="header-actions">
          <button className="btn btn-secondary" onClick={onNewGame}>
            <span>🔄</span>
            New Game
          </button>
        </div>
      </div>
    </header>
  );
};

