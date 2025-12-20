/**
 * Quest for Grandmaster Logo
 * Sierra-style ornate title card with pixel art illustration
 */

import React from 'react';
import './Logo.css';

interface LogoProps {
  size?: 'small' | 'medium' | 'large';
  showTitle?: boolean;
  showSubtitle?: boolean;
}

export const Logo: React.FC<LogoProps> = ({
  size = 'medium',
  showTitle = true,
  showSubtitle = true,
}) => {
  return (
    <div className={`qfg-logo qfg-logo--${size}`}>
      {/* Sierra-style ornate frame with illustration */}
      <div className="qfg-logo__frame">
        {/* Corner decorations */}
        <div className="qfg-logo__corner qfg-logo__corner--tl" />
        <div className="qfg-logo__corner qfg-logo__corner--tr" />
        <div className="qfg-logo__corner qfg-logo__corner--bl" />
        <div className="qfg-logo__corner qfg-logo__corner--br" />
        
        {/* The full illustration - no cropping */}
        <div className="qfg-logo__illustration">
          <img
            src="/logo-dragon.png"
            alt="A brave knight faces a fearsome dragon"
            className="qfg-logo__art"
          />
        </div>
        
        {/* Title banner overlay - like Sierra title screens */}
        {showTitle && (
          <div className="qfg-logo__banner">
            <div className="qfg-logo__banner-inner">
              <h1 className="qfg-logo__title">Quest for Grandmaster</h1>
              {showSubtitle && (
                <p className="qfg-logo__subtitle">~ A Chess Adventure ~</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Smaller inline logo for header - pixel art knight chess piece
export const LogoMark: React.FC<{ size?: number }> = ({ size = 32 }) => {
  return (
    <div className="qfg-logomark" style={{ width: size, height: size }}>
      <img
        src="/logo-knight.png"
        alt="Knight"
        style={{
          width: size,
          height: size,
          objectFit: 'contain',
          imageRendering: 'pixelated',
        }}
      />
    </div>
  );
};

export default Logo;







