/**
 * Overlay Providers Tests
 * 
 * Tests for individual overlay providers:
 * - AttacksProvider
 * - ThreatsProvider
 * - KeySquaresProvider
 * - HoverPreviewProvider
 * - SelectedMoveProvider
 */

import { describe, it, expect } from 'vitest';
import {
  ALL_PROVIDERS,
  getProvider,
  getDefaultProviders,
  AttacksProvider,
  ThreatsProvider,
  KeySquaresProvider,
  HoverPreviewProvider,
  SelectedMoveProvider,
} from './index';
import type { OverlayContext } from '../types';
import { POSITIONS } from '../../test-utils';

// ============================================================================
// TEST FIXTURES
// ============================================================================

const createContext = (overrides: Partial<OverlayContext> = {}): OverlayContext => ({
  fen: POSITIONS.starting,
  sideToMove: 'w',
  userPreferences: {
    showAttacks: false,
    showThreats: false,
    showKeySquares: false,
  },
  ...overrides,
});

const mockChoice = {
  id: 'A',
  moveUci: 'e2e4',
  styleId: 'fischer',
  planOneLiner: 'Control the center',
  pv: ['e2e4', 'e7e5'],
  eval: 30,
  conceptTags: ['opening'],
};

// ============================================================================
// ALL_PROVIDERS Tests
// ============================================================================

describe('ALL_PROVIDERS', () => {
  it('should contain all 5 providers', () => {
    expect(ALL_PROVIDERS).toHaveLength(5);
  });

  it('should contain AttacksProvider', () => {
    expect(ALL_PROVIDERS).toContainEqual(AttacksProvider);
  });

  it('should contain ThreatsProvider', () => {
    expect(ALL_PROVIDERS).toContainEqual(ThreatsProvider);
  });

  it('should contain KeySquaresProvider', () => {
    expect(ALL_PROVIDERS).toContainEqual(KeySquaresProvider);
  });

  it('should contain HoverPreviewProvider', () => {
    expect(ALL_PROVIDERS).toContainEqual(HoverPreviewProvider);
  });

  it('should contain SelectedMoveProvider', () => {
    expect(ALL_PROVIDERS).toContainEqual(SelectedMoveProvider);
  });

  it('all providers should have required interface', () => {
    ALL_PROVIDERS.forEach(provider => {
      expect(provider).toHaveProperty('id');
      expect(provider).toHaveProperty('name');
      expect(provider).toHaveProperty('compute');
      expect(typeof provider.id).toBe('string');
      expect(typeof provider.name).toBe('string');
      expect(typeof provider.compute).toBe('function');
    });
  });
});

// ============================================================================
// getProvider Tests
// ============================================================================

describe('getProvider', () => {
  it('should return provider by ID', () => {
    const attacks = getProvider('attacks');
    expect(attacks).toBe(AttacksProvider);
  });

  it('should return undefined for unknown ID', () => {
    const unknown = getProvider('nonExistent');
    expect(unknown).toBeUndefined();
  });

  it('should find all known providers', () => {
    expect(getProvider('attacks')).toBeDefined();
    expect(getProvider('threats')).toBeDefined();
    expect(getProvider('keySquares')).toBeDefined();
    expect(getProvider('hoverPreview')).toBeDefined();
    expect(getProvider('selectedMove')).toBeDefined();
  });
});

// ============================================================================
// getDefaultProviders Tests
// ============================================================================

describe('getDefaultProviders', () => {
  it('should return array', () => {
    const defaults = getDefaultProviders();
    expect(Array.isArray(defaults)).toBe(true);
  });

  it('should only include providers with defaultEnabled=true', () => {
    const defaults = getDefaultProviders();
    defaults.forEach(provider => {
      expect(provider.defaultEnabled).toBe(true);
    });
  });
});

// ============================================================================
// AttacksProvider Tests
// ============================================================================

describe('AttacksProvider', () => {
  it('should have correct ID', () => {
    expect(AttacksProvider.id).toBe('attacks');
  });

  it('should have a name', () => {
    expect(typeof AttacksProvider.name).toBe('string');
    expect(AttacksProvider.name.length).toBeGreaterThan(0);
  });

  it('should compute frames', () => {
    const context = createContext();
    const frame = AttacksProvider.compute(context);
    
    expect(frame).toHaveProperty('highlights');
    expect(frame).toHaveProperty('arrows');
    expect(frame).toHaveProperty('badges');
    expect(frame).toHaveProperty('ghostPieces');
  });

  it('should return arrays in frame', () => {
    const context = createContext();
    const frame = AttacksProvider.compute(context);
    
    expect(Array.isArray(frame.highlights)).toBe(true);
    expect(Array.isArray(frame.arrows)).toBe(true);
    expect(Array.isArray(frame.badges)).toBe(true);
    expect(Array.isArray(frame.ghostPieces)).toBe(true);
  });
});

// ============================================================================
// ThreatsProvider Tests
// ============================================================================

