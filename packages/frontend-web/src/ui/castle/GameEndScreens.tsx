/**
 * Game End Screens
 * Sierra-style death/victory/draw screens
 * Memorable and dramatic, like Quest for Glory
 */

import React from 'react';
import { SpiritPortrait, SpiritMood } from './SpiritPortrait';
import './GameEndScreens.css';

interface GameEndScreenProps {
  /** XP earned this game */
  xpEarned: number;
  /** Moves played */
  movesPlayed: number;
  /** Accuracy percentage */
  accuracy: number;
  /** Best move in the game */
  bestMoveDescription?: string;
  /** Handler for try again */
  onTryAgain: () => void;
  /** Handler for return to map */
  onReturnToMap: () => void;
  /** Optional custom narration */
  narration?: string;
}

// ═══════════════════════════════════════════════════════════
// GAME OVER (Loss)
// ═══════════════════════════════════════════════════════════

const DEFEAT_NARRATIONS = [
  "Your king falls... but the curse ensures you shall return. Death is merely an inconvenience in these halls.",
  "*The spirit cackles* Another soul lost to hubris! Fear not, the castle remembers all who dare enter.",
  "The shadows claim your king. But worry not—in this cursed place, no defeat is truly final.",
  "Checkmate. Your pieces scatter like leaves in autumn. The spirit awaits your next attempt.",
];

