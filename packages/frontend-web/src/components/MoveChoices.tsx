/**
 * Move Choices Component
 * Displays 3 master-style move choices with beautiful cards
 */

import { useState, useRef, useEffect } from 'react';
import { MoveChoice } from '@master-academy/contracts';
import { PixelIcon, PixelIconName } from '../ui/castle';
import './MoveChoices.css';

interface MoveChoicesProps {
  choices: MoveChoice[];
  selectedChoice: string | null;
  onSelectChoice: (choiceId: string) => void;
  onHoverChoice?: (choice: MoveChoice | null) => void;
}

const MASTER_INFO: Record<string, { 
  name: string; 
  icon: PixelIconName; 
  color: string;
  gradient: string;
  title: string;
}> = {
  capablanca: { 
    name: 'Capablanca', 
    icon: 'crown', 
    color: '#f4d03f',
    gradient: 'linear-gradient(135deg, rgba(244, 208, 63, 0.15) 0%, rgba(244, 208, 63, 0.05) 100%)',
    title: 'The Chess Machine'
  },
  tal: { 
    name: 'Tal', 
    icon: 'sword', 
    color: '#ef4444',
    gradient: 'linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(239, 68, 68, 0.05) 100%)',
    title: 'The Magician'
  },
  karpov: { 
    name: 'Karpov', 
    icon: 'target', 
    color: '#3b82f6',
    gradient: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(59, 130, 246, 0.05) 100%)',
    title: 'The Constrictor'
  },
  fischer: { 
    name: 'Fischer', 
    icon: 'trophy', 
    color: '#10b981',
    gradient: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(16, 185, 129, 0.05) 100%)',
    title: 'The Perfectionist'
  },
  'human-like': {
    name: 'Human Player',
    icon: 'ghost',
    color: '#8b5cf6',
    gradient: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(139, 92, 246, 0.05) 100%)',
    title: 'Maia Prediction'
  },
};

export const MoveChoices: React.FC<MoveChoicesProps> = ({
  choices,
  selectedChoice,
  onSelectChoice,
  onHoverChoice,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  // Check if mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Track scroll position to update active dot
  useEffect(() => {
    const container = scrollRef.current;
    if (!container || !isMobile) return;

    const handleScroll = () => {
      const scrollLeft = container.scrollLeft;
      const cardWidth = container.scrollWidth / choices.length;
      const newIndex = Math.round(scrollLeft / cardWidth);
      setActiveIndex(Math.min(newIndex, choices.length - 1));
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [choices.length, isMobile]);

  // Scroll to card when dot is clicked
  const scrollToCard = (index: number) => {
    const container = scrollRef.current;
    if (!container) return;
    const cardWidth = container.scrollWidth / choices.length;
    container.scrollTo({ left: cardWidth * index, behavior: 'smooth' });
  };

  const getMasterInfo = (styleId: string) => {
    return MASTER_INFO[styleId] || { 
      name: styleId, 
      icon: 'star' as PixelIconName, 
      color: '#888',
      gradient: 'linear-gradient(135deg, rgba(136, 136, 136, 0.15) 0%, rgba(136, 136, 136, 0.05) 100%)',
      title: 'Master'
    };
  };

  return (
    <div className="move-choices-wrapper">
      <div className="move-choices-grid" ref={scrollRef}>
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
            
            {/* Master header - show probability for human-like predictions */}
            <div className="choice-header">
              <div className="master-avatar" style={{ color: master.color }}>
                <PixelIcon name={master.icon} size="medium" />
              </div>
              <div className="master-info">
                {choice.styleId === 'human-like' ? (
                  <>
                    <span className="master-name" style={{ color: master.color }}>
                      {master.name}
                    </span>
                    <span className="master-title">
                      {choice.conceptTags.find(t => t.includes('%')) || 'Maia Prediction'}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="master-name" style={{ color: master.color }}>
                      {master.name}
                    </span>
                    <span className="master-title">{master.title}</span>
                  </>
                )}
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
                {choice.styleId === 'human-like' 
                  ? `${((choice.eval / 1000) * 100).toFixed(0)}% likely`
                  : `${choice.eval > 0 ? '+' : ''}${(choice.eval / 100).toFixed(2)}`
                }
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
      
      {/* Scroll indicator dots for mobile */}
      {isMobile && choices.length > 1 && (
        <div className="scroll-hint">
          {choices.map((_, index) => (
            <button
              key={index}
              className={`scroll-hint-dot ${activeIndex === index ? 'active' : ''}`}
              onClick={() => scrollToCard(index)}
              aria-label={`Go to choice ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};
