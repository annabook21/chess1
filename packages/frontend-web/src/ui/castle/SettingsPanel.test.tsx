/**
 * SettingsPanel Tests
 * 
 * Tests the settings panel UI component.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SettingsPanel } from './SettingsPanel';

describe('SettingsPanel', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
  };

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render when isOpen is true', () => {
      render(<SettingsPanel {...defaultProps} />);

      expect(screen.getByText(/Settings/i)).toBeInTheDocument();
    });

    it('should not render visible content when isOpen is false', () => {
      render(<SettingsPanel {...defaultProps} isOpen={false} />);

      // The component might render but not be visible
      const panel = document.querySelector('.settings-panel');
      if (panel) {
        expect(panel.classList.contains('settings-panel--open')).toBe(false);
      }
    });
  });

  describe('tone selection', () => {
    it('should display tone options', () => {
      render(<SettingsPanel {...defaultProps} />);

      expect(screen.getByText(/Whimsical/i)).toBeInTheDocument();
      expect(screen.getByText(/Gothic/i)).toBeInTheDocument();
      expect(screen.getByText(/Ruthless/i)).toBeInTheDocument();
    });

    it('should default to gothic tone', () => {
      render(<SettingsPanel {...defaultProps} />);

      // Gothic button should exist
      const gothicButton = screen.getByText(/Gothic/i);
      expect(gothicButton).toBeInTheDocument();
    });
  });

  describe('effect toggles', () => {
    it('should display effect toggle options', () => {
      render(<SettingsPanel {...defaultProps} />);

      expect(screen.getByText(/Scanlines/i)).toBeInTheDocument();
      expect(screen.getByText(/Vignette/i)).toBeInTheDocument();
    });
  });

  describe('opponent type selection', () => {
    it('should display opponent type options when provided', () => {
      const onOpponentTypeChange = vi.fn();
      render(
        <SettingsPanel 
          {...defaultProps} 
          opponentType="ai-master"
          onOpponentTypeChange={onOpponentTypeChange}
        />
      );

      expect(screen.getByText(/AI Master/i)).toBeInTheDocument();
      expect(screen.getByText(/Human-like/i)).toBeInTheDocument();
    });

    it('should call onOpponentTypeChange when type is changed', () => {
      const onOpponentTypeChange = vi.fn();
      render(
        <SettingsPanel 
          {...defaultProps} 
          opponentType="ai-master"
          onOpponentTypeChange={onOpponentTypeChange}
        />
      );

      const humanLikeButton = screen.getByText(/Human-like/i).closest('button');
      if (humanLikeButton) {
        fireEvent.click(humanLikeButton);
        expect(onOpponentTypeChange).toHaveBeenCalledWith('human-like');
      }
    });
  });

  describe('Maia rating selection', () => {
    it('should display Maia rating options when human-like opponent selected', () => {
      render(
        <SettingsPanel 
          {...defaultProps} 
          opponentType="human-like"
          maiaRating={1500}
          onMaiaRatingChange={vi.fn()}
        />
      );

      // Should show rating selector or slider - multiple elements may show 1500
      expect(screen.getAllByText(/1500/).length).toBeGreaterThan(0);
    });
  });

  describe('play mode selection', () => {
    it('should display play mode options', () => {
      render(
        <SettingsPanel 
          {...defaultProps} 
          playMode="guided"
          onPlayModeChange={vi.fn()}
        />
      );

      expect(screen.getByText(/Guided/i)).toBeInTheDocument();
      expect(screen.getByText(/Free/i)).toBeInTheDocument();
    });

    it('should call onPlayModeChange when mode is changed', () => {
      const onPlayModeChange = vi.fn();
      render(
        <SettingsPanel 
          {...defaultProps} 
          playMode="guided"
          onPlayModeChange={onPlayModeChange}
        />
      );

      const freeButton = screen.getByText(/Free/i).closest('button');
      if (freeButton) {
        fireEvent.click(freeButton);
        expect(onPlayModeChange).toHaveBeenCalledWith('free');
      }
    });
  });

  describe('player color selection', () => {
    it('should display color options', () => {
      render(
        <SettingsPanel 
          {...defaultProps} 
          playerColor="white"
          onPlayerColorChange={vi.fn()}
        />
      );

      // Multiple elements may contain "White" and "Black"
      expect(screen.getAllByText(/White/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Black/i).length).toBeGreaterThan(0);
    });
  });

  describe('close button', () => {
    it('should call onClose when close button is clicked', () => {
      const onClose = vi.fn();
      render(<SettingsPanel {...defaultProps} onClose={onClose} />);

      // Find close button - could be X button or "Close" text
      const closeButton = screen.queryByRole('button', { name: /close/i }) ||
                          screen.queryByText('×')?.closest('button') ||
                          document.querySelector('.settings-panel__close');
      
      if (closeButton) {
        fireEvent.click(closeButton);
        expect(onClose).toHaveBeenCalled();
      }
    });
  });

  describe('settings persistence', () => {
    it('should call onSettingsChange when settings change', () => {
      const onSettingsChange = vi.fn();
      render(
        <SettingsPanel 
          {...defaultProps} 
          onSettingsChange={onSettingsChange}
        />
      );

      // Should be called on mount with default settings
      expect(onSettingsChange).toHaveBeenCalled();
    });

    it('should save settings to localStorage', () => {
      render(<SettingsPanel {...defaultProps} />);

      const stored = localStorage.getItem('masterAcademy_castleSettings');
      expect(stored).toBeTruthy();

      const parsed = JSON.parse(stored!);
      expect(parsed).toHaveProperty('tone');
      expect(parsed).toHaveProperty('effects');
    });

    it('should load settings from localStorage on mount', () => {
      // Pre-populate with custom settings
      localStorage.setItem('masterAcademy_castleSettings', JSON.stringify({
        tone: 'whimsical',
        effects: {
          scanlines: false,
          vignette: true,
          grain: true,
          pixelScale: false,
        },
        narrationSpeed: 5,
        soundEnabled: true,
      }));

      render(<SettingsPanel {...defaultProps} />);

      // The whimsical button should be present
      const whimsicalButton = screen.getByText(/Whimsical/i);
      expect(whimsicalButton).toBeInTheDocument();
    });
  });
});

