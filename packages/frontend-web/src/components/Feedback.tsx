/**
 * Feedback Component
 */

import React from 'react';
import { MoveFeedback } from '@master-academy/contracts';

interface FeedbackProps {
  feedback: MoveFeedback | null;
}

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
      <h3 style={{ marginBottom: '10px' }}>Move Feedback</h3>
      <div style={{ marginBottom: '10px' }}>
        <strong>Evaluation Change:</strong>{' '}
        <span style={{ color: getEvalColor(feedback.delta) }}>
          {feedback.delta > 0 ? '+' : ''}
          {feedback.delta.toFixed(1)} centipawns
        </span>
      </div>
      {feedback.blunder && (
        <div style={{ color: '#f44336', marginBottom: '10px', fontWeight: 'bold' }}>
          ⚠️ Blunder detected!
        </div>
      )}
      <div style={{ marginBottom: '10px' }}>
        <strong>Coach:</strong> {feedback.coachText}
      </div>
      {feedback.conceptTags.length > 0 && (
        <div>
          <strong>Concepts:</strong>{' '}
          {feedback.conceptTags.map((tag, i) => (
            <span
              key={i}
              style={{
                display: 'inline-block',
                padding: '2px 8px',
                margin: '0 5px',
                backgroundColor: '#444',
                borderRadius: '4px',
                fontSize: '0.85em',
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

