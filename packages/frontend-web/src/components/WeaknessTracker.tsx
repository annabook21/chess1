/**
 * WeaknessTracker Component
 * Analyzes player's move history to identify patterns in mistakes
 * and suggests targeted practice areas
 */

import { useState, useEffect, useMemo } from 'react';
import { 
  WeaknessProfile, 
  WeaknessCategory, 
  MoveRecord, 
  MoveQuality,
  GamePhase,
} from '@master-academy/contracts';
import { PixelIcon } from '../ui/castle/PixelIcon';
import { 
  calculateOverallAccuracy, 
  calculateAccuracyFromCentipawns,
  getAccuracyDescription,
} from '../utils/accuracy';
import './WeaknessTracker.css';

// Define tags locally to avoid ESM/CJS compatibility issues
const TACTICS_TAGS = [
  'fork',
  'pin',
  'skewer',
  'deflection',
  'discovered_attack',
  'double_attack',
  'removing_defender',
  'back_rank',
  'windmill',
] as const;

const STRATEGY_TAGS = [
  'development',
  'center_control',
  'open_file',
  'outpost',
  'pawn_break',
  'king_safety',
  'piece_activity',
  'weak_square',
  'pawn_structure',
  'improve_worst_piece',
] as const;

interface WeaknessTrackerProps {
  isOpen: boolean;
  onClose: () => void;
}

// Default empty profile
const createEmptyProfile = (): WeaknessProfile => ({
  userId: 'local',
  lastUpdated: Date.now(),
  totalMoves: 0,
  totalGames: 0,
  phaseAccuracy: {
    opening: { total: 0, accurate: 0, accuracy: 0 },
    middlegame: { total: 0, accurate: 0, accuracy: 0 },
    endgame: { total: 0, accurate: 0, accuracy: 0 },
  },
  conceptAccuracy: {},
  topWeaknesses: [],
  improvements: [],
  qualityDistribution: {
    brilliant: 0,
    great: 0,
    good: 0,
    book: 0,
    inaccuracy: 0,
    mistake: 0,
    blunder: 0,
  },
  recentMoves: [],
});

