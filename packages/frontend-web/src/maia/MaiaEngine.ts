/**
 * Maia Chess Engine
 * 
 * Browser-based neural network inference for human-like move prediction.
 * 
 * OPTIMIZATIONS:
 * - Web Worker support for non-blocking UI
 * - Lazy model loading with caching
 * - Efficient tensor encoding
 * - Pre-computed move mappings
 */

import * as ort from 'onnxruntime-web';
import { Chess } from 'chess.js';
import { encodeFenToPlanes, decodePolicyToMoves } from './encoder';
import {
  MaiaRating,
  MovePrediction,
  MaiaInferenceResult,
  MaiaEngineState,
  MaiaConfig,
  DEFAULT_MAIA_CONFIG,
} from './types';

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

/** Model file paths by rating */
const MODEL_PATHS: Record<MaiaRating, string> = {
  1100: '/models/maia-1100.onnx',
  1200: '/models/maia-1200.onnx',
  1300: '/models/maia-1300.onnx',
  1400: '/models/maia-1400.onnx',
  1500: '/models/maia-1500.onnx',
  1600: '/models/maia-1600.onnx',
  1700: '/models/maia-1700.onnx',
  1800: '/models/maia-1800.onnx',
  1900: '/models/maia-1900.onnx',
};

// ═══════════════════════════════════════════════════════════════════════════
// MAIN THREAD ENGINE
// ═══════════════════════════════════════════════════════════════════════════

export class MaiaEngine {
  private session: ort.InferenceSession | null = null;
  private currentRating: MaiaRating | null = null;
  private config: MaiaConfig;
  private loadingPromise: Promise<void> | null = null;
  private positionHistory: string[] = [];

  constructor(config: Partial<MaiaConfig> = {}) {
    this.config = { ...DEFAULT_MAIA_CONFIG, ...config };
  }

  /**
   * Get the current engine state
   */
  getState(): MaiaEngineState {
    return {
      isLoading: this.loadingPromise !== null,
      isReady: this.session !== null,
      currentModel: this.currentRating,
      error: null,
    };
  }

  /**
   * Load a Maia model for a specific rating level
   */
  async loadModel(rating: MaiaRating): Promise<void> {
    // If already loading the same model, wait for it
    if (this.loadingPromise && this.currentRating === rating) {
      return this.loadingPromise;
    }

    // If already loaded, no need to reload
    if (this.session && this.currentRating === rating) {
      return;
    }

    this.loadingPromise = this._loadModelInternal(rating);
    
    try {
      await this.loadingPromise;
    } finally {
      this.loadingPromise = null;
    }
  }

  private async _loadModelInternal(rating: MaiaRating): Promise<void> {
    console.log(`[MaiaEngine] Loading Maia-${rating}...`);
    const startTime = performance.now();

    try {
      // Dispose of existing session
      if (this.session) {
        await this.session.release();
        this.session = null;
      }

      const modelPath = MODEL_PATHS[rating];
      
      // Configure ONNX Runtime
      const options: ort.InferenceSession.SessionOptions = {
        executionProviders: ['wasm'],
        graphOptimizationLevel: 'all',
      };

      this.session = await ort.InferenceSession.create(modelPath, options);
      this.currentRating = rating;

      const elapsed = performance.now() - startTime;
      console.log(`[MaiaEngine] Maia-${rating} loaded in ${elapsed.toFixed(0)}ms`);
      console.log(`[MaiaEngine] Inputs: ${this.session.inputNames.join(', ')}`);
      console.log(`[MaiaEngine] Outputs: ${this.session.outputNames.join(', ')}`);
    } catch (error) {
      console.error(`[MaiaEngine] Failed to load Maia-${rating}:`, error);
      throw error;
    }
  }

  /**
   * Update position history (for better encoding)
   */
  updateHistory(fen: string): void {
    this.positionHistory = [fen, ...this.positionHistory].slice(0, 7);
  }

  /**
   * Clear position history
   */
  clearHistory(): void {
    this.positionHistory = [];
  }

