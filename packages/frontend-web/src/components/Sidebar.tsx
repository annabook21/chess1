/**
 * Sidebar Component
 * Shows move history, evaluation, and achievements
 */

import './Sidebar.css';

interface MoveHistoryEntry {
  moveNumber: number;
  white?: string;
  black?: string;
  eval?: number;
}

interface PlayerStats {
  xp: number;
  level: number;
  streak: number;
  gamesPlayed: number;
  goodMoves: number;
  blunders: number;
}

interface SidebarProps {
  moveHistory: MoveHistoryEntry[];
  playerStats: PlayerStats;
  currentEval: number;
}

// Achievement definitions
const ACHIEVEMENTS = [
  { id: 'first_game', icon: '🎮', name: 'First Steps', desc: 'Complete your first game', threshold: 1, stat: 'gamesPlayed' },
  { id: 'streak_3', icon: '🔥', name: 'On Fire', desc: '3 day streak', threshold: 3, stat: 'streak' },
  { id: 'good_10', icon: '🎯', name: 'Sharp Eye', desc: '10 good moves', threshold: 10, stat: 'goodMoves' },
  { id: 'games_5', icon: '🏆', name: 'Dedicated', desc: 'Play 5 games', threshold: 5, stat: 'gamesPlayed' },
  { id: 'level_5', icon: '⭐', name: 'Rising Star', desc: 'Reach level 5', threshold: 5, stat: 'level' },
  { id: 'good_50', icon: '💎', name: 'Master Mind', desc: '50 good moves', threshold: 50, stat: 'goodMoves' },
];

export const Sidebar: React.FC<SidebarProps> = ({ 
  moveHistory, 
  playerStats, 
  currentEval 
}) => {
  // Calculate eval bar position (centered at 50%)
  const evalPercentage = Math.min(Math.max(50 + currentEval / 10, 5), 95);

  const isAchievementUnlocked = (achievement: typeof ACHIEVEMENTS[0]) => {
    const value = playerStats[achievement.stat as keyof PlayerStats] as number;
    return value >= achievement.threshold;
  };

  return (
    <aside className="sidebar glass-card-elevated">
      {/* Evaluation Panel */}
      <div className="sidebar-section">
        <h3 className="sidebar-title">
          <span className="title-icon">📊</span>
          Evaluation
        </h3>
        <div className="eval-display">
          <div className="eval-bar-vertical">
            <div className="eval-bar-inner">
              <div 
                className="eval-white-portion" 
                style={{ height: `${evalPercentage}%` }}
              />
            </div>
          </div>
          <div className="eval-info">
            <div className={`eval-value ${currentEval > 0 ? 'positive' : currentEval < 0 ? 'negative' : ''}`}>
              {currentEval > 0 ? '+' : ''}{(currentEval / 100).toFixed(2)}
            </div>
            <div className="eval-label">
              {currentEval > 100 ? 'White is winning' : 
               currentEval < -100 ? 'Black is winning' : 
               'Equal position'}
            </div>
          </div>
        </div>
      </div>

      {/* Move History */}
      <div className="sidebar-section moves-section">
        <h3 className="sidebar-title">
          <span className="title-icon">📜</span>
          Move History
        </h3>
        <div className="move-history-container">
          {moveHistory.length === 0 ? (
            <div className="no-moves">
              <span className="no-moves-icon">♟️</span>
              <p>No moves yet</p>
            </div>
          ) : (
            <div className="move-list">
              {moveHistory.map((entry, idx) => (
                <div key={idx} className="move-row">
                  <span className="move-number">{entry.moveNumber}.</span>
                  <span className={`move-notation ${entry.white ? '' : 'empty'}`}>
                    {entry.white || '...'}
                  </span>
                  <span className={`move-notation ${entry.black ? '' : 'empty'}`}>
                    {entry.black || '...'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Achievements */}
      <div className="sidebar-section">
        <h3 className="sidebar-title">
          <span className="title-icon">🏅</span>
          Achievements
        </h3>
        <div className="achievements-grid">
          {ACHIEVEMENTS.map(achievement => {
            const unlocked = isAchievementUnlocked(achievement);
            return (
              <div 
                key={achievement.id}
                className={`achievement-item ${unlocked ? 'unlocked' : 'locked'}`}
                title={`${achievement.name}: ${achievement.desc}`}
              >
                <div className="achievement-icon">
                  {unlocked ? achievement.icon : '🔒'}
                </div>
                <div className="achievement-info">
                  <span className="achievement-name">{achievement.name}</span>
                  <span className="achievement-desc">{achievement.desc}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="sidebar-section stats-section">
        <div className="quick-stats">
          <div className="quick-stat">
            <span className="quick-stat-value">{playerStats.goodMoves}</span>
            <span className="quick-stat-label">Good Moves</span>
          </div>
          <div className="quick-stat">
            <span className="quick-stat-value">{playerStats.blunders}</span>
            <span className="quick-stat-label">Blunders</span>
          </div>
          <div className="quick-stat">
            <span className="quick-stat-value">{playerStats.xp}</span>
            <span className="quick-stat-label">XP</span>
          </div>
        </div>
      </div>
    </aside>
  );
};

