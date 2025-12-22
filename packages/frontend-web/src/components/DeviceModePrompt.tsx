/**
 * DeviceModePrompt Component
 * Modal that prompts users to choose their preferred viewing mode (mobile/desktop)
 * 
 * Shows on first visit to let users explicitly choose their preferred layout,
 * rather than relying solely on automatic detection.
 */

import { DeviceMode } from '../hooks/useDeviceMode';
import './DeviceModePrompt.css';

interface DeviceModePromptProps {
  /** Currently auto-detected mode */
  autoDetectedMode: DeviceMode;
  /** Called when user selects a mode */
  onSelectMode: (mode: DeviceMode) => void;
  /** Called when user dismisses without choosing */
  onDismiss: () => void;
}

export const DeviceModePrompt: React.FC<DeviceModePromptProps> = ({
  autoDetectedMode,
  onSelectMode,
  onDismiss,
}) => {
  return (
    <div className="device-prompt-overlay">
      <div className="device-prompt-modal">
        <div className="device-prompt-header">
          <span className="device-prompt-icon">🎮</span>
          <h2>Choose Your View</h2>
          <p>Select the layout that best fits your device</p>
        </div>
        
        <div className="device-prompt-options">
          {/* Mobile Option */}
          <button
            className={`device-option ${autoDetectedMode === 'mobile' ? 'recommended' : ''}`}
            onClick={() => onSelectMode('mobile')}
          >
            <div className="device-option-icon">📱</div>
            <div className="device-option-content">
              <h3>Mobile View</h3>
              <p>Touch-friendly layout with bottom navigation</p>
              <ul>
                <li>Large touch targets</li>
                <li>Bottom action bar</li>
                <li>Full-screen board</li>
              </ul>
            </div>
            {autoDetectedMode === 'mobile' && (
              <span className="recommended-badge">Recommended</span>
            )}
          </button>
          
          {/* Desktop Option */}
          <button
            className={`device-option ${autoDetectedMode === 'desktop' ? 'recommended' : ''}`}
            onClick={() => onSelectMode('desktop')}
          >
            <div className="device-option-icon">🖥️</div>
            <div className="device-option-content">
              <h3>Desktop View</h3>
              <p>Full layout with sidebar and detailed info</p>
              <ul>
                <li>Move history sidebar</li>
                <li>Evaluation bar</li>
                <li>Keyboard shortcuts</li>
              </ul>
            </div>
            {autoDetectedMode === 'desktop' && (
              <span className="recommended-badge">Recommended</span>
            )}
          </button>
        </div>
        
        <div className="device-prompt-footer">
          <button className="device-prompt-skip" onClick={onDismiss}>
            Use Auto-Detect ({autoDetectedMode})
          </button>
          <p className="device-prompt-hint">
            You can change this later in Settings
          </p>
        </div>
      </div>
    </div>
  );
};

export default DeviceModePrompt;
