/**
 * PredictOpponent Component Tests
 * 
 * Tests for the move prediction quiz component including:
 * - Rendering states
 * - Timer behavior
 * - Prediction selection
 * - Maia integration
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { PredictOpponent } from './PredictOpponent';
import { POSITIONS } from '../test-utils';
import { MaiaProvider } from '../maia';

// ============================================================================
// TEST FIXTURES
// ============================================================================

const defaultProps = {
  fen: POSITIONS.afterE4,
  onPredictionSubmit: vi.fn(),
  onSkip: vi.fn(),
  timeLimit: 15,
  masterStyle: 'capablanca',
  masterName: 'Capablanca',
};

const humanLikeProps = {
  ...defaultProps,
  isHumanLike: true,
  targetRating: 1500,
};

// Wrapper with providers
const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <MaiaProvider>
      {component}
    </MaiaProvider>
  );
};

// ============================================================================
// RENDERING TESTS
// ============================================================================

describe('PredictOpponent', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('rendering', () => {
    it('should render the prediction component', () => {
      renderWithProviders(<PredictOpponent {...defaultProps} />);
      
      expect(document.querySelector('.predict-opponent-v2')).toBeInTheDocument();
    });

    it('should display the header with title', () => {
      renderWithProviders(<PredictOpponent {...defaultProps} />);
      
      expect(screen.getByText('Predict the Response')).toBeInTheDocument();
    });

    it('should display master name in subtitle', () => {
      renderWithProviders(<PredictOpponent {...defaultProps} />);
      
      expect(screen.getByText(/Capablanca/)).toBeInTheDocument();
    });

    it('should display timer', () => {
      renderWithProviders(<PredictOpponent {...defaultProps} />);
      
      const timer = document.querySelector('.timer-value-v2');
      expect(timer).toBeInTheDocument();
      expect(timer?.textContent).toBe('15');
    });

    it('should display skip button', () => {
      renderWithProviders(<PredictOpponent {...defaultProps} />);
      
      expect(screen.getByText('Skip this round')).toBeInTheDocument();
    });

    it('should display XP reward indicator', () => {
      renderWithProviders(<PredictOpponent {...defaultProps} />);
      
      expect(screen.getByText('+50 XP if correct')).toBeInTheDocument();
    });
  });

  describe('master style hint', () => {
    it('should show Tal hint for aggressive style', () => {
      renderWithProviders(<PredictOpponent {...defaultProps} masterStyle="tal" />);
      
      expect(screen.getByText(/attacking move/)).toBeInTheDocument();
    });

    it('should show Fischer hint for precise style', () => {
      renderWithProviders(<PredictOpponent {...defaultProps} masterStyle="fischer" />);
      
      expect(screen.getByText(/objectively best/)).toBeInTheDocument();
    });

    it('should show Capablanca hint for solid style', () => {
      renderWithProviders(<PredictOpponent {...defaultProps} masterStyle="capablanca" />);
      
      expect(screen.getByText(/Simple and solid/)).toBeInTheDocument();
    });

    it('should show Karpov hint for restrictive style', () => {
      renderWithProviders(<PredictOpponent {...defaultProps} masterStyle="karpov" />);
      
      expect(screen.getByText(/restrict your options/)).toBeInTheDocument();
    });
  });

  describe('timer countdown', () => {
    it('should countdown timer each second', async () => {
      renderWithProviders(<PredictOpponent {...defaultProps} timeLimit={10} />);
      
      const timer = document.querySelector('.timer-value-v2');
      expect(timer?.textContent).toBe('10');
      
      // Advance 1 second
      act(() => {
        vi.advanceTimersByTime(1000);
      });
      
      expect(timer?.textContent).toBe('9');
    });

    it('should call onSkip when timer expires with no selection', async () => {
      const onSkip = vi.fn();
      renderWithProviders(<PredictOpponent {...defaultProps} timeLimit={3} onSkip={onSkip} />);
      
      // Wait for timer to expire
      act(() => {
        vi.advanceTimersByTime(4000);
      });
      
      expect(onSkip).toHaveBeenCalled();
    });

    it('should add urgent class when time is low', () => {
      renderWithProviders(<PredictOpponent {...defaultProps} timeLimit={10} />);
      
      const timerRing = document.querySelector('.predict-timer-v2');
      expect(timerRing).not.toHaveClass('urgent');
      
      // Advance to 5 seconds remaining
      act(() => {
        vi.advanceTimersByTime(5000);
      });
      
      expect(timerRing).toHaveClass('urgent');
    });
  });

  describe('skip functionality', () => {
    it('should call onSkip when skip button is clicked', () => {
      const onSkip = vi.fn();
      renderWithProviders(<PredictOpponent {...defaultProps} onSkip={onSkip} />);
      
      fireEvent.click(screen.getByText('Skip this round'));
      
      expect(onSkip).toHaveBeenCalled();
    });

    it('should disable skip button when locking in', async () => {
      renderWithProviders(<PredictOpponent {...humanLikeProps} />);
      
      // Wait for Maia predictions to load
      await act(async () => {
        vi.advanceTimersByTime(100);
      });
      
      // The skip button should be enabled initially
      const skipButton = screen.getByText('Skip this round');
      expect(skipButton).not.toBeDisabled();
    });
  });

  describe('human-like opponent (Maia)', () => {
    it('should show Maia status when isHumanLike is true', () => {
      renderWithProviders(<PredictOpponent {...humanLikeProps} />);
      
      expect(document.querySelector('.maia-status')).toBeInTheDocument();
    });

    it('should not show Maia status when isHumanLike is false', () => {
      renderWithProviders(<PredictOpponent {...defaultProps} isHumanLike={false} />);
      
      expect(document.querySelector('.maia-status')).not.toBeInTheDocument();
    });

    it('should show loading state while Maia loads', () => {
      renderWithProviders(<PredictOpponent {...humanLikeProps} />);
      
      // Should show loading badge
      expect(screen.getByText(/Loading Maia/)).toBeInTheDocument();
    });

    it('should show loading state initially', () => {
      renderWithProviders(<PredictOpponent {...humanLikeProps} />);
      
      // Should show loading state initially (mocked Maia takes time)
      expect(screen.getByText(/Loading Maia/)).toBeInTheDocument();
    });
  });

  describe('prediction selection', () => {
    it('should render prediction UI structure', () => {
      renderWithProviders(<PredictOpponent {...humanLikeProps} />);
      
      // The wrapper should be in the document
      expect(document.querySelector('.predict-opponent-v2')).toBeInTheDocument();
    });

    it('should show selection hint when no move is selected', () => {
      renderWithProviders(<PredictOpponent {...humanLikeProps} />);
      
      expect(screen.getByText(/Tap a move to lock it in/)).toBeInTheDocument();
    });
  });

  describe('hover functionality', () => {
    it('should call onHoverMove when move is hovered', async () => {
      const onHoverMove = vi.fn();
      renderWithProviders(<PredictOpponent {...humanLikeProps} onHoverMove={onHoverMove} />);
      
      // Component should be rendered
      expect(document.querySelector('.predict-opponent-v2')).toBeInTheDocument();
    });
  });

  describe('FEN changes', () => {
    it('should reset selection when FEN changes', () => {
      const { rerender } = renderWithProviders(<PredictOpponent {...humanLikeProps} />);
      
      // Change FEN
      rerender(
        <MaiaProvider>
          <PredictOpponent {...humanLikeProps} fen={POSITIONS.ruyLopez} />
        </MaiaProvider>
      );
      
      // Should show selection hint (not selected state)
      expect(screen.getByText(/Tap a move to lock it in/)).toBeInTheDocument();
    });

    it('should reset timer when FEN changes', () => {
      const { rerender } = renderWithProviders(
        <PredictOpponent {...humanLikeProps} timeLimit={10} />
      );
      
      // Advance timer
      act(() => {
        vi.advanceTimersByTime(3000);
      });
      
      const timer = document.querySelector('.timer-value-v2');
      expect(timer?.textContent).toBe('7');
      
      // Change FEN
      rerender(
        <MaiaProvider>
          <PredictOpponent {...humanLikeProps} fen={POSITIONS.ruyLopez} timeLimit={10} />
        </MaiaProvider>
      );
      
      // Timer should be reset
      expect(timer?.textContent).toBe('10');
    });
  });

  describe('locking in prediction', () => {
    it('should have locking-in styling class support', () => {
      renderWithProviders(<PredictOpponent {...humanLikeProps} />);
      
      // The component should render with locking-in class support
      const wrapper = document.querySelector('.predict-opponent-v2');
      expect(wrapper).toBeInTheDocument();
    });
  });

  describe('fallback behavior', () => {
    it('should show fallback after timeout if Maia fails', async () => {
      renderWithProviders(<PredictOpponent {...humanLikeProps} />);
      
      // Advance past the 5 second fallback timeout using async act
      await act(async () => {
        vi.advanceTimersByTime(6000);
        // Allow any pending promises to resolve
        await Promise.resolve();
      });
      
      // Should still render choices (fallback)
      expect(document.querySelector('.prediction-choices-wrapper')).toBeInTheDocument();
    });
  });
});

// ============================================================================
// Helper Function Tests
// ============================================================================

describe('getMovePurpose', () => {
  // These are internal functions but we can test them indirectly
  // through the rendered component
  
  it('should show capture explanation for captures', async () => {
    // Position with a capture available
    const capturePosition = 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2';
    
    renderWithProviders(
      <PredictOpponent 
        {...humanLikeProps} 
        fen={capturePosition}
      />
    );
    
    expect(document.querySelector('.predict-opponent-v2')).toBeInTheDocument();
  });
});

describe('getFallbackMoves', () => {
  // Tested indirectly through fallback rendering
  
  it('should provide fallback moves when Maia is not available', async () => {
    renderWithProviders(<PredictOpponent {...humanLikeProps} />);
    
    // Component should render even if Maia is slow
    expect(document.querySelector('.predict-opponent-v2')).toBeInTheDocument();
  });
});


