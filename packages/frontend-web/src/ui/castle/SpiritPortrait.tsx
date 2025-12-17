/**
 * Spirit Portrait
 * Animated portrait that reacts to move severity
 * Based on Quest for Glory IV's expressive character portraits
 * 
 * Uses CSS pixel art sprites instead of emojis for authentic retro look
 */

import React from 'react';
import './SpiritPortrait.css';
import './PixelSprites.css';

export type SpiritMood = 
  | 'neutral'   // Default state
  | 'pleased'   // Good move
  | 'impressed' // Great/brilliant move
  | 'concerned' // Bad move
  | 'dismayed'  // Terrible blunder
  | 'thinking'  // Processing
  | 'excited';  // Prediction correct

interface SpiritPortraitProps {
  mood: SpiritMood;
  size?: 'small' | 'medium' | 'large';
  animated?: boolean;
  /** Use emoji fallback instead of CSS sprites */
  useEmoji?: boolean;
}

/** Map mood to emoji expression (fallback) */
const MOOD_EXPRESSIONS: Record<SpiritMood, string> = {
  neutral: '👻',
  pleased: '😊',
  impressed: '🤩',
  concerned: '😟',
  dismayed: '😱',
  thinking: '🤔',
  excited: '🎉',
};

/** Map mood to glow color */
const MOOD_COLORS: Record<SpiritMood, string> = {
  neutral: 'var(--castle-accent1)',
  pleased: 'var(--castle-success)',
  impressed: 'var(--castle-accent2)',
  concerned: 'var(--castle-warning)',
  dismayed: 'var(--castle-danger)',
  thinking: 'var(--castle-info)',
  excited: 'var(--castle-accent2)',
};

/** Map mood to animation */
const MOOD_ANIMATIONS: Record<SpiritMood, string> = {
  neutral: 'spirit-float',
  pleased: 'spirit-nod',
  impressed: 'spirit-glow',
  concerned: 'spirit-shake',
  dismayed: 'spirit-recoil',
  thinking: 'spirit-ponder',
  excited: 'spirit-celebrate',
};

export const SpiritPortrait: React.FC<SpiritPortraitProps> = ({
  mood,
  size = 'medium',
  animated = true,
  useEmoji = false,
}) => {
  const expression = MOOD_EXPRESSIONS[mood];
  const glowColor = MOOD_COLORS[mood];
  const animation = animated ? MOOD_ANIMATIONS[mood] : undefined;
  
  // Map size to CSS class modifier
  const sizeClass = size === 'small' ? 'spirit-face--small' : 
                    size === 'large' ? 'spirit-face--large' : '';
  
  return (
    <div 
      className={`spirit-portrait spirit-portrait--${size} spirit-portrait--${mood}`}
      style={{ '--spirit-glow': glowColor } as React.CSSProperties}
    >
      <div className="spirit-portrait__frame">
        {useEmoji ? (
          // Emoji fallback
        <div 
          className={`spirit-portrait__face ${animation ? `spirit-portrait__face--${animation}` : ''}`}
        >
          {expression}
        </div>
        ) : (
          // CSS pixel art sprite
          <div 
            className={`spirit-face spirit-face--${mood} ${sizeClass} ${animation ? `spirit-portrait__face--${animation}` : ''}`}
            role="img"
            aria-label={`Spirit feeling ${mood}`}
          />
        )}
        
        {/* Ethereal glow effect */}
        <div className="spirit-portrait__glow" />
        
        {/* Particle effects for impressive/excited moods - CSS only */}
        {(mood === 'impressed' || mood === 'excited') && (
          <div className="spirit-portrait__particles">
            <span className="particle pixel-icon--star pixel-icon--small" />
            <span className="particle pixel-icon--star pixel-icon--small" />
            <span className="particle pixel-icon--star pixel-icon--small" />
          </div>
        )}
      </div>
    </div>
  );
};

/** Convert severity to spirit mood */
export const severityToMood = (
  severity: 'neutral' | 'good' | 'great' | 'bad' | 'terrible'
): SpiritMood => {
  switch (severity) {
    case 'great': return 'impressed';
    case 'good': return 'pleased';
    case 'bad': return 'concerned';
    case 'terrible': return 'dismayed';
    default: return 'neutral';
  }
};

export default SpiritPortrait;


