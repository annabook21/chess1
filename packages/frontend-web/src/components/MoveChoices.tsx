/**
 * Move Choices Component
 * Displays 3 master-style move choices with beautiful cards
 */

import { MoveChoice } from '@master-academy/contracts';
import './MoveChoices.css';

interface MoveChoicesProps {
  choices: MoveChoice[];
  selectedChoice: string | null;
  onSelectChoice: (choiceId: string) => void;
  onHoverChoice?: (choice: MoveChoice | null) => void;
}

const MASTER_INFO: Record<string, { 
  name: string; 
  emoji: string; 
  color: string;
  gradient: string;
  title: string;
}> = {
  capablanca: { 
    name: 'Capablanca', 
    emoji: '👑', 
    color: '#f4d03f',
    gradient: 'linear-gradient(135deg, rgba(244, 208, 63, 0.15) 0%, rgba(244, 208, 63, 0.05) 100%)',
    title: 'The Chess Machine'
  },
  tal: { 
    name: 'Tal', 
    emoji: '⚔️', 
    color: '#ef4444',
    gradient: 'linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(239, 68, 68, 0.05) 100%)',
    title: 'The Magician'
  },
  karpov: { 
    name: 'Karpov', 
    emoji: '🎯', 
    color: '#3b82f6',
    gradient: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(59, 130, 246, 0.05) 100%)',
    title: 'The Constrictor'
  },
  fischer: { 
    name: 'Fischer', 
    emoji: '🏆', 
    color: '#10b981',
    gradient: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(16, 185, 129, 0.05) 100%)',
    title: 'The Perfectionist'
  },
};

export const MoveChoices: React.FC<MoveChoicesProps> = ({
  choices,
  selectedChoice,
  onSelectChoice,
  onHoverChoice,
}) => {
  const getMasterInfo = (styleId: string) => {
    return MASTER_INFO[styleId] || { 
      name: styleId, 
      emoji: '♟️', 
      color: '#888',
      gradient: 'linear-gradient(135deg, rgba(136, 136, 136, 0.15) 0%, rgba(136, 136, 136, 0.05) 100%)',
      title: 'Master'
    };
  };

  return (
    <div className="move-choices-grid">
      {choices.map((choice, index) => {
        const master = getMasterInfo(choice.styleId);
        const isSelected = selectedChoice === choice.id;
        
        return (
          <button
            key={choice.id}
            onClick={() => onSelectChoice(choice.id)}
            onMouseEnter={() => onHoverChoice?.(choice)}
            onMouseLeave={() => onHoverChoice?.(null)}
            className={`choice-card ${isSelected ? 'selected' : ''} animate-fade-in-up stagger-${index + 1}`}
            style={{
              '--master-color': master.color,
              '--master-gradient': master.gradient,
            } as React.CSSProperties}
          >
            {/* Selection indicator */}
            {isSelected && <div className="choice-selected-indicator" />}
            
            {/* Master header */}
            <div className="choice-header">
              <div className="master-avatar">
                <span className="master-emoji">{master.emoji}</span>
              </div>
              <div className="master-info">
                <span className="master-name" style={{ color: master.color }}>
                  {master.name}
                </span>
                <span className="master-title">{master.title}</span>
              </div>
            </div>
            
            {/* Plan description */}
            <div className="choice-plan">
              "{choice.planOneLiner}"
            </div>
            
            {/* Move details */}
            <div className="choice-move">
              <div className="move-notation-display">
                <span className="from-square">{choice.moveUci.slice(0, 2)}</span>
                <span className="move-arrow">→</span>
                <span className="to-square">{choice.moveUci.slice(2, 4)}</span>
              </div>
              <div className={`move-eval ${choice.eval > 0 ? 'positive' : choice.eval < 0 ? 'negative' : ''}`}>
                {choice.eval > 0 ? '+' : ''}{(choice.eval / 100).toFixed(2)}
              </div>
            </div>
            
            {/* Concept tags */}
            {choice.conceptTags && choice.conceptTags.length > 0 && (
              <div className="choice-tags">
                {choice.conceptTags.slice(0, 2).map((tag, i) => (
                  <span key={i} className="choice-tag">
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
