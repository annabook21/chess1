/**
 * Feedback Component
 * 
 * Displays move feedback including evaluation, coaching, and AI opponent's response.
 */

import { MoveFeedback } from '@master-academy/contracts';

interface FeedbackProps {
  feedback: MoveFeedback | null;
}

const MASTER_NAMES: Record<string, string> = {
  capablanca: 'Capablanca',
  tal: 'Tal',
  karpov: 'Karpov',
  fischer: 'Fischer',
};

export const Feedback: React.FC<FeedbackProps> = ({ feedback }) => {
  if (!feedback) return null;

  const getEvalColor = (delta: number): string => {
    if (delta > 100) return '#4caf50'; // green
    if (delta < -200) return '#f44336'; // red
    return '#ff9800'; // orange
  };

  return (
    <div
      style={{
        padding: '20px',
        margin: '20px',
        backgroundColor: '#2a2a2a',
        borderRadius: '8px',
        border: `2px solid ${getEvalColor(feedback.delta)}`,
      }}
    >
      <h3 style={{ marginBottom: '15px' }}>♟️ Move Feedback</h3>
      
      {/* Evaluation Change */}
      <div style={{ marginBottom: '12px' }}>
        <strong>Evaluation:</strong>{' '}
        <span style={{ color: getEvalColor(feedback.delta), fontWeight: 'bold' }}>
          {feedback.delta > 0 ? '+' : ''}
          {(feedback.delta / 100).toFixed(2)} pawns
        </span>
        <span style={{ color: '#888', marginLeft: '10px', fontSize: '0.9em' }}>
          ({feedback.evalBefore.toFixed(0)} → {feedback.evalAfter.toFixed(0)} cp)
        </span>
      </div>

      {/* Blunder Warning */}
      {feedback.blunder && (
        <div style={{ 
          color: '#fff', 
          backgroundColor: '#f44336',
          padding: '10px',
          borderRadius: '4px',
          marginBottom: '12px', 
          fontWeight: 'bold' 
        }}>
          ⚠️ Blunder! Consider reviewing this position.
        </div>
      )}

      {/* Coach Explanation */}
      <div style={{ 
        marginBottom: '12px', 
        padding: '10px', 
        backgroundColor: '#333', 
        borderRadius: '4px',
        borderLeft: '3px solid #4a9eff'
      }}>
        <strong>🎓 Coach:</strong> {feedback.coachText}
      </div>

      {/* AI Opponent's Move */}
      {feedback.aiMove && (
        <div style={{ 
          marginBottom: '12px',
          padding: '10px',
          backgroundColor: '#1a1a2e',
          borderRadius: '4px',
          borderLeft: '3px solid #e94560'
        }}>
          <strong>🤖 Opponent ({MASTER_NAMES[feedback.aiMove.styleId] || feedback.aiMove.styleId}):</strong>{' '}
          <span style={{ fontFamily: 'monospace', fontSize: '1.1em', color: '#e94560' }}>
            {feedback.aiMove.moveSan}
          </span>
          <div style={{ marginTop: '5px', color: '#aaa', fontSize: '0.9em' }}>
            "{feedback.aiMove.justification}"
          </div>
        </div>
      )}

      {/* Concept Tags */}
      {feedback.conceptTags && feedback.conceptTags.length > 0 && (
        <div>
          <strong>Concepts:</strong>{' '}
          {feedback.conceptTags.map((tag, i) => (
            <span
              key={i}
              style={{
                display: 'inline-block',
                padding: '3px 10px',
                margin: '2px 4px',
                backgroundColor: '#4a9eff22',
                border: '1px solid #4a9eff',
                borderRadius: '12px',
                fontSize: '0.85em',
                color: '#4a9eff',
              }}
            >
              {tag.replace(/_/g, ' ')}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

