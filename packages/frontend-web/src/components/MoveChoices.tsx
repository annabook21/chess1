/**
 * Move Choices Component
 */

import React from 'react';
import { MoveChoice } from '@master-academy/contracts';

interface MoveChoicesProps {
  choices: MoveChoice[];
  selectedChoice: string | null;
  onSelectChoice: (choiceId: string) => void;
}

export const MoveChoices: React.FC<MoveChoicesProps> = ({
  choices,
  selectedChoice,
  onSelectChoice,
}) => {
  const getMasterName = (styleId: string): string => {
    const names: Record<string, string> = {
      capablanca: 'Capablanca',
      tal: 'Tal',
      karpov: 'Karpov',
      fischer: 'Fischer',
    };
    return names[styleId] || styleId;
  };

  return (
    <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', flexWrap: 'wrap', padding: '20px' }}>
      {choices.map((choice) => (
        <button
          key={choice.id}
          onClick={() => onSelectChoice(choice.id)}
          style={{
            padding: '15px 20px',
            backgroundColor: selectedChoice === choice.id ? '#4a9eff' : '#2a2a2a',
            color: '#fff',
            border: `2px solid ${selectedChoice === choice.id ? '#6bb6ff' : '#444'}`,
            borderRadius: '8px',
            cursor: 'pointer',
            minWidth: '200px',
            textAlign: 'left',
            transition: 'all 0.2s',
          }}
        >
          <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
            Choice {choice.id} - {getMasterName(choice.styleId)}
          </div>
          <div style={{ fontSize: '0.9em', color: '#ccc', marginBottom: '5px' }}>
            {choice.planOneLiner}
          </div>
          <div style={{ fontSize: '0.8em', color: '#aaa' }}>
            Move: {choice.moveUci} | Eval: {choice.eval.toFixed(1)}
          </div>
        </button>
      ))}
    </div>
  );
};

