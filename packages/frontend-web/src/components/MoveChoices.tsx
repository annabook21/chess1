/**
 * Move Choices Component
 * 
 * Displays 3 master-style move choices for the user to select.
 */

import { MoveChoice } from '@master-academy/contracts';

interface MoveChoicesProps {
  choices: MoveChoice[];
  selectedChoice: string | null;
  onSelectChoice: (choiceId: string) => void;
}

const MASTER_INFO: Record<string, { name: string; emoji: string; color: string }> = {
  capablanca: { name: 'Capablanca', emoji: '👑', color: '#ffd700' },
  tal: { name: 'Tal', emoji: '⚔️', color: '#e94560' },
  karpov: { name: 'Karpov', emoji: '🎯', color: '#00d9ff' },
  fischer: { name: 'Fischer', emoji: '🏆', color: '#4caf50' },
};

export const MoveChoices: React.FC<MoveChoicesProps> = ({
  choices,
  selectedChoice,
  onSelectChoice,
}) => {
  const getMasterInfo = (styleId: string) => {
    return MASTER_INFO[styleId] || { name: styleId, emoji: '♟️', color: '#888' };
  };

  // Convert UCI to readable format (basic)
  const formatMove = (uci: string): string => {
    if (uci.length < 4) return uci;
    const from = uci.substring(0, 2);
    const to = uci.substring(2, 4);
    return `${from} → ${to}`;
  };

  return (
    <div style={{ 
      display: 'flex', 
      gap: '15px', 
      justifyContent: 'center', 
      flexWrap: 'wrap', 
      padding: '20px' 
    }}>
      {choices.map((choice) => {
        const master = getMasterInfo(choice.styleId);
        const isSelected = selectedChoice === choice.id;
        
        return (
          <button
            key={choice.id}
            onClick={() => onSelectChoice(choice.id)}
            style={{
              padding: '15px 20px',
              backgroundColor: isSelected ? '#1a1a2e' : '#2a2a2a',
              color: '#fff',
              border: `3px solid ${isSelected ? master.color : '#444'}`,
              borderRadius: '12px',
              cursor: 'pointer',
              minWidth: '220px',
              maxWidth: '280px',
              textAlign: 'left',
              transition: 'all 0.2s',
              boxShadow: isSelected ? `0 0 20px ${master.color}40` : 'none',
            }}
          >
            {/* Master Header */}
            <div style={{ 
              fontWeight: 'bold', 
              marginBottom: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span style={{ fontSize: '1.4em' }}>{master.emoji}</span>
              <span style={{ color: master.color }}>{master.name}</span>
            </div>
            
            {/* Plan One-Liner */}
            <div style={{ 
              fontSize: '0.9em', 
              color: '#ccc', 
              marginBottom: '10px',
              fontStyle: 'italic'
            }}>
              "{choice.planOneLiner}"
            </div>
            
            {/* Move and Eval */}
            <div style={{ 
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '8px',
              backgroundColor: '#222',
              borderRadius: '6px'
            }}>
              <span style={{ 
                fontFamily: 'monospace', 
                fontSize: '1.1em',
                color: '#fff'
              }}>
                {formatMove(choice.moveUci)}
              </span>
              <span style={{ 
                fontSize: '0.85em',
                color: choice.eval > 0 ? '#4caf50' : choice.eval < 0 ? '#f44336' : '#888'
              }}>
                {choice.eval > 0 ? '+' : ''}{(choice.eval / 100).toFixed(2)}
              </span>
            </div>
            
            {/* Concept Tags */}
            {choice.conceptTags && choice.conceptTags.length > 0 && (
              <div style={{ marginTop: '8px' }}>
                {choice.conceptTags.slice(0, 2).map((tag, i) => (
                  <span
                    key={i}
                    style={{
                      display: 'inline-block',
                      padding: '2px 6px',
                      margin: '2px 3px 0 0',
                      backgroundColor: '#333',
                      borderRadius: '4px',
                      fontSize: '0.75em',
                      color: '#aaa',
                    }}
                  >
                    {tag.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
};
