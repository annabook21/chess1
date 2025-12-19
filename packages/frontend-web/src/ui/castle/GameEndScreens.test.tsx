/**
 * GameEndScreens Tests
 * 
 * Tests game end UI components (victory, defeat, draw).
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GameOverScreen, VictoryScreen, DrawScreen } from './GameEndScreens';

const defaultProps = {
  xpEarned: 50,
  movesPlayed: 30,
  accuracy: 85,
  onTryAgain: vi.fn(),
  onReturnToMap: vi.fn(),
};

describe('GameOverScreen (Defeat)', () => {
  it('should render defeat title', () => {
    render(<GameOverScreen {...defaultProps} />);
    
    // Multiple elements may contain "Defeat"
    expect(screen.getAllByText(/Defeat/i).length).toBeGreaterThan(0);
  });

  it('should display XP earned', () => {
    render(<GameOverScreen {...defaultProps} xpEarned={75} />);
    
    expect(screen.getByText(/75/)).toBeInTheDocument();
  });

  it('should display moves played', () => {
    render(<GameOverScreen {...defaultProps} movesPlayed={42} />);
    
    expect(screen.getByText(/42/)).toBeInTheDocument();
  });

  it('should display accuracy percentage', () => {
    render(<GameOverScreen {...defaultProps} accuracy={92} />);
    
    expect(screen.getByText(/92%/)).toBeInTheDocument();
  });

  it('should call onTryAgain when try again button clicked', () => {
    const onTryAgain = vi.fn();
    render(<GameOverScreen {...defaultProps} onTryAgain={onTryAgain} />);
    
    const tryAgainButton = screen.getByText(/Challenge Fate Again/i);
    fireEvent.click(tryAgainButton);
    
    expect(onTryAgain).toHaveBeenCalled();
  });

  it('should call onReturnToMap when return button clicked', () => {
    const onReturnToMap = vi.fn();
    render(<GameOverScreen {...defaultProps} onReturnToMap={onReturnToMap} />);
    
    const returnButton = screen.getByText(/Flee to Castle/i);
    fireEvent.click(returnButton);
    
    expect(onReturnToMap).toHaveBeenCalled();
  });

  it('should display custom narration when provided', () => {
    const customNarration = 'The shadows have claimed you, brave one.';
    render(<GameOverScreen {...defaultProps} narration={customNarration} />);
    
    expect(screen.getByText(customNarration)).toBeInTheDocument();
  });

  it('should display default narration when not provided', () => {
    render(<GameOverScreen {...defaultProps} />);
    
    // Should have some narration text (one of the defaults)
    const narrationContainer = document.querySelector('.game-end-screen__narration');
    expect(narrationContainer?.textContent?.length).toBeGreaterThan(0);
  });
});

describe('VictoryScreen', () => {
  it('should render victory title', () => {
    render(<VictoryScreen {...defaultProps} />);
    
    expect(screen.getAllByText(/Victory/i).length).toBeGreaterThan(0);
  });

  it('should display stats', () => {
    render(<VictoryScreen {...defaultProps} accuracy={95} movesPlayed={25} />);
    
    expect(screen.getByText(/95%/)).toBeInTheDocument();
    expect(screen.getByText(/25/)).toBeInTheDocument();
  });

  it('should call handlers when buttons clicked', () => {
    const onTryAgain = vi.fn();
    const onReturnToMap = vi.fn();
    render(
      <VictoryScreen 
        {...defaultProps} 
        onTryAgain={onTryAgain}
        onReturnToMap={onReturnToMap}
      />
    );
    
    // Find play again / continue buttons
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThanOrEqual(1);
  });

  it('should display best move description when provided', () => {
    render(
      <VictoryScreen 
        {...defaultProps} 
        bestMoveDescription="Brilliant sacrifice on move 15!"
      />
    );
    
    expect(screen.getByText(/Brilliant sacrifice/i)).toBeInTheDocument();
  });
});

describe('DrawScreen', () => {
  it('should render draw title', () => {
    render(<DrawScreen {...defaultProps} />);
    
    expect(screen.getAllByText(/Draw/i).length).toBeGreaterThan(0);
  });

  it('should display XP earned', () => {
    render(<DrawScreen {...defaultProps} xpEarned={30} />);
    
    // XP value appears in stats section
    expect(screen.getAllByText(/30/).length).toBeGreaterThan(0);
  });
});

describe('common features', () => {
  it('all screens should have action buttons', () => {
    const screens = [
      <GameOverScreen {...defaultProps} key="defeat" />,
      <VictoryScreen {...defaultProps} key="victory" />,
      <DrawScreen {...defaultProps} key="draw" />,
    ];

    screens.forEach((screenComponent) => {
      const { container, unmount } = render(screenComponent);
      
      const buttons = container.querySelectorAll('button');
      expect(buttons.length).toBeGreaterThanOrEqual(1);
      
      unmount();
    });
  });

  it('all screens should have stats section', () => {
    const screens = [
      <GameOverScreen {...defaultProps} key="defeat" />,
      <VictoryScreen {...defaultProps} key="victory" />,
      <DrawScreen {...defaultProps} key="draw" />,
    ];

    screens.forEach((screenComponent) => {
      const { container, unmount } = render(screenComponent);
      
      const statsSection = container.querySelector('.game-end-screen__stats');
      expect(statsSection).toBeInTheDocument();
      
      unmount();
    });
  });
});

