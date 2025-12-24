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
  // Calculate XP progress within current level (0-100%)
  const xpForCurrentLevel = (stats.level - 1) * 100; // XP needed to reach current level
  const xpForNextLevel = stats.level * 100; // XP needed for next level
  const xpInCurrentLevel = Math.max(0, stats.xp - xpForCurrentLevel); // XP earned in current level
  const xpNeededForLevel = xpForNextLevel - xpForCurrentLevel; // XP needed to level up
  const xpProgress = Math.min(100, (xpInCurrentLevel / xpNeededForLevel) * 100);

  // Calculate skill rating from performance metrics
  const calculateSkillRating = (): number => {
    if (stats.totalMoves === 0) return 1200; // Default rating

    const baseRating = 1200;

    // Accuracy bonus: ±500 points based on move accuracy
    const accuracyPercent = stats.totalMoves > 0
      ? (stats.accurateMoves / stats.totalMoves) * 100
      : 50;
    const accuracyBonus = (accuracyPercent - 50) * 10;

    // Consistency bonus: Up to +200 for win streaks
    const consistencyBonus = Math.min(stats.streak * 10, 200);

    // Games played factor: Small bonus for experience
    const experienceBonus = Math.min(stats.gamesPlayed * 5, 100);

    return Math.round(baseRating + accuracyBonus + consistencyBonus + experienceBonus);
  };

  const skillRating = calculateSkillRating();

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
              <span className="stat-value rating-value">{skillRating}</span>
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
              aria-pressed={predictionEnabled}
              title={predictionEnabled
                ? 'Human Prediction: ON - Guess opponent moves for bonus XP!'
                : 'Human Prediction: OFF - Click to enable move prediction challenges'}
            >
              <span className="predict-icon">
                {predictionEnabled ? '🧠' : '💤'}
              </span>
              <span className="predict-label">
                Human Prediction
              </span>
              {predictionEnabled && (
                <span className="pulse-dot" aria-hidden="true" />
              )}
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