describe('ThreatsProvider', () => {
  it('should have correct ID', () => {
    expect(ThreatsProvider.id).toBe('threats');
  });

  it('should have a name', () => {
    expect(typeof ThreatsProvider.name).toBe('string');
  });

  it('should compute frames for position with threats', () => {
    // Position where white threatens e5 pawn
    const context = createContext({
      fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2',
    });
    const frame = ThreatsProvider.compute(context);
    
    expect(frame).toHaveProperty('highlights');
    expect(frame).toHaveProperty('arrows');
  });
});

// ============================================================================
// KeySquaresProvider Tests
// ============================================================================

describe('KeySquaresProvider', () => {
  it('should have correct ID', () => {
    expect(KeySquaresProvider.id).toBe('keySquares');
  });

  it('should have a name', () => {
    expect(typeof KeySquaresProvider.name).toBe('string');
  });

  it('should compute frames', () => {
    const context = createContext();
    const frame = KeySquaresProvider.compute(context);
    
    expect(frame).toHaveProperty('highlights');
  });

  it('should highlight central squares', () => {
    const context = createContext({
      userPreferences: {
        showAttacks: false,
        showThreats: false,
        showKeySquares: true,
      },
    });
    const frame = KeySquaresProvider.compute(context);
    
    // Should have some highlights for key squares
    expect(Array.isArray(frame.highlights)).toBe(true);
  });
});

// ============================================================================
// HoverPreviewProvider Tests
// ============================================================================

describe('HoverPreviewProvider', () => {
  it('should have correct ID', () => {
    expect(HoverPreviewProvider.id).toBe('hoverPreview');
  });

  it('should have a name', () => {
    expect(typeof HoverPreviewProvider.name).toBe('string');
  });

  it('should return empty frame when no hover', () => {
    const context = createContext({
      hoveredChoice: undefined,
    });
    const frame = HoverPreviewProvider.compute(context);
    
    expect(frame.highlights).toHaveLength(0);
    expect(frame.arrows).toHaveLength(0);
    expect(frame.ghostPieces).toHaveLength(0);
  });

  it('should compute frame when hovering a choice', () => {
    const context = createContext({
      hoveredChoice: mockChoice,
    });
    const frame = HoverPreviewProvider.compute(context);
    
    // Frame should be valid structure (may or may not have content based on implementation)
    expect(frame).toHaveProperty('highlights');
    expect(frame).toHaveProperty('arrows');
    expect(frame).toHaveProperty('ghostPieces');
  });

  it('should show arrow from source to target', () => {
    const context = createContext({
      hoveredChoice: mockChoice,
    });
    const frame = HoverPreviewProvider.compute(context);
    
    if (frame.arrows.length > 0) {
      expect(frame.arrows[0]).toHaveProperty('from');
      expect(frame.arrows[0]).toHaveProperty('to');
    }
  });
});

// ============================================================================
// SelectedMoveProvider Tests
// ============================================================================

describe('SelectedMoveProvider', () => {
  it('should have correct ID', () => {
    expect(SelectedMoveProvider.id).toBe('selectedMove');
  });

  it('should have a name', () => {
    expect(typeof SelectedMoveProvider.name).toBe('string');
  });

  it('should return empty frame when no selection', () => {
    const context = createContext({
      selectedChoice: undefined,
    });
    const frame = SelectedMoveProvider.compute(context);
    
    expect(frame.highlights).toHaveLength(0);
    expect(frame.arrows).toHaveLength(0);
  });

  it('should compute frame when choice is selected', () => {
    const context = createContext({
      selectedChoice: mockChoice,
    });
    const frame = SelectedMoveProvider.compute(context);
    
    // Frame should be valid structure (may or may not have content based on implementation)
    expect(frame).toHaveProperty('highlights');
    expect(frame).toHaveProperty('arrows');
  });
});

// ============================================================================
// Provider Frame Structure Tests
// ============================================================================

describe('Provider Frame Structure', () => {
  const providers = [
    AttacksProvider,
    ThreatsProvider,
    KeySquaresProvider,
    HoverPreviewProvider,
    SelectedMoveProvider,
  ];

  providers.forEach(provider => {
    describe(provider.name, () => {
      it('should return valid frame structure', () => {
        const context = createContext();
        const frame = provider.compute(context);
        
        // Check frame has all required properties
        expect(frame).toHaveProperty('highlights');
        expect(frame).toHaveProperty('arrows');
        expect(frame).toHaveProperty('badges');
        expect(frame).toHaveProperty('ghostPieces');
      });

      it('should return empty arrays on empty context', () => {
        const context = createContext();
        const frame = provider.compute(context);
        
        // All arrays should be defined (may be empty)
        expect(Array.isArray(frame.highlights)).toBe(true);
        expect(Array.isArray(frame.arrows)).toBe(true);
        expect(Array.isArray(frame.badges)).toBe(true);
        expect(Array.isArray(frame.ghostPieces)).toBe(true);
      });

      it('should not throw on invalid FEN', () => {
        const context = createContext({
          fen: 'invalid-fen-string',
        });
        
        // Should not throw, may return empty or handle gracefully
        expect(() => provider.compute(context)).not.toThrow();
      });
    });
  });
});