// Analyze move records to generate weakness profile
function analyzeWeaknesses(moves: MoveRecord[]): WeaknessProfile {
  const profile = createEmptyProfile();
  profile.totalMoves = moves.length;
  profile.totalGames = new Set(moves.map(m => m.gameId)).size;
  profile.recentMoves = moves.slice(-50); // Last 50 moves
  
  // Count by phase
  const phaseStats: Record<GamePhase, { total: number; accurate: number }> = {
    opening: { total: 0, accurate: 0 },
    middlegame: { total: 0, accurate: 0 },
    endgame: { total: 0, accurate: 0 },
  };
  
  // Count by concept
  const conceptStats: Record<string, { total: number; accurate: number; totalLoss: number }> = {};
  
  // Count quality distribution
  const qualityCounts: Record<MoveQuality, number> = {
    brilliant: 0, great: 0, good: 0, book: 0,
    inaccuracy: 0, mistake: 0, blunder: 0,
  };
  
  // Track missed tactics
  const missedTactics: Record<string, MoveRecord[]> = {};
  
  for (const move of moves) {
    // Phase accuracy
    phaseStats[move.phase].total++;
    if (move.quality === 'great' || move.quality === 'good' || move.quality === 'book' || move.quality === 'brilliant') {
      phaseStats[move.phase].accurate++;
    }
    
    // Quality distribution
    qualityCounts[move.quality]++;
    
    // Concept accuracy
    for (const concept of move.conceptTags) {
      if (!conceptStats[concept]) {
        conceptStats[concept] = { total: 0, accurate: 0, totalLoss: 0 };
      }
      conceptStats[concept].total++;
      if (move.delta >= -30) {
        conceptStats[concept].accurate++;
      } else {
        conceptStats[concept].totalLoss += Math.abs(move.delta);
      }
    }
    
    // Track missed tactics
    for (const tactic of move.missedTactics) {
      if (!missedTactics[tactic]) {
        missedTactics[tactic] = [];
      }
      missedTactics[tactic].push(move);
    }
  }
  
  // Calculate phase accuracy
  for (const phase of ['opening', 'middlegame', 'endgame'] as GamePhase[]) {
    const stats = phaseStats[phase];
    profile.phaseAccuracy[phase] = {
      total: stats.total,
      accurate: stats.accurate,
      accuracy: stats.total > 0 ? Math.round((stats.accurate / stats.total) * 100) : 0,
    };
  }
  
  // Calculate concept accuracy
  for (const [concept, stats] of Object.entries(conceptStats)) {
    profile.conceptAccuracy[concept] = {
      total: stats.total,
      accurate: stats.accurate,
      accuracy: stats.total > 0 ? Math.round((stats.accurate / stats.total) * 100) : 0,
      avgEvalLoss: stats.total - stats.accurate > 0 
        ? Math.round(stats.totalLoss / (stats.total - stats.accurate)) 
        : 0,
    };
  }
  
  profile.qualityDistribution = qualityCounts;
  
  // Generate top weaknesses
  const weaknesses: WeaknessCategory[] = [];
  
  // Add tactical weaknesses
  for (const tactic of TACTICS_TAGS) {
    const missed = missedTactics[tactic] || [];
    if (missed.length > 0) {
      const conceptData = conceptStats[tactic] || { total: 0, accurate: 0, totalLoss: 0 };
      weaknesses.push({
        id: tactic,
        name: formatConceptName(tactic),
        emoji: getTacticIcon(tactic) as any, // Type assertion: emoji can be ReactNode in UI
        description: getTacticDescription(tactic),
        occurrences: conceptData.total,
        missRate: conceptData.total > 0 
          ? Math.round(((conceptData.total - conceptData.accurate) / conceptData.total) * 100)
          : 0,
        avgEvalLoss: conceptData.total - conceptData.accurate > 0
          ? Math.round(conceptData.totalLoss / (conceptData.total - conceptData.accurate))
          : 0,
        trend: 'stable',
        recentMisses: missed.slice(-3),
      });
    }
  }
  
  // Add strategic weaknesses
  for (const strategy of STRATEGY_TAGS) {
    const conceptData = conceptStats[strategy];
    if (conceptData && conceptData.total >= 3) {
      const accuracy = conceptData.total > 0 
        ? Math.round((conceptData.accurate / conceptData.total) * 100) 
        : 0;
      const avgLoss = (conceptData.total - conceptData.accurate) > 0
        ? Math.round(conceptData.totalLoss / (conceptData.total - conceptData.accurate))
        : 0;
        
      if (accuracy < 70) {
        weaknesses.push({
          id: strategy,
          name: formatConceptName(strategy),
          emoji: getStrategyIcon(strategy) as any, // Type assertion: emoji can be ReactNode in UI
          description: getStrategyDescription(strategy),
          occurrences: conceptData.total,
          missRate: 100 - accuracy,
          avgEvalLoss: avgLoss,
          trend: 'stable',
          recentMisses: [],
        });
      }
    }
  }
  
  // Sort by impact (miss rate * occurrences * avg loss)
  weaknesses.sort((a, b) => {
    const impactA = a.missRate * a.occurrences * (a.avgEvalLoss / 100);
    const impactB = b.missRate * b.occurrences * (b.avgEvalLoss / 100);
    return impactB - impactA;
  });
  
  profile.topWeaknesses = weaknesses.slice(0, 5);
  
  return profile;
}

