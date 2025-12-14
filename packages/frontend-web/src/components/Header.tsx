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
  totalMoves: number;
  accurateMoves: number;
  skillRating: number;
  highestRating: number;
}

interface HeaderProps {
  stats: PlayerStats;
  onNewGame: () => void;
  onOpenWeaknessTracker?: () => void;
  predictionEnabled?: boolean;
  onTogglePrediction?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ 
  stats, 
  onNewGame, 
  onOpenWeaknessTracker,
  predictionEnabled,
  onTogglePrediction,
}) => {
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
          {/* Skill Rating - Primary metric */}
          <div className="stat-item rating-badge">
            <span className="stat-icon">📈</span>
            <div className="stat-content">
              <span className="stat-value rating-value">{stats.skillRating}</span>
              <span className="stat-label">Skill Rating</span>
            </div>
          </div>

          {/* Level */}
          <div className="stat-item level-badge">
            <span className="stat-icon">⭐</span>
            <div className="stat-content">
              <span className="stat-value">Lvl {stats.level}</span>
              <div className="xp-bar-mini">
                <div 
                  className="xp-bar-fill" 
                  style={{ width: `${xpProgress}%` }} 
                />
              </div>
            </div>
          </div>

          {/* Accuracy */}
          <div className="stat-item accuracy-badge">
            <span className="stat-icon">🎯</span>
            <span className="stat-value">
              {stats.totalMoves > 0 
                ? Math.round((stats.accurateMoves / stats.totalMoves) * 100)
                : 0}%
            </span>
          </div>

          {/* Streak */}
          <div className="stat-item streak-item">
            <span className="stat-icon">🔥</span>
            <span className="stat-value">{stats.streak}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="header-actions">
          {onTogglePrediction && (
            <button 
              className={`btn btn-toggle ${predictionEnabled ? 'active' : ''}`}
              onClick={onTogglePrediction}
              title={predictionEnabled ? 'Prediction Mode: ON' : 'Prediction Mode: OFF'}
            >
              <span>🧠</span>
              Predict
              <span className={`toggle-indicator ${predictionEnabled ? 'on' : 'off'}`}>
                {predictionEnabled ? '✓' : '○'}
              </span>
            </button>
          )}
          {onOpenWeaknessTracker && (
            <button className="btn btn-accent" onClick={onOpenWeaknessTracker}>
              <span>🔍</span>
              Weaknesses
            </button>
          )}
          <button className="btn btn-secondary" onClick={onNewGame}>
            <span>🔄</span>
            New Game
          </button>
        </div>
      </div>
    </header>
  );
};

