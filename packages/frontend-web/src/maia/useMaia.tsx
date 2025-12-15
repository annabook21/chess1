/**
 * Maia React Integration
 * 
 * React context and hooks for using Maia predictions in components.
 * 
 * OPTIMIZED:
 * - Uses Web Worker for non-blocking inference
 * - Debounces rapid position changes
 * - Caches predictions for repeated positions
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from 'react';
import { MaiaEngine, MaiaWorkerEngine } from './MaiaEngine';
import {
  MaiaRating,
  MovePrediction,
  MaiaInferenceResult,
  MaiaEngineState,
} from './types';

// ═══════════════════════════════════════════════════════════════════════════
// CONTEXT TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface MaiaContextValue {
  /** Current engine state */
  state: MaiaEngineState;
  /** Load a specific rating model */
  loadModel: (rating: MaiaRating) => Promise<void>;
  /** Get predictions for a position */
  predict: (fen: string) => Promise<MaiaInferenceResult>;
  /** Update position history */
  updateHistory: (fen: string) => void;
  /** Clear position history */
  clearHistory: () => void;
  /** Available ratings */
  availableRatings: MaiaRating[];
  /** Whether using Web Worker */
  isUsingWorker: boolean;
}

const MaiaContext = createContext<MaiaContextValue | null>(null);

// ═══════════════════════════════════════════════════════════════════════════
// PROVIDER
// ═══════════════════════════════════════════════════════════════════════════

interface MaiaProviderProps {
  children: React.ReactNode;
  /** Initial rating to load */
  initialRating?: MaiaRating;
  /** Auto-load the initial model */
  autoLoad?: boolean;
  /** Use Web Worker for non-blocking inference (recommended) */
  useWorker?: boolean;
}

/**
 * Maia Provider Component
 * 
 * Wrap your app with this to enable Maia predictions.
 */
export function MaiaProvider({
  children,
  initialRating = 1500,
  autoLoad = true,
  useWorker = true,
}: MaiaProviderProps) {
  const engineRef = useRef<MaiaEngine | MaiaWorkerEngine | null>(null);
  const [state, setState] = useState<MaiaEngineState>({
    isLoading: false,
    isReady: false,
    currentModel: null,
    error: null,
  });
  const [isUsingWorker, setIsUsingWorker] = useState(useWorker);

  // Initialize engine
  useEffect(() => {
    async function init() {
      try {
        if (useWorker) {
          const workerEngine = new MaiaWorkerEngine();
          await workerEngine.init();
          engineRef.current = workerEngine;
          setIsUsingWorker(true);
        } else {
          engineRef.current = new MaiaEngine();
          setIsUsingWorker(false);
        }

        if (autoLoad) {
          await loadModel(initialRating);
        }
      } catch (error) {
        console.warn('[MaiaProvider] Worker failed, falling back to main thread:', error);
        // Fallback to main thread engine
        engineRef.current = new MaiaEngine();
        setIsUsingWorker(false);
        
        if (autoLoad) {
          await loadModel(initialRating);
        }
      }
    }

    init();

    return () => {
      if (engineRef.current) {
        if ('dispose' in engineRef.current) {
          engineRef.current.dispose();
        }
      }
    };
  }, []);

  const loadModel = useCallback(async (rating: MaiaRating) => {
    if (!engineRef.current) return;

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      await engineRef.current.loadModel(rating);
      setState({
        isLoading: false,
        isReady: true,
        currentModel: rating,
        error: null,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load model';
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: message,
      }));
      console.error('[MaiaProvider] Load error:', error);
    }
  }, []);

  const predict = useCallback(async (fen: string): Promise<MaiaInferenceResult> => {
    if (!engineRef.current) {
      throw new Error('Engine not initialized');
    }
    return engineRef.current.predict(fen);
  }, []);

  const updateHistory = useCallback((fen: string) => {
    engineRef.current?.updateHistory(fen);
  }, []);

  const clearHistory = useCallback(() => {
    engineRef.current?.clearHistory();
  }, []);

  const value: MaiaContextValue = {
    state,
    loadModel,
    predict,
    updateHistory,
    clearHistory,
    availableRatings: MaiaEngine.getAvailableRatings(),
    isUsingWorker,
  };

  return (
    <MaiaContext.Provider value={value}>
      {children}
    </MaiaContext.Provider>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// HOOKS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Access the Maia context
 */
export function useMaiaContext(): MaiaContextValue {
  const context = useContext(MaiaContext);
  if (!context) {
    throw new Error('useMaiaContext must be used within a MaiaProvider');
  }
  return context;
}

/**
 * Prediction cache for rapid position changes
 */
const predictionCache = new Map<string, {
  predictions: MovePrediction[];
  timestamp: number;
}>();

const CACHE_TTL = 30000; // 30 seconds

function getCachedPredictions(fen: string): MovePrediction[] | null {
  const cached = predictionCache.get(fen);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.predictions;
  }
  return null;
}

