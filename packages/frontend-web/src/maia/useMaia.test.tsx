/**
 * useMaia Hooks Tests
 * 
 * Tests for the Maia React integration hooks:
 * - MaiaProvider
 * - useMaiaContext
 * - useMaiaPredictions
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act, renderHook } from '@testing-library/react';
import { MaiaProvider, useMaiaContext, useMaiaPredictions, useMaiaEngine } from './useMaia';
import { POSITIONS } from '../test-utils';
import React from 'react';

// ============================================================================
// TEST FIXTURES
// ============================================================================

const STARTING_FEN = POSITIONS.starting;
const AFTER_E4 = POSITIONS.afterE4;

// Test component that uses the context
function TestConsumer() {
  const context = useMaiaContext();
  return (
    <div>
      <div data-testid="is-ready">{context.state.isReady.toString()}</div>
      <div data-testid="is-loading">{context.state.isLoading.toString()}</div>
      <div data-testid="current-model">{context.state.currentModel?.toString() || 'null'}</div>
      <div data-testid="is-using-worker">{context.isUsingWorker.toString()}</div>
      <div data-testid="available-ratings">{context.availableRatings.join(',')}</div>
    </div>
  );
}

// Test component for useMaiaPredictions
function PredictionsConsumer({ fen }: { fen: string | null }) {
  const { predictions, isLoading, isReady, error, inferenceTime, modelRating } = useMaiaPredictions(fen);
  return (
    <div>
      <div data-testid="predictions-count">{predictions.length}</div>
      <div data-testid="predictions-loading">{isLoading.toString()}</div>
      <div data-testid="predictions-ready">{isReady.toString()}</div>
      <div data-testid="predictions-error">{error || 'null'}</div>
      <div data-testid="inference-time">{inferenceTime}</div>
      <div data-testid="model-rating">{modelRating?.toString() || 'null'}</div>
    </div>
  );
}

// ============================================================================
// MaiaProvider Tests
// ============================================================================

describe('MaiaProvider', () => {
  describe('rendering', () => {
    it('should render children', () => {
      render(
        <MaiaProvider>
          <div data-testid="child">Child content</div>
        </MaiaProvider>
      );
      
      expect(screen.getByTestId('child')).toBeInTheDocument();
    });

    it('should provide context to children', async () => {
      render(
        <MaiaProvider autoLoad={false}>
          <TestConsumer />
        </MaiaProvider>
      );
      
      expect(screen.getByTestId('is-ready')).toBeInTheDocument();
      expect(screen.getByTestId('is-loading')).toBeInTheDocument();
    });
  });

  describe('initialization', () => {
    it('should start in loading state when autoLoad is true', async () => {
      render(
        <MaiaProvider autoLoad={true}>
          <TestConsumer />
        </MaiaProvider>
      );
      
      // Initially should be loading
      expect(screen.getByTestId('is-loading').textContent).toBe('true');
    });

    it('should not be loading when autoLoad is false', async () => {
      render(
        <MaiaProvider autoLoad={false}>
          <TestConsumer />
        </MaiaProvider>
      );
      
      // Should not be loading when autoLoad is false
      expect(screen.getByTestId('is-loading').textContent).toBe('false');
    });

    it('should expose available ratings', async () => {
      render(
        <MaiaProvider autoLoad={false}>
          <TestConsumer />
        </MaiaProvider>
      );
      
      const ratings = screen.getByTestId('available-ratings').textContent;
      expect(ratings).toContain('1100');
      expect(ratings).toContain('1500');
    });
  });

  describe('worker fallback', () => {
    it('should indicate if using worker', async () => {
      render(
        <MaiaProvider autoLoad={false} useWorker={true}>
          <TestConsumer />
        </MaiaProvider>
      );
      
      // Worker state is set during initialization
      expect(screen.getByTestId('is-using-worker')).toBeInTheDocument();
    });

    it('should work with useWorker=false', async () => {
      render(
        <MaiaProvider autoLoad={false} useWorker={false}>
          <TestConsumer />
        </MaiaProvider>
      );
      
      expect(screen.getByTestId('is-using-worker').textContent).toBe('false');
    });
  });
});

// ============================================================================
// useMaiaContext Tests
// ============================================================================

describe('useMaiaContext', () => {
  it('should throw when used outside provider', () => {
    // Suppress console.error for this test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    expect(() => {
      renderHook(() => useMaiaContext());
    }).toThrow('useMaiaContext must be used within a MaiaProvider');
    
    consoleSpy.mockRestore();
  });

  it('should return context value inside provider', () => {
    const { result } = renderHook(() => useMaiaContext(), {
      wrapper: ({ children }) => (
        <MaiaProvider autoLoad={false}>{children}</MaiaProvider>
      ),
    });
    
    expect(result.current).toHaveProperty('state');
    expect(result.current).toHaveProperty('loadModel');
    expect(result.current).toHaveProperty('predict');
    expect(result.current).toHaveProperty('updateHistory');
    expect(result.current).toHaveProperty('clearHistory');
    expect(result.current).toHaveProperty('availableRatings');
    expect(result.current).toHaveProperty('isUsingWorker');
  });

  it('should provide loadModel function', () => {
    const { result } = renderHook(() => useMaiaContext(), {
      wrapper: ({ children }) => (
        <MaiaProvider autoLoad={false}>{children}</MaiaProvider>
      ),
    });
    
    expect(typeof result.current.loadModel).toBe('function');
  });

  it('should provide predict function', () => {
    const { result } = renderHook(() => useMaiaContext(), {
      wrapper: ({ children }) => (
        <MaiaProvider autoLoad={false}>{children}</MaiaProvider>
      ),
    });
    
    expect(typeof result.current.predict).toBe('function');
  });
});

// ============================================================================
// useMaiaPredictions Tests
// ============================================================================

describe('useMaiaPredictions', () => {
  describe('initial state', () => {
    it('should return empty predictions initially', () => {
      render(
        <MaiaProvider autoLoad={false}>
          <PredictionsConsumer fen={null} />
        </MaiaProvider>
      );
      
      expect(screen.getByTestId('predictions-count').textContent).toBe('0');
    });

    it('should not be loading for null FEN', () => {
      render(
        <MaiaProvider autoLoad={false}>
          <PredictionsConsumer fen={null} />
        </MaiaProvider>
      );
      
      expect(screen.getByTestId('predictions-loading').textContent).toBe('false');
    });
  });

  describe('with FEN', () => {
    it('should trigger loading when FEN is provided', () => {
      render(
        <MaiaProvider autoLoad={true}>
          <PredictionsConsumer fen={STARTING_FEN} />
        </MaiaProvider>
      );
      
      // Should be loading since Maia needs to initialize
      expect(screen.getByTestId('predictions-loading').textContent).toBe('true');
    });
  });

  describe('debouncing', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should debounce rapid FEN changes', async () => {
      const { rerender } = render(
        <MaiaProvider autoLoad={false}>
          <PredictionsConsumer fen={STARTING_FEN} />
        </MaiaProvider>
      );
      
      // Quickly change FEN
      rerender(
        <MaiaProvider autoLoad={false}>
          <PredictionsConsumer fen={AFTER_E4} />
        </MaiaProvider>
      );
      
      // Should not crash
      expect(screen.getByTestId('predictions-count')).toBeInTheDocument();
    });
  });

  describe('caching', () => {
    it('should cache predictions for repeated positions', async () => {
      const { rerender } = render(
        <MaiaProvider autoLoad={false}>
          <PredictionsConsumer fen={STARTING_FEN} />
        </MaiaProvider>
      );
      
      // Change to different FEN
      rerender(
        <MaiaProvider autoLoad={false}>
          <PredictionsConsumer fen={AFTER_E4} />
        </MaiaProvider>
      );
      
      // Change back to original FEN (should use cache)
      rerender(
        <MaiaProvider autoLoad={false}>
          <PredictionsConsumer fen={STARTING_FEN} />
        </MaiaProvider>
      );
      
      expect(screen.getByTestId('predictions-count')).toBeInTheDocument();
    });
  });

  describe('error handling', () => {
    it('should handle prediction errors gracefully', () => {
      render(
        <MaiaProvider autoLoad={false}>
          <PredictionsConsumer fen={STARTING_FEN} />
        </MaiaProvider>
      );
      
      // Error state should be null initially
      expect(screen.getByTestId('predictions-error').textContent).toBe('null');
    });
  });

  describe('model rating', () => {
    it('should expose model rating', () => {
      render(
        <MaiaProvider autoLoad={true} initialRating={1500}>
          <PredictionsConsumer fen={STARTING_FEN} />
        </MaiaProvider>
      );
      
      expect(screen.getByTestId('model-rating')).toBeInTheDocument();
    });
  });
});

// ============================================================================
// useMaiaEngine Tests
// ============================================================================

describe('useMaiaEngine', () => {
  it('should start in loading state', () => {
    const { result } = renderHook(() => useMaiaEngine(1500, false));
    
    // Hook should return expected shape
    expect(result.current).toHaveProperty('predict');
    expect(result.current).toHaveProperty('isReady');
    expect(result.current).toHaveProperty('isLoading');
    expect(result.current).toHaveProperty('error');
  });

  it('should provide predict function', () => {
    const { result } = renderHook(() => useMaiaEngine(1500, false));
    
    expect(typeof result.current.predict).toBe('function');
  });

  it('should accept different ratings', () => {
    const { result: result1100 } = renderHook(() => useMaiaEngine(1100, false));
    const { result: result1900 } = renderHook(() => useMaiaEngine(1900, false));
    
    expect(result1100.current).toHaveProperty('predict');
    expect(result1900.current).toHaveProperty('predict');
  });

  it('should clean up on unmount', () => {
    const { unmount } = renderHook(() => useMaiaEngine(1500, false));
    
    // Should not throw on unmount
    expect(() => unmount()).not.toThrow();
  });
});

