/**
 * Header Component
 * Shows game title, player stats, and actions
 */

import { PixelIcon, LogoMark } from '../ui/castle';
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
          <LogoMark size={40} />
          <div className="brand-text">
            <h1>Quest for Grandmaster</h1>
            <p>Learn from the Legends</p>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="header-stats">
          {/* Skill Rating - Primary metric */}
          <div className="stat-item rating-badge">
            <span className="stat-icon"><PixelIcon name="chart" size="small" /></span>
            <div className="stat-content">
              <span className="stat-value rating-value">{stats.skillRating}</span>
              <span className="stat-label">Skill Rating</span>
            </div>
          </div>

          {/* Level */}
          <div className="stat-item level-badge">
            <span className="stat-icon"><PixelIcon name="star" size="small" /></span>
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
            <span className="stat-icon"><PixelIcon name="target" size="small" /></span>
            <span className="stat-value">
              {stats.totalMoves > 0 
                ? Math.round((stats.accurateMoves / stats.totalMoves) * 100)
                : 0}%
            </span>
          </div>

          {/* Streak */}
          <div className="stat-item streak-item">
            <span className="stat-icon"><PixelIcon name="flame" size="small" /></span>
            <span className="stat-value">{stats.streak}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="header-actions">
          {onTogglePrediction && (
            <button 
              className={`btn btn-toggle btn-predict ${predictionEnabled ? 'active' : ''}`}
              onClick={onTogglePrediction}
              title={predictionEnabled 
                ? 'Human Prediction: ON - Guess opponent moves for bonus XP!' 
                : 'Human Prediction: OFF - Click to enable move prediction challenges'}
            >
              <span className="predict-icon">🧠</span>
              <span className="predict-label">
                {predictionEnabled ? 'Predicting' : 'Predict'}
              </span>
              <span className={`toggle-indicator ${predictionEnabled ? 'on' : 'off'}`}>
                {predictionEnabled ? 'ON' : 'OFF'}
              </span>
            </button>
          )}
          {onOpenWeaknessTracker && (
            <button className="btn btn-accent" onClick={onOpenWeaknessTracker}>
              <PixelIcon name="eye" size="small" />
              Weaknesses
            </button>
          )}
          <button className="btn btn-secondary" onClick={onNewGame}>
            <PixelIcon name="sparkle" size="small" />
            New Game
          </button>
        </div>
      </div>
    </header>
  );
};

