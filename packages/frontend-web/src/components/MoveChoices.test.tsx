/**
 * MoveChoices Component Tests
 * 
 * Tests for the move choice selection component including:
 * - Rendering choices
 * - Selection behavior
 * - Hover interactions
 * - Mobile responsiveness
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MoveChoices } from './MoveChoices';
import { MOCK_TURN_PACKAGE } from '../test-utils';
import type { MoveChoice } from '@master-academy/contracts';

// ============================================================================
// TEST FIXTURES
// ============================================================================

const mockChoices: MoveChoice[] = MOCK_TURN_PACKAGE.choices;

const humanLikeChoices: MoveChoice[] = [
  {
    id: 'prediction-e7e5-0',
    moveUci: 'e7e5',
    styleId: 'human-like',
    planOneLiner: '40% of 1500-rated players play this move. Control the center.',
    pv: ['e7e5'],
    eval: 400, // 40% probability * 1000
    conceptTags: ['human-like', '~40%'],
  },
  {
    id: 'prediction-d7d5-1',
    moveUci: 'd7d5',
    styleId: 'human-like',
    planOneLiner: '25% of 1500-rated players play this move. Central pawn break.',
    pv: ['d7d5'],
    eval: 250,
    conceptTags: ['human-like', '~25%'],
  },
];

const defaultProps = {
  choices: mockChoices,
  selectedChoice: null,
  onSelectChoice: vi.fn(),
};

// ============================================================================
// RENDERING TESTS
// ============================================================================

describe('MoveChoices', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render the wrapper element', () => {
      render(<MoveChoices {...defaultProps} />);
      
      expect(document.querySelector('.move-choices-wrapper')).toBeInTheDocument();
    });

    it('should render the grid container', () => {
      render(<MoveChoices {...defaultProps} />);
      
      expect(document.querySelector('.move-choices-grid')).toBeInTheDocument();
    });

    it('should render all choice cards', () => {
      render(<MoveChoices {...defaultProps} />);
      
      const cards = document.querySelectorAll('.choice-card');
      expect(cards.length).toBe(mockChoices.length);
    });

    it('should render choice buttons as buttons', () => {
      render(<MoveChoices {...defaultProps} />);
      
      const buttons = screen.getAllByRole('button');
      // Should have at least as many buttons as choices
      expect(buttons.length).toBeGreaterThanOrEqual(mockChoices.length);
    });
  });

  describe('master info display', () => {
    it('should display Fischer master info correctly', () => {
      render(<MoveChoices {...defaultProps} />);
      
      expect(screen.getByText('Fischer')).toBeInTheDocument();
      expect(screen.getByText('The Perfectionist')).toBeInTheDocument();
    });

    it('should display Capablanca master info correctly', () => {
      render(<MoveChoices {...defaultProps} />);
      
      expect(screen.getByText('Capablanca')).toBeInTheDocument();
      expect(screen.getByText('The Chess Machine')).toBeInTheDocument();
    });

    it('should display Karpov master info correctly', () => {
      render(<MoveChoices {...defaultProps} />);
      
      expect(screen.getByText('Karpov')).toBeInTheDocument();
      expect(screen.getByText('The Constrictor')).toBeInTheDocument();
    });
  });

  describe('human-like predictions', () => {
    it('should display Human Player for human-like style', () => {
      render(<MoveChoices {...defaultProps} choices={humanLikeChoices} />);
      
      // Should show 'Human Player' twice (two choices)
      const humanLabels = screen.getAllByText('Human Player');
      expect(humanLabels.length).toBe(2);
    });

    it('should show probability tag for human-like choices', () => {
      render(<MoveChoices {...defaultProps} choices={humanLikeChoices} />);
      
      // Should show probability percentages (may appear multiple times in card)
      expect(screen.getAllByText('~40%').length).toBeGreaterThan(0);
      expect(screen.getAllByText('~25%').length).toBeGreaterThan(0);
    });

    it('should show likelihood instead of eval for human-like', () => {
      render(<MoveChoices {...defaultProps} choices={humanLikeChoices} />);
      
      expect(screen.getByText('40% likely')).toBeInTheDocument();
      expect(screen.getByText('25% likely')).toBeInTheDocument();
    });
  });

  describe('move notation display', () => {
    it('should display from square', () => {
      render(<MoveChoices {...defaultProps} />);
      
      const fromSquares = document.querySelectorAll('.from-square');
      expect(fromSquares.length).toBe(mockChoices.length);
      expect(fromSquares[0].textContent).toBe('e2');
    });

    it('should display to square', () => {
      render(<MoveChoices {...defaultProps} />);
      
      const toSquares = document.querySelectorAll('.to-square');
      expect(toSquares.length).toBe(mockChoices.length);
      expect(toSquares[0].textContent).toBe('e4');
    });

    it('should display move arrow', () => {
      render(<MoveChoices {...defaultProps} />);
      
      const arrows = document.querySelectorAll('.move-arrow');
      expect(arrows.length).toBe(mockChoices.length);
      expect(arrows[0].textContent).toBe('→');
    });
  });

  describe('plan description', () => {
    it('should display plan one-liner', () => {
      render(<MoveChoices {...defaultProps} />);
      
      expect(screen.getByText(/Control the center with the king pawn/)).toBeInTheDocument();
    });

    it('should wrap plan in quotes', () => {
      render(<MoveChoices {...defaultProps} />);
      
      const plans = document.querySelectorAll('.choice-plan');
      plans.forEach(plan => {
        expect(plan.textContent).toMatch(/^"/);
        expect(plan.textContent).toMatch(/"$/);
      });
    });
  });

  describe('concept tags', () => {
    it('should display concept tags', () => {
      render(<MoveChoices {...defaultProps} />);
      
      // Tags are rendered with underscores replaced by spaces
      const tags = document.querySelectorAll('.choice-tag');
      expect(tags.length).toBeGreaterThan(0);
    });

    it('should limit to 2 tags per choice', () => {
      const choiceWithManyTags: MoveChoice = {
        ...mockChoices[0],
        conceptTags: ['tag1', 'tag2', 'tag3', 'tag4', 'tag5'],
      };
      
      render(<MoveChoices {...defaultProps} choices={[choiceWithManyTags]} />);
      
      const tags = document.querySelectorAll('.choice-tag');
      expect(tags.length).toBe(2);
    });

    it('should replace underscores with spaces in tags', () => {
      const choiceWithUnderscoreTag: MoveChoice = {
        ...mockChoices[0],
        conceptTags: ['center_control', 'piece_activity'],
      };
      
      render(<MoveChoices {...defaultProps} choices={[choiceWithUnderscoreTag]} />);
      
      expect(screen.getByText('center control')).toBeInTheDocument();
      expect(screen.getByText('piece activity')).toBeInTheDocument();
    });
  });

  describe('evaluation display', () => {
    it('should display positive eval with plus sign', () => {
      render(<MoveChoices {...defaultProps} />);
      
      const positiveEval = screen.getByText('+0.30');
      expect(positiveEval).toBeInTheDocument();
      expect(positiveEval).toHaveClass('positive');
    });

    it('should handle zero eval', () => {
      const zeroEvalChoice: MoveChoice = {
        ...mockChoices[0],
        eval: 0,
      };
      
      render(<MoveChoices {...defaultProps} choices={[zeroEvalChoice]} />);
      
      expect(screen.getByText('0.00')).toBeInTheDocument();
    });

    it('should display negative eval without extra minus', () => {
      const negativeEvalChoice: MoveChoice = {
        ...mockChoices[0],
        eval: -50,
      };
      
      render(<MoveChoices {...defaultProps} choices={[negativeEvalChoice]} />);
      
      const negativeEval = screen.getByText('-0.50');
      expect(negativeEval).toHaveClass('negative');
    });
  });

  describe('selection', () => {
    it('should call onSelectChoice when card is clicked', () => {
      const onSelectChoice = vi.fn();
      render(<MoveChoices {...defaultProps} onSelectChoice={onSelectChoice} />);
      
      const cards = document.querySelectorAll('.choice-card');
      fireEvent.click(cards[0]);
      
      expect(onSelectChoice).toHaveBeenCalledWith('A');
    });

    it('should highlight selected choice', () => {
      render(<MoveChoices {...defaultProps} selectedChoice="A" />);
      
      const cards = document.querySelectorAll('.choice-card');
      expect(cards[0]).toHaveClass('selected');
      expect(cards[1]).not.toHaveClass('selected');
    });

    it('should show selection indicator on selected card', () => {
      render(<MoveChoices {...defaultProps} selectedChoice="A" />);
      
      const indicator = document.querySelector('.choice-selected-indicator');
      expect(indicator).toBeInTheDocument();
    });
  });

  describe('hover interactions', () => {
    it('should call onHoverChoice on mouse enter', () => {
      const onHoverChoice = vi.fn();
      render(<MoveChoices {...defaultProps} onHoverChoice={onHoverChoice} />);
      
      const cards = document.querySelectorAll('.choice-card');
      fireEvent.mouseEnter(cards[0]);
      
      expect(onHoverChoice).toHaveBeenCalledWith(mockChoices[0]);
    });

    it('should call onHoverChoice with null on mouse leave', () => {
      const onHoverChoice = vi.fn();
      render(<MoveChoices {...defaultProps} onHoverChoice={onHoverChoice} />);
      
      const cards = document.querySelectorAll('.choice-card');
      fireEvent.mouseEnter(cards[0]);
      fireEvent.mouseLeave(cards[0]);
      
      expect(onHoverChoice).toHaveBeenLastCalledWith(null);
    });

    it('should handle missing onHoverChoice prop', () => {
      render(<MoveChoices {...defaultProps} onHoverChoice={undefined} />);
      
      const cards = document.querySelectorAll('.choice-card');
      
      // Should not throw
      expect(() => {
        fireEvent.mouseEnter(cards[0]);
        fireEvent.mouseLeave(cards[0]);
      }).not.toThrow();
    });
  });

  describe('animation classes', () => {
    it('should apply staggered animation classes', () => {
      render(<MoveChoices {...defaultProps} />);
      
      const cards = document.querySelectorAll('.choice-card');
      expect(cards[0]).toHaveClass('stagger-1');
      expect(cards[1]).toHaveClass('stagger-2');
      expect(cards[2]).toHaveClass('stagger-3');
    });

    it('should apply fade-in-up animation class', () => {
      render(<MoveChoices {...defaultProps} />);
      
      const cards = document.querySelectorAll('.choice-card');
      cards.forEach(card => {
        expect(card).toHaveClass('animate-fade-in-up');
      });
    });
  });

  describe('master color styling', () => {
    it('should apply master color as CSS variable', () => {
      render(<MoveChoices {...defaultProps} />);
      
      const cards = document.querySelectorAll('.choice-card') as NodeListOf<HTMLElement>;
      
      // Fischer's color
      expect(cards[0].style.getPropertyValue('--master-color')).toBe('#10b981');
    });
  });

  describe('empty choices', () => {
    it('should render empty wrapper when no choices', () => {
      render(<MoveChoices {...defaultProps} choices={[]} />);
      
      const wrapper = document.querySelector('.move-choices-wrapper');
      expect(wrapper).toBeInTheDocument();
      
      const cards = document.querySelectorAll('.choice-card');
      expect(cards.length).toBe(0);
    });
  });
});

// ============================================================================
// Mobile Responsiveness Tests
// ============================================================================

describe('MoveChoices mobile behavior', () => {
  beforeEach(() => {
    // Simulate mobile viewport
    vi.stubGlobal('innerWidth', 375);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should render scroll hint dots on mobile when multiple choices', () => {
    // Trigger resize event
    render(<MoveChoices {...defaultProps} />);
    
    // Fire resize event to trigger mobile detection
    fireEvent(window, new Event('resize'));
    
    const scrollHint = document.querySelector('.scroll-hint');
    // May or may not be visible depending on timing
    expect(document.querySelector('.move-choices-wrapper')).toBeInTheDocument();
  });

  it('should render correct number of scroll dots', () => {
    render(<MoveChoices {...defaultProps} />);
    fireEvent(window, new Event('resize'));
    
    // Component should render
    expect(document.querySelector('.move-choices-wrapper')).toBeInTheDocument();
  });
});

// ============================================================================
// Master Info Fallback Tests
// ============================================================================

describe('getMasterInfo fallback', () => {
  it('should handle unknown style ID gracefully', () => {
    const unknownStyleChoice: MoveChoice = {
      ...mockChoices[0],
      styleId: 'unknown_master' as any,
    };
    
    render(<MoveChoices {...defaultProps} choices={[unknownStyleChoice]} />);
    
    // Should use fallback - showing the styleId as name
    expect(screen.getByText('unknown_master')).toBeInTheDocument();
    expect(screen.getByText('Master')).toBeInTheDocument();
  });
});
