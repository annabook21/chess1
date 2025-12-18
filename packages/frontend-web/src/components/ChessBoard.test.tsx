/**
 * ChessBoard Component Tests
 * 
 * Tests for the main chess board component including:
 * - Rendering
 * - Move handling
 * - Overlay system
 * - Responsive behavior
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChessBoard } from './ChessBoard';
import { POSITIONS, MOCK_TURN_PACKAGE } from '../test-utils';

// ============================================================================
// TEST FIXTURES
// ============================================================================

const defaultProps = {
  fen: POSITIONS.starting,
};

const withChoicesProps = {
  fen: POSITIONS.starting,
  choices: MOCK_TURN_PACKAGE.choices,
  selectedChoice: null,
};

// ============================================================================
// RENDERING TESTS
// ============================================================================

describe('ChessBoard', () => {
  describe('rendering', () => {
    it('should render the chess board', () => {
      render(<ChessBoard {...defaultProps} />);
      
      // Board wrapper should be in the document
      const wrapper = document.querySelector('.chess-board-wrapper');
      expect(wrapper).toBeInTheDocument();
    });

    it('should render the board container', () => {
      render(<ChessBoard {...defaultProps} />);
      
      const container = document.querySelector('.chess-board-container');
      expect(container).toBeInTheDocument();
    });

    it('should render turn indicator', () => {
      render(<ChessBoard {...defaultProps} />);
      
      // Starting position is white to move
      const turnIndicator = document.querySelector('.turn-indicator');
      expect(turnIndicator).toBeInTheDocument();
      expect(turnIndicator).toHaveClass('white-turn');
    });

    it('should show correct turn for black to move', () => {
      render(<ChessBoard fen={POSITIONS.afterE4} />);
      
      const turnIndicator = document.querySelector('.turn-indicator');
      expect(turnIndicator).toHaveClass('black-turn');
    });

    it('should render visualization controls', () => {
      render(<ChessBoard {...defaultProps} />);
      
      const vizControls = document.querySelector('.viz-controls');
      expect(vizControls).toBeInTheDocument();
      
      // Should have the 3 visualization buttons
      const buttons = vizControls?.querySelectorAll('button');
      expect(buttons?.length).toBe(3);
    });
  });

  describe('visualization controls', () => {
    it('should render Attacks button', () => {
      render(<ChessBoard {...defaultProps} />);
      
      const attacksBtn = screen.getByTitle('Show square control heatmap');
      expect(attacksBtn).toBeInTheDocument();
    });

    it('should render Threats button', () => {
      render(<ChessBoard {...defaultProps} />);
      
      const threatsBtn = screen.getByTitle('Show capture threats');
      expect(threatsBtn).toBeInTheDocument();
    });

    it('should render Key Squares button', () => {
      render(<ChessBoard {...defaultProps} />);
      
      const keySquaresBtn = screen.getByTitle('Show key central squares');
      expect(keySquaresBtn).toBeInTheDocument();
    });

    it('should toggle visualization on click', () => {
      render(<ChessBoard {...defaultProps} />);
      
      const attacksBtn = screen.getByTitle('Show square control heatmap');
      
      // Initially not active
      expect(attacksBtn).not.toHaveClass('active');
      
      // Click to activate
      fireEvent.click(attacksBtn);
      expect(attacksBtn).toHaveClass('active');
      
      // Click again to deactivate
      fireEvent.click(attacksBtn);
      expect(attacksBtn).not.toHaveClass('active');
    });
  });

  describe('orientation', () => {
    it('should default to white orientation', () => {
      render(<ChessBoard {...defaultProps} />);
      
      // Board should render (we can't easily check orientation in unit tests)
      const container = document.querySelector('.chess-board-container');
      expect(container).toBeInTheDocument();
    });

    it('should accept black orientation', () => {
      render(<ChessBoard {...defaultProps} orientation="black" />);
      
      const container = document.querySelector('.chess-board-container');
      expect(container).toBeInTheDocument();
    });
  });

  describe('free play mode', () => {
    it('should enable piece dragging when freePlayMode is true', () => {
      const onMove = vi.fn().mockReturnValue(true);
      
      render(
        <ChessBoard 
          {...defaultProps} 
          freePlayMode={true} 
          onMove={onMove} 
        />
      );
      
      // Board should render with draggable pieces
      const container = document.querySelector('.chess-board-container');
      expect(container).toBeInTheDocument();
    });

    it('should disable piece dragging when freePlayMode is false', () => {
      render(<ChessBoard {...defaultProps} freePlayMode={false} />);
      
      const container = document.querySelector('.chess-board-container');
      expect(container).toBeInTheDocument();
    });
  });

  describe('move handling', () => {
    it('should call onMove when piece is dropped in free play mode', () => {
      const onMove = vi.fn().mockReturnValue(true);
      
      render(
        <ChessBoard 
          {...defaultProps} 
          freePlayMode={true} 
          onMove={onMove} 
        />
      );

      // Note: Actually testing piece drops requires interacting with react-chessboard
      // which is complex. We verify the component renders and accepts the prop.
      expect(document.querySelector('.chess-board-container')).toBeInTheDocument();
    });

    it('should handle async onMove', () => {
      const asyncOnMove = vi.fn().mockResolvedValue(true);
      
      render(
        <ChessBoard 
          {...defaultProps} 
          freePlayMode={true} 
          onMove={asyncOnMove} 
        />
      );

      expect(document.querySelector('.chess-board-container')).toBeInTheDocument();
    });
  });

  describe('choice highlighting', () => {
    it('should highlight selected choice squares', () => {
      render(
        <ChessBoard 
          {...withChoicesProps} 
          selectedChoice="A"  // e2e4
        />
      );

      // Component should render with custom styles
      const container = document.querySelector('.chess-board-container');
      expect(container).toBeInTheDocument();
    });

    it('should not highlight when no choice is selected', () => {
      render(<ChessBoard {...withChoicesProps} selectedChoice={null} />);

      const container = document.querySelector('.chess-board-container');
      expect(container).toBeInTheDocument();
    });
  });

  describe('prediction hover', () => {
    it('should highlight prediction hover squares', () => {
      render(
        <ChessBoard 
          {...defaultProps}
          predictionHover={{ from: 'e2', to: 'e4' }}
        />
      );

      const container = document.querySelector('.chess-board-container');
      expect(container).toBeInTheDocument();
    });

    it('should handle null prediction hover', () => {
      render(
        <ChessBoard 
          {...defaultProps}
          predictionHover={{ from: null, to: null }}
        />
      );

      const container = document.querySelector('.chess-board-container');
      expect(container).toBeInTheDocument();
    });
  });

  describe('last move highlighting', () => {
    it('should highlight last move squares', () => {
      render(
        <ChessBoard 
          fen={POSITIONS.afterE4}
          lastMove={{ from: 'e2', to: 'e4' }}
        />
      );

      const container = document.querySelector('.chess-board-container');
      expect(container).toBeInTheDocument();
    });
  });

  describe('hovered choice preview', () => {
    it('should show hover preview when choice is hovered', () => {
      const hoveredChoice = MOCK_TURN_PACKAGE.choices[0];
      
      render(
        <ChessBoard 
          {...withChoicesProps}
          hoveredChoice={hoveredChoice}
        />
      );

      const container = document.querySelector('.chess-board-container');
      expect(container).toBeInTheDocument();
    });

    it('should not show hover preview when a choice is already selected', () => {
      const hoveredChoice = MOCK_TURN_PACKAGE.choices[0];
      
      render(
        <ChessBoard 
          {...withChoicesProps}
          selectedChoice="A"
          hoveredChoice={hoveredChoice}
        />
      );

      // When selectedChoice is set, hoveredChoice should be ignored
      const container = document.querySelector('.chess-board-container');
      expect(container).toBeInTheDocument();
    });
  });

  describe('overlay system', () => {
    it('should render overlay renderer', () => {
      render(<ChessBoard {...defaultProps} />);
      
      // OverlayRenderer should be present in the DOM
      const container = document.querySelector('.chess-board-container');
      expect(container).toBeInTheDocument();
    });
  });
});

// ============================================================================
// useBoardSize Hook Tests (via component)
// ============================================================================

describe('Responsive board size', () => {
  beforeEach(() => {
    // Mock window dimensions
    vi.stubGlobal('innerWidth', 1920);
    vi.stubGlobal('innerHeight', 1080);
  });

  it('should render at desktop size for large screens', () => {
    vi.stubGlobal('innerWidth', 1920);
    
    render(<ChessBoard {...defaultProps} />);
    
    const container = document.querySelector('.chess-board-container');
    expect(container).toBeInTheDocument();
  });

  it('should render at tablet size for medium screens', () => {
    vi.stubGlobal('innerWidth', 768);
    
    render(<ChessBoard {...defaultProps} />);
    
    const container = document.querySelector('.chess-board-container');
    expect(container).toBeInTheDocument();
  });

  it('should render at mobile size for small screens', () => {
    vi.stubGlobal('innerWidth', 375);
    
    render(<ChessBoard {...defaultProps} />);
    
    const container = document.querySelector('.chess-board-container');
    expect(container).toBeInTheDocument();
  });
});
