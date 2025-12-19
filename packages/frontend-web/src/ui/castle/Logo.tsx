/**
 * Quest for Grandmaster Logo
 * Pixel art chess queen with title
 */

import React from 'react';
import './Logo.css';

interface LogoProps {
  size?: 'small' | 'medium' | 'large';
  showTitle?: boolean;
  showSubtitle?: boolean;
}

// 16x16 pixel art dragon - fierce and fantasy-themed
const DRAGON_PIXELS = `
0000011000000000
0000111100000000
0001111110000000
0011111111100000
0111101111110000
1111100111111100
1111100011111110
0111110011110110
0011111111100000
0001111111000000
0000111110000000
0000011111000000
0000001111100000
0000000111110000
0000000011100000
0000000001000000
`.trim().split('\n').map(row => row.trim());

// Dragon eye and flame accent positions
const ACCENT_POSITIONS = [
  { x: 5, y: 2, color: '#fbbf24' },  // Eye (gold)
  { x: 14, y: 5, color: '#f97316' }, // Flame tip (orange)
  { x: 13, y: 6, color: '#fbbf24' }, // Flame (gold)
];

export const Logo: React.FC<LogoProps> = ({
  size = 'medium',
  showTitle = true,
  showSubtitle = true,
}) => {
  const pixelSize = size === 'small' ? 2 : size === 'medium' ? 3 : 4;
  const svgSize = 16 * pixelSize;

  return (
    <div className={`qfg-logo qfg-logo--${size}`}>
      {/* Pixel Art Dragon */}
      <svg
        className="qfg-logo__dragon"
        width={svgSize}
        height={svgSize}
        viewBox="0 0 16 16"
        style={{ imageRendering: 'pixelated' }}
      >
        {/* Main dragon shape */}
        {DRAGON_PIXELS.map((row, y) =>
          row.split('').map((pixel, x) =>
            pixel === '1' ? (
              <rect
                key={`${x}-${y}`}
                x={x}
                y={y}
                width={1}
                height={1}
                fill="var(--logo-dragon-color, #dc2626)"
              />
            ) : null
          )
        )}
        
        {/* Eye and flame accents */}
        {ACCENT_POSITIONS.map((pos, i) => (
          <rect
            key={`accent-${i}`}
            x={pos.x}
            y={pos.y}
            width={1}
            height={1}
            fill={pos.color}
          />
        ))}
      </svg>

      {/* Title Text */}
      {showTitle && (
        <div className="qfg-logo__text">
          <h1 className="qfg-logo__title">Quest for Grandmaster</h1>
          {showSubtitle && (
            <p className="qfg-logo__subtitle">Learn from the Legends</p>
          )}
        </div>
      )}
    </div>
  );
};

// Smaller inline logo for header
export const LogoMark: React.FC<{ size?: number }> = ({ size = 32 }) => {
  return (
    <svg
      className="qfg-logomark"
      width={size}
      height={size}
      viewBox="0 0 16 16"
      style={{ imageRendering: 'pixelated' }}
    >
      {DRAGON_PIXELS.map((row, y) =>
        row.split('').map((pixel, x) =>
          pixel === '1' ? (
            <rect
              key={`${x}-${y}`}
              x={x}
              y={y}
              width={1}
              height={1}
              fill="var(--logo-dragon-color, #dc2626)"
            />
          ) : null
        )
      )}
      {ACCENT_POSITIONS.map((pos, i) => (
        <rect
          key={`accent-${i}`}
          x={pos.x}
          y={pos.y}
          width={1}
          height={1}
          fill={pos.color}
        />
      ))}
    </svg>
  );
};

export default Logo;