  /**
   * Predict moves for a given position
   */
  async predict(fen: string): Promise<MaiaInferenceResult> {
    if (!this.session || !this.currentRating) {
      throw new Error('Model not loaded. Call loadModel() first.');
    }

    const startTime = performance.now();

    try {
      // Encode the position
      const inputData = encodeFenToPlanes(fen, this.positionHistory);
      
      // Create input tensor [batch, planes, height, width]
      const inputTensor = new ort.Tensor('float32', inputData, [1, 112, 8, 8]);

      // Run inference
      const feeds: Record<string, ort.Tensor> = {};
      feeds[this.session.inputNames[0]] = inputTensor;
      
      const results = await this.session.run(feeds);
      
      // Get policy output
      const policyOutput = results[this.session.outputNames[0]];
      const policyData = policyOutput.data as Float32Array;

      // Decode policy to moves
      const decodedMoves = decodePolicyToMoves(policyData, fen, this.config.topK);

      // Convert to MovePrediction format
      const predictions: MovePrediction[] = [];

      for (const { uci, probability } of decodedMoves) {
        if (probability < this.config.minProbability) continue;

        const from = uci.slice(0, 2);
        const to = uci.slice(2, 4);
        const promotion = uci.slice(4) || undefined;

        try {
          const chess = new Chess(fen);
          const move = chess.move({ from, to, promotion: promotion as any });

          if (move) {
            predictions.push({
              uci,
              san: move.san,
              from,
              to,
              probability,
              promotion,
            });
          }
        } catch {
          // Skip invalid moves
        }
      }

      const inferenceTimeMs = performance.now() - startTime;

      return {
        predictions,
        modelRating: this.currentRating,
        inferenceTimeMs,
      };
    } catch (error) {
      console.error('[MaiaEngine] Inference failed:', error);
      throw error;
    }
  }

  /**
   * Get the most likely move
   */
  async getBestMove(fen: string): Promise<MovePrediction | null> {
    const result = await this.predict(fen);
    return result.predictions[0] || null;
  }

  /**
   * Dispose of the engine
   */
  async dispose(): Promise<void> {
    if (this.session) {
      await this.session.release();
      this.session = null;
      this.currentRating = null;
    }
    this.positionHistory = [];
  }

