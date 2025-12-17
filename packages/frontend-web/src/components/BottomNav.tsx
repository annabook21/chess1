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
        title="Toggle human move prediction challenges"
      >
        <span className="bottom-nav-icon">🧠</span>
        <span className="bottom-nav-label">{predictionEnabled ? 'Predicting' : 'Predict'}</span>
        <span className={`bottom-nav-badge ${predictionEnabled ? 'on' : 'off'}`}>
          {predictionEnabled ? 'ON' : 'OFF'}
        </span>
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



