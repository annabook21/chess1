/**
 * Celebration Component
 * Premium animated celebrations for good moves, great moves, and blunders
 */

import { useEffect, useState } from 'react';
import './Celebration.css';

interface CelebrationProps {
  type: 'good' | 'great' | 'blunder';
}

interface Particle {
  id: number;
  x: number;
  y: number;
  color: string;
  delay: number;
  size: number;
  rotation: number;
  velocity: number;
}

interface Sparkle {
  id: number;
  x: number;
  y: number;
  delay: number;
}

const COLORS = {
  good: ['#10b981', '#34d399', '#6ee7b7', '#a7f3d0'],
  great: ['#f4d03f', '#fbbf24', '#d4af37', '#10b981', '#8b5cf6', '#ec4899'],
  blunder: ['#ef4444', '#f87171', '#fca5a5'],
};

const MESSAGES = {
  good: ['Nice!', 'Good move!', 'Well played!', 'Solid!'],
  great: ['Brilliant!', 'Excellent!', '🔥 On fire!', 'Masterful!', 'Perfect!'],
  blunder: ['Oops!', 'Blunder!', 'Think again...', 'Mistake!'],
};

const ICONS = {
  good: '✓',
  great: '⭐',
  blunder: '✗',
};

export const Celebration: React.FC<CelebrationProps> = ({ type }) => {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [sparkles, setSparkles] = useState<Sparkle[]>([]);
  const [message] = useState(() => {
    const msgs = MESSAGES[type];
    return msgs[Math.floor(Math.random() * msgs.length)];
  });

  useEffect(() => {
    // Create confetti particles for good/great moves
    if (type !== 'blunder') {
      const colors = COLORS[type];
      const newParticles: Particle[] = [];
      const count = type === 'great' ? 60 : 30;

      for (let i = 0; i < count; i++) {
        newParticles.push({
          id: i,
          x: Math.random() * 100,
          y: -10 - Math.random() * 20,
          color: colors[Math.floor(Math.random() * colors.length)],
          delay: Math.random() * 0.6,
          size: 6 + Math.random() * 8,
          rotation: Math.random() * 360,
          velocity: 0.5 + Math.random() * 0.5,
        });
      }

      setParticles(newParticles);

      // Create sparkles for great moves
      if (type === 'great') {
        const newSparkles: Sparkle[] = [];
        for (let i = 0; i < 12; i++) {
          newSparkles.push({
            id: i,
            x: 20 + Math.random() * 60,
            y: 20 + Math.random() * 60,
            delay: Math.random() * 1.5,
          });
        }
        setSparkles(newSparkles);
      }
    }
  }, [type]);

  return (
    <div className={`celebration-overlay ${type}`}>
      {/* Background flash */}
      <div className={`celebration-flash ${type}`} />
      
      {/* Message */}
      <div className={`celebration-message ${type}`}>
        <span className="celebration-icon">{ICONS[type]}</span>
        <span className="celebration-text">{message}</span>
        {type === 'great' && <span className="celebration-sparkle">✨</span>}
      </div>

      {/* Confetti particles */}
      {type !== 'blunder' && (
        <div className="confetti-container">
          {particles.map(particle => (
            <div
              key={particle.id}
              className="confetti-particle"
              style={{
                left: `${particle.x}%`,
                top: `${particle.y}%`,
                backgroundColor: particle.color,
                animationDelay: `${particle.delay}s`,
                width: `${particle.size}px`,
                height: `${particle.size}px`,
                transform: `rotate(${particle.rotation}deg)`,
                animationDuration: `${2.5 / particle.velocity}s`,
              }}
            />
          ))}
        </div>
      )}

      {/* Extra sparkles for great moves */}
      {type === 'great' && (
        <div className="sparkles-container">
          {sparkles.map(sparkle => (
            <div
              key={sparkle.id}
              className="sparkle"
              style={{
                left: `${sparkle.x}%`,
                top: `${sparkle.y}%`,
                animationDelay: `${sparkle.delay}s`,
              }}
            >
              ✦
            </div>
          ))}
        </div>
      )}

      {/* Ring burst effect for great moves */}
      {type === 'great' && (
        <div className="ring-burst">
          <div className="ring ring-1" />
          <div className="ring ring-2" />
          <div className="ring ring-3" />
        </div>
      )}
    </div>
  );
};