  /**
   * Check if a model is available
   */
  static async checkModelAvailability(rating: MaiaRating): Promise<boolean> {
    try {
      const response = await fetch(MODEL_PATHS[rating], { method: 'HEAD' });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Get available rating levels
   */
  static getAvailableRatings(): MaiaRating[] {
    return [1100, 1200, 1300, 1400, 1500, 1600, 1700, 1800, 1900];
  }

  /**
   * Get the closest available rating to a target
   */
  static getClosestRating(target: number): MaiaRating {
    const ratings = MaiaEngine.getAvailableRatings();
    return ratings.reduce((closest, rating) =>
      Math.abs(rating - target) < Math.abs(closest - target) ? rating : closest
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// WEB WORKER ENGINE (NON-BLOCKING)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Web Worker-based Maia engine for non-blocking inference
 * 
 * Use this when you need smooth UI during inference:
 * - Animations
 * - User interactions
 * - Timer updates
 */
export class MaiaWorkerEngine {
  private worker: Worker | null = null;
  private pendingRequests = new Map<string, {
    resolve: (result: MaiaInferenceResult) => void;
    reject: (error: Error) => void;
  }>();
  private currentRating: MaiaRating | null = null;
  private config: MaiaConfig;
  private positionHistory: string[] = [];
  private readyPromise: Promise<void> | null = null;
  private loadPromise: Promise<void> | null = null;

  constructor(config: Partial<MaiaConfig> = {}) {
    this.config = { ...DEFAULT_MAIA_CONFIG, ...config };
  }

  /**
   * Initialize the worker
   */
  async init(): Promise<void> {
    if (this.worker) return;

    this.readyPromise = new Promise((resolve, reject) => {
      try {
        // Create worker from module
        this.worker = new Worker(
          new URL('./maia.worker.ts', import.meta.url),
          { type: 'module' }
        );

        this.worker.onmessage = (event) => {
          const { type, requestId, result, message, rating } = event.data;

          switch (type) {
            case 'ready':
              resolve();
              break;

            case 'loaded':
              this.currentRating = rating;
              break;

            case 'prediction':
              const pending = this.pendingRequests.get(requestId);
              if (pending) {
                pending.resolve(result);
                this.pendingRequests.delete(requestId);
              }
              break;

            case 'error':
              const errorPending = this.pendingRequests.get(requestId);
              if (errorPending) {
                errorPending.reject(new Error(message));
                this.pendingRequests.delete(requestId);
              }
              break;
          }
        };

        this.worker.onerror = (error) => {
          reject(error);
        };
      } catch (error) {
        reject(error);
      }
    });

    return this.readyPromise;
  }

  /**
   * Load a model in the worker
   */
  async loadModel(rating: MaiaRating): Promise<void> {
    await this.init();

    if (this.currentRating === rating) return;

    this.loadPromise = new Promise((resolve, reject) => {
      const handler = (event: MessageEvent) => {
        if (event.data.type === 'loaded' && event.data.rating === rating) {
          this.currentRating = rating;
          this.worker?.removeEventListener('message', handler);
          resolve();
        } else if (event.data.type === 'error') {
          this.worker?.removeEventListener('message', handler);
          reject(new Error(event.data.message));
        }
      };

      this.worker?.addEventListener('message', handler);
      this.worker?.postMessage({ type: 'load', rating });
    });

    return this.loadPromise;
  }

  /**
   * Update position history
   */
  updateHistory(fen: string): void {
    this.positionHistory = [fen, ...this.positionHistory].slice(0, 7);
  }

  /**
   * Clear position history
   */
  clearHistory(): void {
    this.positionHistory = [];
  }

  /**
   * Predict moves (non-blocking)
   */
  async predict(fen: string): Promise<MaiaInferenceResult> {
    if (!this.worker || !this.currentRating) {
      throw new Error('Worker not initialized or model not loaded');
    }

    const requestId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(requestId, { resolve, reject });

      this.worker!.postMessage({
        type: 'predict',
        fen,
        history: this.positionHistory,
        requestId,
        topK: this.config.topK,
      });

      // Timeout after 10 seconds
      setTimeout(() => {
        if (this.pendingRequests.has(requestId)) {
          this.pendingRequests.delete(requestId);
          reject(new Error('Prediction timeout'));
        }
      }, 10000);
    });
  }

  /**
   * Dispose of the worker
   */
  dispose(): void {
    if (this.worker) {
      this.worker.postMessage({ type: 'dispose' });
      this.worker.terminate();
      this.worker = null;
    }
    this.pendingRequests.clear();
    this.currentRating = null;
    this.positionHistory = [];
  }

  /**
   * Get engine state
   */
  getState(): MaiaEngineState {
    return {
      isLoading: this.loadPromise !== null,
      isReady: this.worker !== null && this.currentRating !== null,
      currentModel: this.currentRating,
      error: null,
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SINGLETON INSTANCES
// ═══════════════════════════════════════════════════════════════════════════

let defaultEngine: MaiaEngine | null = null;
let defaultWorkerEngine: MaiaWorkerEngine | null = null;

/**
 * Get the default main-thread engine
 */
export function getMaiaEngine(): MaiaEngine {
  if (!defaultEngine) {
    defaultEngine = new MaiaEngine();
  }
  return defaultEngine;
}

/**
 * Get the default worker engine (recommended for UI-heavy apps)
 */
export function getMaiaWorkerEngine(): MaiaWorkerEngine {
  if (!defaultWorkerEngine) {
    defaultWorkerEngine = new MaiaWorkerEngine();
  }
  return defaultWorkerEngine;
}

/**
 * Dispose all engines
 */
export async function disposeMaiaEngines(): Promise<void> {
  if (defaultEngine) {
    await defaultEngine.dispose();
    defaultEngine = null;
  }
  if (defaultWorkerEngine) {
    defaultWorkerEngine.dispose();
    defaultWorkerEngine = null;
  }
}