// Helper functions
function formatConceptName(concept: string): string {
  return concept
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function getTacticIcon(tactic: string): React.ReactNode {
  const icons: Record<string, React.ReactNode> = {
    fork: <PixelIcon name="sword" size="small" />,
    pin: <PixelIcon name="target" size="small" />,
    skewer: <PixelIcon name="sword" size="small" />,
    deflection: <PixelIcon name="bolt" size="small" />,
    discovered_attack: <PixelIcon name="eye" size="small" />,
    double_attack: <PixelIcon name="sword" size="small" />,
    removing_defender: <PixelIcon name="target" size="small" />,
    back_rank: <PixelIcon name="castle" size="small" />,
    windmill: <PixelIcon name="sparkle" size="small" />,
  };
  return icons[tactic] || <PixelIcon name="ghost" size="small" />;
}

function getStrategyIcon(strategy: string): React.ReactNode {
  const icons: Record<string, React.ReactNode> = {
    development: <PixelIcon name="arrow-up" size="small" />,
    center_control: <PixelIcon name="target" size="small" />,
    open_file: <PixelIcon name="file" size="small" />,
    outpost: <PixelIcon name="mountain" size="small" />,
    pawn_break: <PixelIcon name="explosion" size="small" />,
    king_safety: <PixelIcon name="shield" size="small" />,
    piece_activity: <PixelIcon name="bolt" size="small" />,
    weak_square: <PixelIcon name="hole" size="small" />,
    pawn_structure: <PixelIcon name="brick" size="small" />,
    improve_worst_piece: <PixelIcon name="arrow-up" size="small" />,
  };
  return icons[strategy] || <PixelIcon name="chart" size="small" />;
}

function getTacticDescription(tactic: string): string {
  const descriptions: Record<string, string> = {
    fork: 'Attack two pieces at once with a single piece',
    pin: 'Restrict a piece from moving because it shields a more valuable piece',
    skewer: 'Attack a valuable piece that must move, exposing a piece behind it',
    deflection: 'Force a piece away from defending a key square or piece',
    discovered_attack: 'Move a piece to reveal an attack from another piece behind it',
    double_attack: 'Create two threats simultaneously',
    removing_defender: 'Capture or chase away a piece defending a key target',
    back_rank: 'Exploit a king trapped on the back rank with no escape squares',
    windmill: 'Alternating discovered checks to win material',
  };
  return descriptions[tactic] || 'Tactical pattern';
}

function getStrategyDescription(strategy: string): string {
  const descriptions: Record<string, string> = {
    development: 'Getting your pieces into active positions early in the game',
    center_control: 'Controlling the central squares (d4, d5, e4, e5)',
    open_file: 'Using open files for rook activity',
    outpost: 'Placing a piece on a square where it cannot be attacked by pawns',
    pawn_break: 'Using pawn moves to open up the position',
    king_safety: 'Keeping your king safe, usually by castling',
    piece_activity: 'Ensuring all your pieces are actively placed',
    weak_square: 'Exploiting squares that cannot be defended by pawns',
    pawn_structure: 'Managing your pawn formation for long-term advantage',
    improve_worst_piece: 'Finding better squares for your least active piece',
  };
  return descriptions[strategy] || 'Strategic concept';
}

function getQualityColor(quality: MoveQuality): string {
  const colors: Record<MoveQuality, string> = {
    brilliant: '#26c6da',
    great: '#66bb6a',
    good: '#9ccc65',
    book: '#78909c',
    inaccuracy: '#ffca28',
    mistake: '#ffa726',
    blunder: '#ef5350',
  };
  return colors[quality];
}

function getQualityEmoji(quality: MoveQuality): string {
  const emojis: Record<MoveQuality, string> = {
    brilliant: '💎',
    great: '⭐',
    good: '✓',
    book: '📖',
    inaccuracy: '?!',
    mistake: '?',
    blunder: '??',
  };
  return emojis[quality];
}

export const WeaknessTracker: React.FC<WeaknessTrackerProps> = ({ isOpen, onClose }) => {
  const [profile, setProfile] = useState<WeaknessProfile>(createEmptyProfile);
  const [activeTab, setActiveTab] = useState<'overview' | 'tactics' | 'phases' | 'history'>('overview');
  
  // Load move history from localStorage
  useEffect(() => {
    const savedMoves = localStorage.getItem('masterAcademy_moveHistory');
    if (savedMoves) {
      try {
        const moves: MoveRecord[] = JSON.parse(savedMoves);
        const analyzed = analyzeWeaknesses(moves);
        setProfile(analyzed);
      } catch (e) {
        console.error('Failed to parse move history:', e);
      }
    }
  }, [isOpen]);
  
  // Calculate overall accuracy using Lichess-style harmonic mean
  const overallAccuracy = useMemo(() => {
    if (profile.recentMoves.length === 0) return 0;
    
    // Calculate per-move accuracies
    const moveAccuracies = profile.recentMoves.map(move => {
      // Use stored accuracy if available
      if (move.accuracy !== undefined) {
        return move.accuracy;
      }
      // Otherwise calculate from eval data
      // Determine if it was Black's move from FEN
      const isBlackMove = move.fen.includes(' b ');
      return calculateAccuracyFromCentipawns(move.evalBefore, move.evalAfter, isBlackMove);
    });
    
    // Use harmonic mean for overall accuracy (Lichess method)
    return calculateOverallAccuracy(moveAccuracies);
  }, [profile]);
  
  // Get accuracy description for display
  const accuracyDescription = useMemo(() => {
    return getAccuracyDescription(overallAccuracy);
  }, [overallAccuracy]);
  
  if (!isOpen) return null;
  
  return (
    <div className="weakness-tracker-overlay" onClick={onClose}>
      <div className="weakness-tracker-modal" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="wt-header">
          <div className="wt-header-left">
            <span className="wt-icon">🔍</span>
            <h2>Weakness Tracker</h2>
          </div>
          <button className="wt-close" onClick={onClose}>✕</button>
        </div>
        
        {/* Stats Summary */}
        <div className="wt-summary">
          <div className="wt-stat-card">
            <span className="wt-stat-value">{profile.totalMoves}</span>
            <span className="wt-stat-label">Moves Tracked</span>
          </div>
          <div className="wt-stat-card">
            <span className="wt-stat-value">{profile.totalGames}</span>
            <span className="wt-stat-label">Games Played</span>
          </div>
          <div className="wt-stat-card accent">
            <span className="wt-stat-value">{overallAccuracy}%</span>
            <span className="wt-stat-label">Overall Accuracy</span>
            <span className="wt-stat-sublabel">{accuracyDescription}</span>
          </div>
          <div className="wt-stat-card">
            <span className="wt-stat-value">{profile.topWeaknesses.length}</span>
            <span className="wt-stat-label">Areas to Improve</span>
          </div>
        </div>
        
        {/* Tabs */}
        <div className="wt-tabs">
          <button 
            className={`wt-tab ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            📊 Overview
          </button>
          <button 
            className={`wt-tab ${activeTab === 'tactics' ? 'active' : ''}`}
            onClick={() => setActiveTab('tactics')}
          >
            ⚔️ Weaknesses
          </button>
          <button 
            className={`wt-tab ${activeTab === 'phases' ? 'active' : ''}`}
            onClick={() => setActiveTab('phases')}
          >
            <PixelIcon name="chart" size="small" /> By Phase
          </button>
          <button 
            className={`wt-tab ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            📜 History
          </button>
        </div>
        
        {/* Content */}
        <div className="wt-content">
          {activeTab === 'overview' && (
            <div className="wt-overview">
              {/* Move Quality Distribution */}
              <div className="wt-section">
                <h3>Move Quality Distribution</h3>
                <div className="wt-quality-bars">
                  {(['brilliant', 'great', 'good', 'book', 'inaccuracy', 'mistake', 'blunder'] as MoveQuality[]).map(quality => {
                    const count = profile.qualityDistribution[quality];
                    const pct = profile.totalMoves > 0 ? (count / profile.totalMoves) * 100 : 0;
                    return (
                      <div key={quality} className="wt-quality-row">
                        <span className="wt-quality-label">
                          {getQualityEmoji(quality)} {formatConceptName(quality)}
                        </span>
                        <div className="wt-quality-bar-container">
                          <div 
                            className="wt-quality-bar" 
                            style={{ 
                              width: `${pct}%`,
                              backgroundColor: getQualityColor(quality),
                            }}
                          />
                        </div>
                        <span className="wt-quality-count">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              
              {/* Quick Insights */}
              <div className="wt-section">
                <h3>🎯 Quick Insights</h3>
                <div className="wt-insights">
                  {profile.topWeaknesses.length === 0 ? (
                    <div className="wt-empty">
                      <span className="wt-empty-icon">📊</span>
                      <p>Play more games to see your weakness patterns!</p>
                      <p className="wt-empty-sub">We analyze your moves to find areas for improvement.</p>
                    </div>
                  ) : (
                    <>
                      <div className="wt-insight">
                        <span className="wt-insight-icon">⚠️</span>
                        <div className="wt-insight-text">
                          <strong>Top weakness:</strong> {profile.topWeaknesses[0].name}
                          <span className="wt-insight-detail">
                            You miss this {profile.topWeaknesses[0].missRate}% of the time
                          </span>
                        </div>
                      </div>
                      
                      {profile.phaseAccuracy.endgame.total > 0 && (
                        <div className="wt-insight">
                          <span className="wt-insight-icon">
                            {profile.phaseAccuracy.endgame.accuracy >= 70 ? '✅' : '📉'}
                          </span>
                          <div className="wt-insight-text">
                            <strong>Endgame accuracy:</strong> {profile.phaseAccuracy.endgame.accuracy}%
                            <span className="wt-insight-detail">
                              {profile.phaseAccuracy.endgame.accuracy >= 70 
                                ? 'Great endgame technique!'
                                : 'Consider studying endgame fundamentals'}
                            </span>
                          </div>
                        </div>
                      )}
                      
                      <div className="wt-insight">
                        <span className="wt-insight-icon">
                          {profile.qualityDistribution.blunder < profile.totalMoves * 0.05 ? '🛡️' : '💥'}
                        </span>
                        <div className="wt-insight-text">
                          <strong>Blunder rate:</strong> {profile.totalMoves > 0 
                            ? Math.round((profile.qualityDistribution.blunder / profile.totalMoves) * 100)
                            : 0}%
                          <span className="wt-insight-detail">
                            {profile.qualityDistribution.blunder} blunders in {profile.totalMoves} moves
                          </span>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'tactics' && (
            <div className="wt-tactics">
              <h3>⚔️ Your Weaknesses</h3>
              {profile.topWeaknesses.length === 0 ? (
                <div className="wt-empty">
                  <span className="wt-empty-icon">🎯</span>
                  <p>No weaknesses detected yet!</p>
                  <p className="wt-empty-sub">Keep playing to build your profile.</p>
                </div>
              ) : (
                <div className="wt-weakness-list">
                  {profile.topWeaknesses.map((weakness, index) => (
                    <div key={weakness.id} className="wt-weakness-card">
                      <div className="wt-weakness-rank">#{index + 1}</div>
                      <div className="wt-weakness-main">
                        <div className="wt-weakness-header">
                          <span className="wt-weakness-emoji">{weakness.emoji}</span>
                          <span className="wt-weakness-name">{weakness.name}</span>
                          <span className={`wt-weakness-trend ${weakness.trend}`}>
                            {weakness.trend === 'improving' ? (
                              <PixelIcon name="arrow-up" size="small" className="pixel-icon--green" />
                            ) : weakness.trend === 'declining' ? (
                              <span style={{ transform: 'rotate(180deg)', display: 'inline-block' }}>
                                <PixelIcon name="arrow-up" size="small" className="pixel-icon--red" />
                              </span>
                            ) : (
                              <span style={{ transform: 'rotate(90deg)', display: 'inline-block' }}>
                                <PixelIcon name="bolt" size="small" className="pixel-icon--muted" />
                              </span>
                            )}
                          </span>
                        </div>
                        <p className="wt-weakness-desc">{weakness.description}</p>
                        <div className="wt-weakness-stats">
                          <div className="wt-weakness-stat">
                            <span className="wt-ws-label">Miss Rate</span>
                            <span className="wt-ws-value error">{weakness.missRate}%</span>
                          </div>
                          <div className="wt-weakness-stat">
                            <span className="wt-ws-label">Occurrences</span>
                            <span className="wt-ws-value">{weakness.occurrences}</span>
                          </div>
                          <div className="wt-weakness-stat">
                            <span className="wt-ws-label">Avg Loss</span>
                            <span className="wt-ws-value">{(weakness.avgEvalLoss / 100).toFixed(1)} pawns</span>
                          </div>
                        </div>
                      </div>
                      <button className="wt-practice-btn">
                        🎯 Practice
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          
          {activeTab === 'phases' && (
            <div className="wt-phases">
              <h3><PixelIcon name="chart" size="small" /> Accuracy by Game Phase</h3>
              <div className="wt-phase-cards">
                {(['opening', 'middlegame', 'endgame'] as GamePhase[]).map(phase => {
                  const data = profile.phaseAccuracy[phase];
                  const icon = phase === 'opening' ? '🚀' : phase === 'middlegame' ? '⚔️' : '👑';
                  return (
                    <div key={phase} className="wt-phase-card">
                      <div className="wt-phase-header">
                        <span className="wt-phase-icon">{icon}</span>
                        <span className="wt-phase-name">{formatConceptName(phase)}</span>
                      </div>
                      <div className="wt-phase-accuracy">
                        <svg className="wt-phase-ring" viewBox="0 0 100 100">
                          <circle 
                            cx="50" cy="50" r="45" 
                            fill="none" 
                            stroke="var(--bg-tertiary)" 
                            strokeWidth="8"
                          />
                          <circle 
                            cx="50" cy="50" r="45" 
                            fill="none" 
                            stroke={data.accuracy >= 70 ? 'var(--success)' : data.accuracy >= 50 ? 'var(--gold)' : 'var(--error)'}
                            strokeWidth="8"
                            strokeDasharray={`${data.accuracy * 2.83} 283`}
                            strokeLinecap="round"
                            transform="rotate(-90 50 50)"
                          />
                        </svg>
                        <span className="wt-phase-pct">{data.accuracy}%</span>
                      </div>
                      <div className="wt-phase-detail">
                        {data.accurate}/{data.total} accurate moves
                      </div>
                    </div>
                  );
                })}
              </div>
              
              <h3>🧠 Concept Breakdown</h3>
              <div className="wt-concept-grid">
                {Object.entries(profile.conceptAccuracy)
                  .filter(([, data]) => data.total >= 2)
                  .sort((a, b) => a[1].accuracy - b[1].accuracy)
                  .slice(0, 8)
                  .map(([concept, data]) => (
                    <div key={concept} className="wt-concept-item">
                      <span className="wt-concept-name">{formatConceptName(concept)}</span>
                      <div className="wt-concept-bar-bg">
                        <div 
                          className="wt-concept-bar-fill"
                          style={{ 
                            width: `${data.accuracy}%`,
                            backgroundColor: data.accuracy >= 70 ? 'var(--success)' : 
                              data.accuracy >= 50 ? 'var(--gold)' : 'var(--error)',
                          }}
                        />
                      </div>
                      <span className="wt-concept-pct">{data.accuracy}%</span>
                    </div>
                  ))}
              </div>
            </div>
          )}
          
          {activeTab === 'history' && (
            <div className="wt-history">
              <h3>📜 Recent Moves</h3>
              {profile.recentMoves.length === 0 ? (
                <div className="wt-empty">
                  <span className="wt-empty-icon">📜</span>
                  <p>No move history yet!</p>
                </div>
              ) : (
                <div className="wt-move-list">
                  {profile.recentMoves.slice().reverse().slice(0, 20).map((move, index) => (
                    <div key={move.id || index} className={`wt-move-row ${move.quality}`}>
                      <span className="wt-move-num">#{move.moveNumber}</span>
                      <span className="wt-move-san">{move.moveSan}</span>
                      <span 
                        className="wt-move-quality"
                        style={{ color: getQualityColor(move.quality) }}
                      >
                        {getQualityEmoji(move.quality)}
                      </span>
                      <span className={`wt-move-delta ${move.delta >= 0 ? 'positive' : 'negative'}`}>
                        {move.delta >= 0 ? '+' : ''}{(move.delta / 100).toFixed(2)}
                      </span>
                      <span className="wt-move-phase">{move.phase}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="wt-footer">
          <p className="wt-footer-tip">
            💡 Tip: Focus on your top weakness for fastest improvement!
          </p>
          <button 
            className="wt-reset-btn"
            onClick={() => {
              if (window.confirm('Reset all tracking data? This cannot be undone.')) {
                localStorage.removeItem('masterAcademy_moveHistory');
                setProfile(createEmptyProfile());
              }
            }}
          >
            🗑️ Reset Stats
          </button>
        </div>
      </div>
    </div>
  );
};

