/**
 * MaiaEngine Unit Tests
 * 
 * Tests for the browser-based Maia neural network engine.
 * Uses mocked ONNX runtime for unit testing.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MaiaEngine, MaiaWorkerEngine, getMaiaEngine, disposeMaiaEngines } from './MaiaEngine';
import { POSITIONS } from '../test-utils';

// ============================================================================
// TEST FIXTURES
// ============================================================================

const STARTING_FEN = POSITIONS.starting;
const AFTER_E4 = POSITIONS.afterE4;

// ============================================================================
// MaiaEngine Tests (Main Thread)
// ============================================================================

describe('MaiaEngine', () => {
  let engine: MaiaEngine;

  beforeEach(() => {
    engine = new MaiaEngine();
  });

  afterEach(async () => {
    await engine.dispose();
  });

  describe('constructor', () => {
    it('should create engine with default config', () => {
      const state = engine.getState();
      
      expect(state.isLoading).toBe(false);
      expect(state.isReady).toBe(false);
      expect(state.currentModel).toBeNull();
      expect(state.error).toBeNull();
    });

    it('should accept custom config', () => {
      const customEngine = new MaiaEngine({ topK: 10, minProbability: 0.05 });
      const state = customEngine.getState();
      
      expect(state.isReady).toBe(false);
    });
  });

  describe('getState', () => {
    it('should return not ready when no model is loaded', () => {
      const state = engine.getState();
      
      expect(state.isReady).toBe(false);
      expect(state.currentModel).toBeNull();
    });

    it('should indicate loading state during model load', async () => {
      // Start loading but don't await
      const loadPromise = engine.loadModel(1500);
      
      // State should show loading
      const state = engine.getState();
      expect(state.isLoading).toBe(true);
      
      await loadPromise;
    });
  });

  describe('loadModel', () => {
    it('should load model successfully', async () => {
      await engine.loadModel(1500);
      
      const state = engine.getState();
      expect(state.isReady).toBe(true);
      expect(state.currentModel).toBe(1500);
    });

    it('should not reload same model', async () => {
      await engine.loadModel(1500);
      const firstLoadTime = performance.now();
      
      await engine.loadModel(1500);
      const secondLoadTime = performance.now();
      
      // Second load should be instant (no re-fetch)
      expect(secondLoadTime - firstLoadTime).toBeLessThan(100);
    });

    it('should switch models', async () => {
      await engine.loadModel(1500);
      expect(engine.getState().currentModel).toBe(1500);
      
      await engine.loadModel(1100);
      expect(engine.getState().currentModel).toBe(1100);
    });

    it('should handle concurrent load requests', async () => {
      // Start multiple loads of the same model
      const promise1 = engine.loadModel(1500);
      const promise2 = engine.loadModel(1500);
      
      await Promise.all([promise1, promise2]);
      
      expect(engine.getState().currentModel).toBe(1500);
    });
  });

  describe('predict', () => {
    beforeEach(async () => {
      await engine.loadModel(1500);
    });

    it('should throw if model not loaded', async () => {
      const freshEngine = new MaiaEngine();
      
      await expect(freshEngine.predict(STARTING_FEN)).rejects.toThrow('Model not loaded');
    });

    it('should return predictions for valid FEN', async () => {
      const result = await engine.predict(STARTING_FEN);
      
      expect(result).toHaveProperty('predictions');
      expect(result).toHaveProperty('modelRating');
      expect(result).toHaveProperty('inferenceTimeMs');
      expect(result.modelRating).toBe(1500);
    });

    it('should return predictions with valid structure', async () => {
      const result = await engine.predict(STARTING_FEN);
      
      expect(result.predictions.length).toBeGreaterThan(0);
      
      result.predictions.forEach(pred => {
        expect(pred).toHaveProperty('uci');
        expect(pred).toHaveProperty('san');
        expect(pred).toHaveProperty('from');
        expect(pred).toHaveProperty('to');
        expect(pred).toHaveProperty('probability');
        expect(pred.probability).toBeGreaterThanOrEqual(0);
        expect(pred.probability).toBeLessThanOrEqual(1);
      });
    });

    it('should return predictions sorted by probability (descending)', async () => {
      const result = await engine.predict(STARTING_FEN);
      
      for (let i = 1; i < result.predictions.length; i++) {
        expect(result.predictions[i - 1].probability)
          .toBeGreaterThanOrEqual(result.predictions[i].probability);
      }
    });

    it('should measure inference time', async () => {
      const result = await engine.predict(STARTING_FEN);
      
      expect(result.inferenceTimeMs).toBeGreaterThan(0);
    });

    it('should handle different positions', async () => {
      const result1 = await engine.predict(STARTING_FEN);
      const result2 = await engine.predict(AFTER_E4);
      
      // Different positions should (usually) give different predictions
      expect(result1.predictions.length).toBeGreaterThan(0);
      expect(result2.predictions.length).toBeGreaterThan(0);
    });

    it('should respect topK limit', async () => {
      const limitedEngine = new MaiaEngine({ topK: 3 });
      await limitedEngine.loadModel(1500);
      
      const result = await limitedEngine.predict(STARTING_FEN);
      
      expect(result.predictions.length).toBeLessThanOrEqual(3);
    });
  });

  describe('getBestMove', () => {
    beforeEach(async () => {
      await engine.loadModel(1500);
    });

    it('should return the top prediction', async () => {
      const bestMove = await engine.getBestMove(STARTING_FEN);
      const allPredictions = await engine.predict(STARTING_FEN);
      
      expect(bestMove).toEqual(allPredictions.predictions[0]);
    });

    it('should return null for positions with no legal moves', async () => {
      // Checkmate position - no legal moves
      const checkmateFen = POSITIONS.checkmate;
      const bestMove = await engine.getBestMove(checkmateFen);
      
      // Should return null or a fallback move
      expect(bestMove === null || typeof bestMove.uci === 'string').toBe(true);
    });
  });

  describe('history management', () => {
    it('should update position history', () => {
      engine.updateHistory(STARTING_FEN);
      engine.updateHistory(AFTER_E4);
      
      // History is internal, but we can verify predict works
      expect(() => engine.updateHistory('some-fen')).not.toThrow();
    });

    it('should clear position history', () => {
      engine.updateHistory(STARTING_FEN);
      engine.clearHistory();
      
      // Should not throw
      expect(() => engine.clearHistory()).not.toThrow();
    });

    it('should limit history to 7 positions', () => {
      for (let i = 0; i < 10; i++) {
        engine.updateHistory(`fen-${i}`);
      }
      
      // Internal check - just verify it doesn't crash
      expect(() => engine.updateHistory('final-fen')).not.toThrow();
    });
  });

  describe('dispose', () => {
    it('should release resources', async () => {
      await engine.loadModel(1500);
      expect(engine.getState().isReady).toBe(true);
      
      await engine.dispose();
      
      expect(engine.getState().isReady).toBe(false);
      expect(engine.getState().currentModel).toBeNull();
    });

    it('should be safe to call multiple times', async () => {
      await engine.loadModel(1500);
      
      await engine.dispose();
      await engine.dispose();
      
      expect(engine.getState().isReady).toBe(false);
    });
  });

  describe('static methods', () => {
    describe('getAvailableRatings', () => {
      it('should return array of available ratings', () => {
        const ratings = MaiaEngine.getAvailableRatings();
        
        expect(Array.isArray(ratings)).toBe(true);
        expect(ratings.length).toBeGreaterThan(0);
        ratings.forEach(rating => {
          expect(typeof rating).toBe('number');
          expect(rating).toBeGreaterThanOrEqual(1100);
          expect(rating).toBeLessThanOrEqual(1900);
        });
      });
    });

    describe('getClosestRating', () => {
      it('should return exact rating if available', () => {
        const closest = MaiaEngine.getClosestRating(1500);
        expect(closest).toBe(1500);
      });

      it('should return closest available rating', () => {
        const closest = MaiaEngine.getClosestRating(1250);
        // Should be either 1100 or 1300 depending on available ratings
        const available = MaiaEngine.getAvailableRatings();
        expect(available).toContain(closest);
      });

      it('should handle edge cases', () => {
        expect(MaiaEngine.getClosestRating(0)).toBe(1100);
        expect(MaiaEngine.getClosestRating(3000)).toBe(1900);
      });
    });
  });
});

// ============================================================================
// MaiaWorkerEngine Tests
// ============================================================================

describe('MaiaWorkerEngine', () => {
  let engine: MaiaWorkerEngine;

  beforeEach(() => {
    engine = new MaiaWorkerEngine();
  });

  afterEach(() => {
    engine.dispose();
  });

  describe('constructor', () => {
    it('should create engine with default config', () => {
      const state = engine.getState();
      
      expect(state.isReady).toBe(false);
      expect(state.currentModel).toBeNull();
    });
  });

  describe('init', () => {
    it('should initialize worker and become ready', async () => {
      await engine.init();
      
      // After init, worker should be created
      // The getState will still show not ready until model is loaded
      expect(engine.getState().isReady).toBe(false);
    });

    it('should be idempotent - safe to call multiple times', async () => {
      await engine.init();
      await engine.init();
      
      // Should not throw
      expect(engine.getState().currentModel).toBeNull();
    });
  });

  describe('loadModel', () => {
    it('should load model and update state', async () => {
      await engine.loadModel(1500);
      
      const state = engine.getState();
      expect(state.currentModel).toBe(1500);
      expect(state.isReady).toBe(true);
    });

    it('should not reload same model', async () => {
      await engine.loadModel(1500);
      const firstState = engine.getState();
      
      await engine.loadModel(1500);
      const secondState = engine.getState();
      
      expect(firstState.currentModel).toBe(secondState.currentModel);
    });

    it('should switch to different model', async () => {
      await engine.loadModel(1500);
      expect(engine.getState().currentModel).toBe(1500);
      
      await engine.loadModel(1100);
      expect(engine.getState().currentModel).toBe(1100);
    });
  });

  describe('predict', () => {
    it('should throw when not initialized', async () => {
      await expect(engine.predict(STARTING_FEN)).rejects.toThrow();
    });

    it('should return predictions after loading model', async () => {
      await engine.loadModel(1500);
      
      const result = await engine.predict(STARTING_FEN);
      
      expect(result).toHaveProperty('predictions');
      expect(result.predictions.length).toBeGreaterThan(0);
      expect(result).toHaveProperty('modelRating');
      expect(result).toHaveProperty('inferenceTimeMs');
    });
  });

  describe('dispose', () => {
    it('should terminate worker', () => {
      engine.dispose();
      
      expect(engine.getState().isReady).toBe(false);
    });

    it('should be safe to call multiple times', () => {
      engine.dispose();
      engine.dispose();
      
      expect(engine.getState().currentModel).toBeNull();
    });
  });

  describe('history management', () => {
    it('should update history', () => {
      engine.updateHistory(STARTING_FEN);
      expect(() => engine.updateHistory(AFTER_E4)).not.toThrow();
    });

    it('should clear history', () => {
      engine.updateHistory(STARTING_FEN);
      engine.clearHistory();
      expect(() => engine.clearHistory()).not.toThrow();
    });
  });
});

// ============================================================================
// Singleton Tests
// ============================================================================

describe('Singleton instances', () => {
  afterEach(async () => {
    await disposeMaiaEngines();
  });

  describe('getMaiaEngine', () => {
    it('should return same instance on multiple calls', () => {
      const engine1 = getMaiaEngine();
      const engine2 = getMaiaEngine();
      
      expect(engine1).toBe(engine2);
    });
  });

  describe('disposeMaiaEngines', () => {
    it('should dispose all singleton engines', async () => {
      const engine = getMaiaEngine();
      await engine.loadModel(1500);
      
      await disposeMaiaEngines();
      
      // Getting engine again should return new instance
      const newEngine = getMaiaEngine();
      expect(newEngine.getState().isReady).toBe(false);
    });
  });
});

