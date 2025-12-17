/**
 * Achievement Toast
 * Notification popup for newly unlocked achievements
 */

import React, { useEffect, useState } from 'react';
import { PixelIcon, PixelIconName } from './PixelIcon';
import './AchievementToast.css';

interface Achievement {
  id: string;
  name: string;
  flavorText: string;
  description: string;
  iconKey: string;
  xpReward: number;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
}

interface AchievementToastProps {
  achievement: Achievement | null;
  onDismiss: () => void;
  autoHideDuration?: number;
}

// Map iconKey to PixelIcon names
const ICON_MAP: Record<string, PixelIconName> = {
  shield: 'shield',
  sword: 'sword',
  crown: 'crown',
  eye: 'eye',
  flame: 'flame',
  star: 'star',
  trophy: 'trophy',
  gem: 'gem',
  skull: 'skull',
  phoenix: 'flame',
  book: 'scroll',
  key: 'star', // No key icon, use star
  default: 'trophy',
};

// Rarity colors
const RARITY_COLORS: Record<string, string> = {
  common: '#b8b8c8',
  uncommon: '#4ecdc4',
  rare: '#5a9cf5',
  epic: '#a855f7',
  legendary: '#c9a227',
};

export const AchievementToast: React.FC<AchievementToastProps> = ({
  achievement,
  onDismiss,
  autoHideDuration = 5000,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (achievement) {
      setIsVisible(true);
      setIsExiting(false);

      const timer = setTimeout(() => {
        setIsExiting(true);
        setTimeout(() => {
          setIsVisible(false);
          onDismiss();
        }, 300);
      }, autoHideDuration);

      return () => clearTimeout(timer);
    }
  }, [achievement, autoHideDuration, onDismiss]);

  if (!achievement || !isVisible) return null;

  const icon = ICON_MAP[achievement.iconKey] || ICON_MAP.default;
  const rarityColor = RARITY_COLORS[achievement.rarity];

  return (
    <div className={`achievement-toast ${isExiting ? 'exiting' : ''}`}>
      {/* Animated border */}
      <div 
        className="toast-border" 
        style={{ '--rarity-color': rarityColor } as React.CSSProperties}
      />

      {/* Content */}
      <div className="toast-content">
        {/* Icon */}
        <div className="toast-icon" style={{ color: rarityColor }}>
          <PixelIcon name={icon} size="large" />
        </div>

        {/* Text */}
        <div className="toast-text">
          <div className="toast-header">
            <span className="toast-label">Achievement Unlocked!</span>
            <span 
              className="toast-rarity"
              style={{ color: rarityColor }}
            >
              {achievement.rarity}
            </span>
          </div>
          
          <h3 className="toast-name">{achievement.name}</h3>
          <p className="toast-flavor">{achievement.flavorText}</p>
          
          <div className="toast-reward">
            <span className="xp-icon"><PixelIcon name="sparkle" size="small" /></span>
            <span className="xp-value">+{achievement.xpReward} XP</span>
          </div>
        </div>

        {/* Dismiss button */}
        <button className="toast-dismiss" onClick={onDismiss}>
          ✕
        </button>
      </div>

      {/* Progress bar */}
      <div 
        className="toast-progress"
        style={{ 
          animationDuration: `${autoHideDuration}ms`,
          backgroundColor: rarityColor,
        }}
      />
    </div>
  );
};

export default AchievementToast;

// Hook for managing achievement toasts
export const useAchievementToast = () => {
  const [queue, setQueue] = useState<Achievement[]>([]);
  const [current, setCurrent] = useState<Achievement | null>(null);

  // Show next achievement from queue
  useEffect(() => {
    if (!current && queue.length > 0) {
      setCurrent(queue[0]);
      setQueue(prev => prev.slice(1));
    }
  }, [current, queue]);

  const showAchievement = (achievement: Achievement) => {
    setQueue(prev => [...prev, achievement]);
  };

  const dismissCurrent = () => {
    setCurrent(null);
  };

  return {
    currentAchievement: current,
    showAchievement,
    dismissCurrent,
    queueLength: queue.length,
  };
};

