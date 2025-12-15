/**
 * BottomNav Component
 * Fixed bottom navigation bar for mobile devices
 */

import './BottomNav.css';

interface BottomNavProps {
  predictionEnabled: boolean;
  onTogglePrediction: () => void;
  onOpenWeaknessTracker: () => void;
  onNewGame: () => void;
  activeTab?: 'play' | 'predict' | 'analyze';
}

export const BottomNav: React.FC<BottomNavProps> = ({
  predictionEnabled,
  onTogglePrediction,
  onOpenWeaknessTracker,
  onNewGame,
}) => {
  return (
    <nav className="bottom-nav">
      <button 
        className={`bottom-nav-item ${predictionEnabled ? 'active' : ''}`}
        onClick={onTogglePrediction}
      >
        <span className="bottom-nav-icon">🧠</span>
        <span className="bottom-nav-label">Predict</span>
        {predictionEnabled && <span className="bottom-nav-badge">ON</span>}
      </button>
      
      <button 
        className="bottom-nav-item"
        onClick={onOpenWeaknessTracker}
      >
        <span className="bottom-nav-icon">🔍</span>
        <span className="bottom-nav-label">Analyze</span>
      </button>
      
      <button 
        className="bottom-nav-item bottom-nav-primary"
        onClick={onNewGame}
      >
        <span className="bottom-nav-icon">🔄</span>
        <span className="bottom-nav-label">New Game</span>
      </button>
    </nav>
  );
};
