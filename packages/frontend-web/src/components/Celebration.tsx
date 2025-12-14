/**
 * Celebration Component
 * Shows animated celebrations for good moves, great moves, and blunders
 */

import { useEffect, useState } from 'react';
import './Celebration.css';

interface CelebrationProps {
  type: 'good' | 'great' | 'blunder';
}

interface Particle {
  id: number;
  x: number;
  color: string;
  delay: number;
}

const COLORS = {
  good: ['#10b981', '#34d399', '#6ee7b7'],
  great: ['#f4d03f', '#fbbf24', '#d4af37', '#10b981'],
  blunder: ['#ef4444', '#f87171'],
};

const MESSAGES = {
  good: ['Nice!', 'Good move!', 'Well played!'],
  great: ['Brilliant!', 'Excellent!', '🔥 On fire!'],
  blunder: ['Oops!', 'Blunder!', 'Think again...'],
};

export const Celebration: React.FC<CelebrationProps> = ({ type }) => {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [message] = useState(() => {
    const msgs = MESSAGES[type];
    return msgs[Math.floor(Math.random() * msgs.length)];
  });

  useEffect(() => {
    if (type === 'blunder') return;

    // Create confetti particles
    const colors = COLORS[type];
    const newParticles: Particle[] = [];
    const count = type === 'great' ? 50 : 25;

    for (let i = 0; i < count; i++) {
      newParticles.push({
        id: i,
        x: Math.random() * 100,
        color: colors[Math.floor(Math.random() * colors.length)],
        delay: Math.random() * 0.5,
      });
    }

    setParticles(newParticles);
  }, [type]);

  return (
    <div className={`celebration-overlay ${type}`}>
      {/* Message */}
      <div className={`celebration-message ${type}`}>
        {type === 'great' && <span className="celebration-icon">⭐</span>}
        {type === 'good' && <span className="celebration-icon">✓</span>}
        {type === 'blunder' && <span className="celebration-icon">⚠️</span>}
        <span className="celebration-text">{message}</span>
      </div>

      {/* Confetti for good/great moves */}
      {type !== 'blunder' && (
        <div className="confetti-container">
          {particles.map(particle => (
            <div
              key={particle.id}
              className="confetti-particle"
              style={{
                left: `${particle.x}%`,
                backgroundColor: particle.color,
                animationDelay: `${particle.delay}s`,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};