function setCachedPredictions(fen: string, predictions: MovePrediction[]): void {
  predictionCache.set(fen, { predictions, timestamp: Date.now() });
  
  // Limit cache size
  if (predictionCache.size > 100) {
    const oldest = predictionCache.keys().next().value;
    if (oldest) predictionCache.delete(oldest);
  }
}

/**
 * Hook for getting predictions for a position
 * 
 * Features:
 * - Automatic prediction on FEN change
 * - Caching for repeated positions
 * - Debouncing for rapid changes
 */
export function useMaiaPredictions(fen: string | null, debounceMs: number = 100) {
  const { state, predict, updateHistory } = useMaiaContext();
  const [predictions, setPredictions] = useState<MovePrediction[]>([]);
  const [inferenceTime, setInferenceTime] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const lastFenRef = useRef<string | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Clear on null FEN
    if (!fen || !state.isReady) {
      setPredictions([]);
      setIsLoading(false);
      return;
    }

    // Check cache first
    const cached = getCachedPredictions(fen);
    if (cached) {
      setPredictions(cached);
      setIsLoading(false);
      return;
    }

    // Debounce rapid changes
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    setIsLoading(true);

    debounceTimerRef.current = setTimeout(async () => {
      // Skip if FEN changed during debounce
      if (lastFenRef.current !== fen) {
        lastFenRef.current = fen;
      }

      try {
        const result = await predict(fen);
        
        setPredictions(result.predictions);
        setInferenceTime(result.inferenceTimeMs);
        setError(null);
        
        // Cache the result
        setCachedPredictions(fen, result.predictions);
        
        // Update history for better future predictions
        updateHistory(fen);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Prediction failed');
        setPredictions([]);
      } finally {
        setIsLoading(false);
      }
    }, debounceMs);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [fen, state.isReady, predict, updateHistory, debounceMs]);

  return useMemo(() => ({
    predictions,
    isLoading: isLoading || state.isLoading,
    isReady: state.isReady,
    error: error || state.error,
    inferenceTime,
    modelRating: state.currentModel,
  }), [predictions, isLoading, state, error, inferenceTime]);
}

/**
 * Standalone hook for one-off predictions
 */
export function useMaiaEngine(rating: MaiaRating = 1500, useWorker: boolean = false) {
  const engineRef = useRef<MaiaEngine | MaiaWorkerEngine | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      setIsLoading(true);
      
      try {
        if (useWorker) {
          const worker = new MaiaWorkerEngine();
          await worker.init();
          await worker.loadModel(rating);
          engineRef.current = worker;
        } else {
          const engine = new MaiaEngine();
          await engine.loadModel(rating);
          engineRef.current = engine;
        }
        
        setIsReady(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load');
      } finally {
        setIsLoading(false);
      }
    }

    init();

    return () => {
      if (engineRef.current && 'dispose' in engineRef.current) {
        engineRef.current.dispose();
      }
    };
  }, [rating, useWorker]);

  const predict = useCallback(async (fen: string) => {
    if (!engineRef.current) {
      throw new Error('Engine not initialized');
    }
    return engineRef.current.predict(fen);
  }, []);

  return { predict, isReady, isLoading, error };
}
