/**
 * BoardFrame - War Table Aesthetic
 * CSS-only ornate frame inspired by Sierra adventure games
 * Wraps the chessboard in a medieval castle war table style
 */

import React from 'react';
import './BoardFrame.css';

interface BoardFrameProps {
  children: React.ReactNode;
  /** Show corner torches with flickering animation */
  showTorches?: boolean;
  /** Frame style variant */
  variant?: 'stone' | 'brass' | 'wood';
  /** Size of the frame */
  size?: 'compact' | 'standard' | 'large';
}

export const BoardFrame: React.FC<BoardFrameProps> = ({
  children,
  showTorches = true,
  variant = 'stone',
  size = 'standard',
}) => {
  return (
    <div className={`board-frame board-frame--${variant} board-frame--${size}`}>
      {/* Outer decorative border */}
      <div className="board-frame__outer">
        {/* Corner ornaments */}
        <div className="board-frame__corner board-frame__corner--tl">
          {showTorches && <TorchSconce position="tl" />}
        </div>
        <div className="board-frame__corner board-frame__corner--tr">
          {showTorches && <TorchSconce position="tr" />}
        </div>
        <div className="board-frame__corner board-frame__corner--bl">
          <CornerOrnament />
        </div>
        <div className="board-frame__corner board-frame__corner--br">
          <CornerOrnament />
        </div>
        
        {/* Inner frame with beveled edges */}
        <div className="board-frame__inner">
          {/* Board content */}
          <div className="board-frame__content">
            {children}
          </div>
        </div>
        
        {/* Edge runes/decorations */}
        <div className="board-frame__edge board-frame__edge--top">
          <EdgeDecoration />
        </div>
        <div className="board-frame__edge board-frame__edge--bottom">
          <EdgeDecoration />
        </div>
      </div>
    </div>
  );
};

/** Torch sconce with flickering flame effect */
const TorchSconce: React.FC<{ position: 'tl' | 'tr' }> = ({ position }) => {
  return (
    <div className={`torch-sconce torch-sconce--${position}`}>
      <div className="torch-sconce__bracket">⚜</div>
      <div className="torch-sconce__flame">
        <span className="flame-core">🔥</span>
        <div className="flame-glow" />
      </div>
    </div>
  );
};

/** Corner ornament - subtle accent */
const CornerOrnament: React.FC = () => {
  return (
    <div className="corner-ornament">
      <span className="corner-ornament__icon"></span>
    </div>
  );
};

/** Edge decoration - subtle line */
const EdgeDecoration: React.FC = () => {
  return (
    <div className="edge-decoration">
      <span className="edge-decoration__rune"></span>
    </div>
  );
};

export default BoardFrame;
