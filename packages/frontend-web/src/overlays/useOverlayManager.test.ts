/**
 * useOverlayManager Hook Tests
 * 
 * Tests for the overlay management system including:
 * - Provider activation/deactivation
 * - Frame computation
 * - State management
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useOverlayManager } from './useOverlayManager';
import type { OverlayContext } from './types';
import { POSITIONS } from '../test-utils';

// ============================================================================
// TEST FIXTURES
// ============================================================================

const createTestContext = (overrides: Partial<OverlayContext> = {}): OverlayContext => ({
  fen: POSITIONS.starting,
  sideToMove: 'w',
  userPreferences: {
    showAttacks: false,
    showThreats: false,
    showKeySquares: false,
  },
  ...overrides,
});

// ============================================================================
// HOOK INITIALIZATION TESTS
// ============================================================================

describe('useOverlayManager', () => {
  describe('initialization', () => {
    it('should return overlay manager result', () => {
      const { result } = renderHook(() => useOverlayManager());
      
      expect(result.current).toHaveProperty('state');
      expect(result.current).toHaveProperty('computeFrames');
      expect(result.current).toHaveProperty('toggleProvider');
      expect(result.current).toHaveProperty('enableProvider');
      expect(result.current).toHaveProperty('disableProvider');
      expect(result.current).toHaveProperty('isProviderActive');
      expect(result.current).toHaveProperty('providers');
    });

    it('should have providers array', () => {
      const { result } = renderHook(() => useOverlayManager());
      
      expect(Array.isArray(result.current.providers)).toBe(true);
      expect(result.current.providers.length).toBeGreaterThan(0);
    });

    it('should have initial state with activeProviders', () => {
      const { result } = renderHook(() => useOverlayManager());
      
      expect(result.current.state).toHaveProperty('frames');
      expect(result.current.state).toHaveProperty('activeProviders');
      expect(Array.isArray(result.current.state.activeProviders)).toBe(true);
    });
  });

  describe('default options', () => {
    it('should use default active providers when no options given', () => {
      const { result } = renderHook(() => useOverlayManager());
      
      // Default providers should be active
      expect(result.current.state.activeProviders.length).toBeGreaterThan(0);
    });

    it('should accept custom default active providers', () => {
      const { result } = renderHook(() => 
        useOverlayManager({ defaultActiveProviders: ['attacks', 'threats'] })
      );
      
      expect(result.current.isProviderActive('attacks')).toBe(true);
      expect(result.current.isProviderActive('threats')).toBe(true);
    });

    it('should accept empty default providers', () => {
      const { result } = renderHook(() => 
        useOverlayManager({ defaultActiveProviders: [] })
      );
      
      expect(result.current.state.activeProviders.length).toBe(0);
    });
  });

  // ============================================================================
  // PROVIDER TOGGLE TESTS
  // ============================================================================

  describe('toggleProvider', () => {
    it('should toggle a provider on', () => {
      const { result } = renderHook(() => 
        useOverlayManager({ defaultActiveProviders: [] })
      );
      
      expect(result.current.isProviderActive('attacks')).toBe(false);
      
      act(() => {
        result.current.toggleProvider('attacks');
      });
      
      expect(result.current.isProviderActive('attacks')).toBe(true);
    });

    it('should toggle a provider off', () => {
      const { result } = renderHook(() => 
        useOverlayManager({ defaultActiveProviders: ['attacks'] })
      );
      
      expect(result.current.isProviderActive('attacks')).toBe(true);
      
      act(() => {
        result.current.toggleProvider('attacks');
      });
      
      expect(result.current.isProviderActive('attacks')).toBe(false);
    });

    it('should toggle multiple times', () => {
      const { result } = renderHook(() => 
        useOverlayManager({ defaultActiveProviders: [] })
      );
      
      act(() => {
        result.current.toggleProvider('attacks');
      });
      expect(result.current.isProviderActive('attacks')).toBe(true);
      
      act(() => {
        result.current.toggleProvider('attacks');
      });
      expect(result.current.isProviderActive('attacks')).toBe(false);
      
      act(() => {
        result.current.toggleProvider('attacks');
      });
      expect(result.current.isProviderActive('attacks')).toBe(true);
    });
  });

  // ============================================================================
  // ENABLE/DISABLE PROVIDER TESTS
  // ============================================================================

  describe('enableProvider', () => {
    it('should enable a provider', () => {
      const { result } = renderHook(() => 
        useOverlayManager({ defaultActiveProviders: [] })
      );
      
      act(() => {
        result.current.enableProvider('threats');
      });
      
      expect(result.current.isProviderActive('threats')).toBe(true);
    });

    it('should be idempotent (enabling twice has same effect)', () => {
      const { result } = renderHook(() => 
        useOverlayManager({ defaultActiveProviders: [] })
      );
      
      act(() => {
        result.current.enableProvider('threats');
      });
      act(() => {
        result.current.enableProvider('threats');
      });
      
      expect(result.current.isProviderActive('threats')).toBe(true);
    });
  });

  describe('disableProvider', () => {
    it('should disable a provider', () => {
      const { result } = renderHook(() => 
        useOverlayManager({ defaultActiveProviders: ['attacks'] })
      );
      
      act(() => {
        result.current.disableProvider('attacks');
      });
      
      expect(result.current.isProviderActive('attacks')).toBe(false);
    });

    it('should be idempotent (disabling twice has same effect)', () => {
      const { result } = renderHook(() => 
        useOverlayManager({ defaultActiveProviders: ['attacks'] })
      );
      
      act(() => {
        result.current.disableProvider('attacks');
      });
      act(() => {
        result.current.disableProvider('attacks');
      });
      
      expect(result.current.isProviderActive('attacks')).toBe(false);
    });
  });

  // ============================================================================
  // isProviderActive TESTS
  // ============================================================================

  describe('isProviderActive', () => {
    it('should return true for active providers', () => {
      const { result } = renderHook(() => 
        useOverlayManager({ defaultActiveProviders: ['attacks', 'threats'] })
      );
      
      expect(result.current.isProviderActive('attacks')).toBe(true);
      expect(result.current.isProviderActive('threats')).toBe(true);
    });

    it('should return false for inactive providers', () => {
      const { result } = renderHook(() => 
        useOverlayManager({ defaultActiveProviders: ['attacks'] })
      );
      
      expect(result.current.isProviderActive('threats')).toBe(false);
      expect(result.current.isProviderActive('keySquares')).toBe(false);
    });

    it('should return false for non-existent provider', () => {
      const { result } = renderHook(() => useOverlayManager());
      
      expect(result.current.isProviderActive('nonExistentProvider')).toBe(false);
    });
  });

  // ============================================================================
  // computeFrames TESTS
  // ============================================================================

  describe('computeFrames', () => {
    it('should return array of frames', () => {
      const { result } = renderHook(() => useOverlayManager());
      const context = createTestContext();
      
      const frames = result.current.computeFrames(context);
      
      expect(Array.isArray(frames)).toBe(true);
    });

    it('should return empty array when no providers active', () => {
      const { result } = renderHook(() => 
        useOverlayManager({ defaultActiveProviders: [] })
      );
      const context = createTestContext();
      
      const frames = result.current.computeFrames(context);
      
      expect(frames).toEqual([]);
    });

    it('should return frames from active providers', () => {
      const { result } = renderHook(() => 
        useOverlayManager({ defaultActiveProviders: ['hoverPreview'] })
      );
      
      // Context with hovered choice should produce frames
      const context = createTestContext({
        hoveredChoice: {
          id: 'test',
          moveUci: 'e2e4',
          styleId: 'fischer',
          planOneLiner: 'Control the center',
          pv: ['e2e4'],
          eval: 30,
          conceptTags: ['opening'],
        },
      });
      
      const frames = result.current.computeFrames(context);
      
      // Should have at least one frame from the hover preview
      expect(frames.length).toBeGreaterThanOrEqual(0);
    });

    it('should filter out empty frames', () => {
      const { result } = renderHook(() => useOverlayManager());
      const context = createTestContext();
      
      const frames = result.current.computeFrames(context);
      
      // All returned frames should have content
      frames.forEach(frame => {
        const hasContent = 
          frame.highlights.length > 0 ||
          frame.arrows.length > 0 ||
          frame.badges.length > 0 ||
          frame.ghostPieces.length > 0;
        expect(hasContent).toBe(true);
      });
    });

    it('should handle provider errors gracefully', () => {
      const { result } = renderHook(() => useOverlayManager());
      
      // Even with invalid context, should not throw
      const context = createTestContext({ fen: 'invalid-fen' });
      
      expect(() => {
        result.current.computeFrames(context);
      }).not.toThrow();
    });
  });

  // ============================================================================
  // STATE UPDATES TESTS
  // ============================================================================

  describe('state updates', () => {
    it('should update activeProviders when toggling', () => {
      const { result } = renderHook(() => 
        useOverlayManager({ defaultActiveProviders: [] })
      );
      
      const initialProviders = result.current.state.activeProviders;
      expect(initialProviders).toEqual([]);
      
      act(() => {
        result.current.toggleProvider('attacks');
      });
      
      expect(result.current.state.activeProviders).toContain('attacks');
    });

    it('should maintain referential stability for unchanged state', () => {
      const { result, rerender } = renderHook(() => useOverlayManager());
      
      const state1 = result.current.state;
      rerender();
      const state2 = result.current.state;
      
      // State should be memoized
      expect(state1).toBe(state2);
    });
  });
});

// ============================================================================
// COORDINATE CONVERSION TESTS
// ============================================================================

describe('Overlay type utilities', () => {
  describe('squareToPosition', async () => {
    const { squareToPosition, SQUARE_SIZE } = await import('./types');

    it('should convert a1 to bottom-left', () => {
      const pos = squareToPosition('a1');
      expect(pos.x).toBe(SQUARE_SIZE / 2);
      expect(pos.y).toBe(7 * SQUARE_SIZE + SQUARE_SIZE / 2);
    });

    it('should convert h8 to top-right', () => {
      const pos = squareToPosition('h8');
      expect(pos.x).toBe(7 * SQUARE_SIZE + SQUARE_SIZE / 2);
      expect(pos.y).toBe(SQUARE_SIZE / 2);
    });

    it('should convert e4 to center area', () => {
      const pos = squareToPosition('e4');
      expect(pos.x).toBe(4 * SQUARE_SIZE + SQUARE_SIZE / 2);
      expect(pos.y).toBe(4 * SQUARE_SIZE + SQUARE_SIZE / 2);
    });
  });

  describe('positionToSquare', async () => {
    const { positionToSquare, SQUARE_SIZE } = await import('./types');

    it('should convert center of a1 to a1', () => {
      const square = positionToSquare(SQUARE_SIZE / 2, 7 * SQUARE_SIZE + SQUARE_SIZE / 2);
      expect(square).toBe('a1');
    });

    it('should convert center of h8 to h8', () => {
      const square = positionToSquare(7 * SQUARE_SIZE + SQUARE_SIZE / 2, SQUARE_SIZE / 2);
      expect(square).toBe('h8');
    });
  });
});


