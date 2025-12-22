/**
 * ActionBar Component
 * Unified action bar that works on both mobile and desktop
 * 
 * Features:
 * - Transparent glassmorphism styling (as requested)
 * - Adapts based on view configuration
 * - All action buttons functional
 * - Clean, uncluttered design
 */

import { ViewConfig } from '../config/viewConfig';
import './ActionBar.css';

interface ActionBarProps {
  /** View configuration */
  config: ViewConfig;
  /** Prediction mode state */
  predictionEnabled: boolean;
  /** Toggle prediction mode */
  onTogglePrediction: () => void;
  /** Open weakness tracker */
  onOpenWeaknessTracker: () => void;
  /** Start new game */
  onNewGame: () => void;
  /** Open settings panel */
  onOpenSettings?: () => void;
  /** Open castle map */
  onOpenCastleMap?: () => void;
}

export const ActionBar: React.FC<ActionBarProps> = ({
  config,
  predictionEnabled,
  onTogglePrediction,
  onOpenWeaknessTracker,
  onNewGame,
  onOpenSettings,
  onOpenCastleMap,
}) => {
  const { actionBar } = config;
  
  if (!actionBar.visible) {
    return null;
  }
  
  // Map action IDs to handlers
  const handleAction = (actionId: string) => {
    switch (actionId) {
      case 'predict':
        onTogglePrediction();
        break;
      case 'analyze':
        onOpenWeaknessTracker();
        break;
      case 'newGame':
        onNewGame();
        break;
      case 'settings':
        onOpenSettings?.();
        break;
      case 'map':
        onOpenCastleMap?.();
        break;
      default:
        console.warn(`Unknown action: ${actionId}`);
    }
  };
  
  // Check if an action is in active/on state
  const isActionActive = (actionId: string): boolean => {
    if (actionId === 'predict') {
      return predictionEnabled;
    }
    return false;
  };
  
  return (
    <nav 
      className={`action-bar-unified ${actionBar.transparent ? 'transparent' : ''} ${actionBar.compact ? 'compact' : ''}`}
      data-position={actionBar.position}
    >
      <div className="action-bar-content">
        {actionBar.actions
          .filter(action => action.visible)
          .map(action => (
            <button
              key={action.id}
              className={`action-bar-button ${action.primary ? 'primary' : ''} ${isActionActive(action.id) ? 'active' : ''}`}
              onClick={() => handleAction(action.id)}
              title={action.label}
              data-action={action.id}
              data-type={action.type || 'button'}
            >
              <span className="action-bar-icon">{action.icon}</span>
              {!actionBar.compact && (
                <span className="action-bar-label">{action.label}</span>
              )}
              {action.type === 'toggle' && (
                <span className={`action-bar-toggle-indicator ${isActionActive(action.id) ? 'on' : 'off'}`}>
                  {isActionActive(action.id) ? 'ON' : 'OFF'}
                </span>
              )}
            </button>
          ))}
      </div>
    </nav>
  );
};

export default ActionBar;
