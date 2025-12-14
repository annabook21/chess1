/**
 * Feedback Component
 * Shows coaching feedback with beautiful styling
 */

import { MoveFeedback } from '@master-academy/contracts';
import './Feedback.css';

interface FeedbackProps {
  feedback: MoveFeedback | null;
}

const MASTER_NAMES: Record<string, { name: string; color: string }> = {
  capablanca: { name: 'Capablanca', color: '#f4d03f' },
  tal: { name: 'Tal', color: '#ef4444' },
  karpov: { name: 'Karpov', color: '#3b82f6' },
  fischer: { name: 'Fischer', color: '#10b981' },
};

export const Feedback: React.FC<FeedbackProps> = ({ feedback }) => {
  if (!feedback) return null;

  const getMasterInfo = (styleId: string) => {
    return MASTER_NAMES[styleId] || { name: styleId, color: '#888' };
  };

  const getDeltaClass = (delta: number): string => {
    if (delta > 50) return 'excellent';
    if (delta > 0) return 'good';
    if (delta > -100) return 'neutral';
    return 'bad';
  };

  const deltaClass = getDeltaClass(feedback.delta);

  return (
    <div className={`feedback-card glass-card-elevated animate-slide-in-right ${deltaClass}`}>
      {/* Header */}
      <div className="feedback-header">
        <h3>
          <span className="feedback-icon">📝</span>
          Move Analysis
        </h3>
        <div className={`feedback-badge ${deltaClass}`}>
          {deltaClass === 'excellent' && '⭐ Excellent'}
          {deltaClass === 'good' && '✓ Good'}
          {deltaClass === 'neutral' && '• Okay'}
          {deltaClass === 'bad' && '⚠️ Inaccuracy'}
        </div>
      </div>

      {/* Evaluation */}
      <div className="feedback-eval">
        <div className="eval-change">
          <span className="eval-label">Evaluation Change</span>
          <div className={`eval-delta ${deltaClass}`}>
            {feedback.delta > 0 ? '+' : ''}{(feedback.delta / 100).toFixed(2)}
          </div>
        </div>
        <div className="eval-meter">
          <div className="eval-before">
            <span className="eval-meter-label">Before</span>
            <span className="eval-meter-value">{(feedback.evalBefore / 100).toFixed(2)}</span>
          </div>
          <div className="eval-arrow">→</div>
          <div className="eval-after">
            <span className="eval-meter-label">After</span>
            <span className="eval-meter-value">{(feedback.evalAfter / 100).toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Blunder Warning */}
      {feedback.blunder && (
        <div className="feedback-blunder">
          <span className="blunder-icon">⚠️</span>
          <div className="blunder-content">
            <span className="blunder-title">Blunder Detected</span>
            <span className="blunder-text">This move significantly worsened your position.</span>
          </div>
        </div>
      )}

      {/* Coach Explanation */}
      <div className="feedback-coach">
        <div className="coach-avatar">🎓</div>
        <div className="coach-content">
          <span className="coach-label">Coach Analysis</span>
          <p className="coach-text">{feedback.coachText}</p>
        </div>
      </div>

      {/* AI Opponent Move */}
      {feedback.aiMove && (
        <div className="feedback-opponent">
          <div 
            className="opponent-avatar"
            style={{ borderColor: getMasterInfo(feedback.aiMove.styleId).color }}
          >
            🤖
          </div>
          <div className="opponent-content">
            <div className="opponent-header">
              <span className="opponent-label">Opponent Response</span>
              <span 
                className="opponent-master"
                style={{ color: getMasterInfo(feedback.aiMove.styleId).color }}
              >
                {getMasterInfo(feedback.aiMove.styleId).name}
              </span>
            </div>
            <div className="opponent-move">
              <span className="opponent-move-san">{feedback.aiMove.moveSan}</span>
              <span className="opponent-justification">"{feedback.aiMove.justification}"</span>
            </div>
          </div>
        </div>
      )}

      {/* Concept Tags */}
      {feedback.conceptTags && feedback.conceptTags.length > 0 && (
        <div className="feedback-concepts">
          <span className="concepts-label">Concepts Practiced</span>
          <div className="concepts-list">
            {feedback.conceptTags.map((tag, i) => (
              <span key={i} className="concept-tag">
                {tag.replace(/_/g, ' ')}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