export const GameOverScreen: React.FC<GameEndScreenProps> = ({
  xpEarned,
  movesPlayed,
  accuracy,
  onTryAgain,
  onReturnToMap,
  narration,
}) => {
  const defaultNarration = DEFEAT_NARRATIONS[Math.floor(Math.random() * DEFEAT_NARRATIONS.length)];
  
  return (
    <div className="game-end-screen game-end-screen--defeat">
      <div className="game-end-screen__overlay" />
      
      <div className="game-end-screen__content">
        {/* Spirit portrait */}
        <div className="game-end-screen__portrait">
          <SpiritPortrait mood="dismayed" size="large" animated />
        </div>
        
        {/* Title */}
        <h1 className="game-end-screen__title game-end-screen__title--defeat">
          ☠️ Defeat ☠️
        </h1>
        
        {/* Narration */}
        <div className="game-end-screen__narration">
          <p>{narration || defaultNarration}</p>
        </div>
        
        {/* Stats */}
        <div className="game-end-screen__stats">
          <StatItem label="Moves" value={movesPlayed} />
          <StatItem label="Accuracy" value={`${accuracy}%`} />
          <StatItem label="XP Earned" value={`+${xpEarned}`} highlight />
        </div>
        
        {/* Actions */}
        <div className="game-end-screen__actions">
          <button 
            className="game-end-btn game-end-btn--primary"
            onClick={onTryAgain}
          >
            ⚔️ Challenge Fate Again
          </button>
          <button 
            className="game-end-btn game-end-btn--secondary"
            onClick={onReturnToMap}
          >
            🏰 Flee to Castle
          </button>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════
// VICTORY
// ═══════════════════════════════════════════════════════════

const VICTORY_NARRATIONS = [
  "*The spirit bows* Most impressive! Your foe's king lies vanquished. The castle trembles with respect.",
  "Checkmate! The shadows themselves applaud your cunning. You have proven worthy this day.",
  "*Ancient bells toll* Victory! Your name shall echo through these haunted halls forevermore.",
  "The enemy king falls! Even I, bound eternally to these stones, must acknowledge your triumph.",
];

export const VictoryScreen: React.FC<GameEndScreenProps> = ({
  xpEarned,
  movesPlayed,
  accuracy,
  bestMoveDescription,
  onTryAgain,
  onReturnToMap,
  narration,
}) => {
  const defaultNarration = VICTORY_NARRATIONS[Math.floor(Math.random() * VICTORY_NARRATIONS.length)];
  
  return (
    <div className="game-end-screen game-end-screen--victory">
      <div className="game-end-screen__overlay game-end-screen__overlay--victory" />
      
      {/* Victory particles */}
      <div className="victory-particles">
        {[...Array(12)].map((_, i) => (
          <span key={i} className="victory-particle">✨</span>
        ))}
      </div>
      
      <div className="game-end-screen__content">
        {/* Spirit portrait */}
        <div className="game-end-screen__portrait">
          <SpiritPortrait mood="impressed" size="large" animated />
        </div>
        
        {/* Title */}
        <h1 className="game-end-screen__title game-end-screen__title--victory">
          👑 Victory! 👑
        </h1>
        
        {/* Narration */}
        <div className="game-end-screen__narration game-end-screen__narration--victory">
          <p>{narration || defaultNarration}</p>
        </div>
        
        {/* Best move highlight */}
        {bestMoveDescription && (
          <div className="game-end-screen__highlight">
            <span className="highlight-label">Brilliant Move:</span>
            <span className="highlight-value">{bestMoveDescription}</span>
          </div>
        )}
        
        {/* Stats */}
        <div className="game-end-screen__stats">
          <StatItem label="Moves" value={movesPlayed} />
          <StatItem label="Accuracy" value={`${accuracy}%`} highlight={accuracy >= 80} />
          <StatItem label="XP Earned" value={`+${xpEarned}`} highlight />
        </div>
        
        {/* Actions */}
        <div className="game-end-screen__actions">
          <button 
            className="game-end-btn game-end-btn--primary game-end-btn--victory"
            onClick={onTryAgain}
          >
            ⚔️ Seek New Challenges
          </button>
          <button 
            className="game-end-btn game-end-btn--secondary"
            onClick={onReturnToMap}
          >
            🏰 Return to Castle
          </button>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════
// DRAW
// ═══════════════════════════════════════════════════════════

const DRAW_NARRATIONS = [
  "*The spirit scratches ethereal head* The fates are... indecisive. How peculiar.",
  "Neither victory nor defeat. The universe itself seems confused by this outcome.",
  "A stalemate? How delightfully anticlimactic! The curse appreciates irony.",
  "*The spirit yawns* Both kings survive. The shadows find this... acceptable, I suppose.",
];

export const DrawScreen: React.FC<GameEndScreenProps> = ({
  xpEarned,
  movesPlayed,
  accuracy,
  onTryAgain,
  onReturnToMap,
  narration,
}) => {
  const defaultNarration = DRAW_NARRATIONS[Math.floor(Math.random() * DRAW_NARRATIONS.length)];
  
  return (
    <div className="game-end-screen game-end-screen--draw">
      <div className="game-end-screen__overlay" />
      
      <div className="game-end-screen__content">
        {/* Spirit portrait */}
        <div className="game-end-screen__portrait">
          <SpiritPortrait mood="thinking" size="large" animated />
        </div>
        
        {/* Title */}
        <h1 className="game-end-screen__title game-end-screen__title--draw">
          ⚖️ Draw ⚖️
        </h1>
        
        {/* Narration */}
        <div className="game-end-screen__narration">
          <p>{narration || defaultNarration}</p>
        </div>
        
        {/* Stats */}
        <div className="game-end-screen__stats">
          <StatItem label="Moves" value={movesPlayed} />
          <StatItem label="Accuracy" value={`${accuracy}%`} />
          <StatItem label="XP Earned" value={`+${xpEarned}`} />
        </div>
        
        {/* Actions */}
        <div className="game-end-screen__actions">
          <button 
            className="game-end-btn game-end-btn--primary"
            onClick={onTryAgain}
          >
            ⚔️ Try Again
          </button>
          <button 
            className="game-end-btn game-end-btn--secondary"
            onClick={onReturnToMap}
          >
            🏰 Return to Castle
          </button>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════
// HELPER COMPONENTS
// ═══════════════════════════════════════════════════════════

interface StatItemProps {
  label: string;
  value: string | number;
  highlight?: boolean;
}

const StatItem: React.FC<StatItemProps> = ({ label, value, highlight }) => (
  <div className={`stat-item ${highlight ? 'stat-item--highlight' : ''}`}>
    <span className="stat-item__label">{label}</span>
    <span className="stat-item__value">{value}</span>
  </div>
);

export default { GameOverScreen, VictoryScreen, DrawScreen };
