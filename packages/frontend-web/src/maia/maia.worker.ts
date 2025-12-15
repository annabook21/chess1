/**
 * Maia Web Worker
 * 
 * Runs ONNX inference in a separate thread to avoid blocking the UI.
 * This provides smooth 60fps animations even during neural network inference.
 * 
 * Communication Protocol:
 * ───────────────────────────────────────────────────────────────────────────
 * Main → Worker: { type: 'load', rating: MaiaRating }
 * Worker → Main: { type: 'loaded', rating: MaiaRating } | { type: 'error', message: string }
 * 
 * Main → Worker: { type: 'predict', fen: string, history: string[], requestId: string }
 * Worker → Main: { type: 'prediction', requestId: string, result: MaiaInferenceResult }
 * ───────────────────────────────────────────────────────────────────────────
 */

import * as ort from 'onnxruntime-web';
import { encodeFenToPlanes, decodePolicyToMoves } from './encoder';
import type { MaiaRating, MovePrediction, MaiaInferenceResult } from './types';
import { Chess } from 'chess.js';

// ═══════════════════════════════════════════════════════════════════════════
// ONNX RUNTIME CONFIGURATION FOR WEB WORKER
// ═══════════════════════════════════════════════════════════════════════════

// Configure WASM paths - workers need explicit paths since they have different base URL
// Use the origin from the worker's location
const workerOrigin = self.location.origin;
ort.env.wasm.wasmPaths = `${workerOrigin}/assets/`;

// Disable multi-threading in worker - more compatible across browsers
// SharedArrayBuffer can cause issues on iOS/iPadOS with COEP/COOP headers
ort.env.wasm.numThreads = 1;

// Keep SIMD enabled for performance (widely supported now)
// Set to false if you encounter issues on older browsers
ort.env.wasm.simd = true;

// Disable proxy since we're already in a worker
ort.env.wasm.proxy = false;

console.log('[MaiaWorker] ONNX Runtime configured:', {
  wasmPaths: ort.env.wasm.wasmPaths,
  numThreads: ort.env.wasm.numThreads,
  simd: ort.env.wasm.simd,
  proxy: ort.env.wasm.proxy,
});

// ═══════════════════════════════════════════════════════════════════════════
// WORKER STATE
// ═══════════════════════════════════════════════════════════════════════════

let session: ort.InferenceSession | null = null;
let currentRating: MaiaRating | null = null;
let isLoading = false;

// ═══════════════════════════════════════════════════════════════════════════
// MESSAGE TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface LoadMessage {
  type: 'load';
  rating: MaiaRating;
}

interface PredictMessage {
  type: 'predict';
  fen: string;
  history: string[];
  requestId: string;
  topK?: number;
}

interface DisposeMessage {
  type: 'dispose';
}

type WorkerMessage = LoadMessage | PredictMessage | DisposeMessage;

// ═══════════════════════════════════════════════════════════════════════════
// MODEL LOADING
// ═══════════════════════════════════════════════════════════════════════════

async function loadModel(rating: MaiaRating): Promise<void> {
  if (isLoading) {
    throw new Error('Already loading a model');
  }
  
  if (session && currentRating === rating) {
    return; // Already loaded
  }
  
  isLoading = true;
  
  try {
    // Dispose existing session
    if (session) {
      await session.release();
      session = null;
    }
    
    const modelPath = `/models/maia-${rating}.onnx`;
    
    console.log(`[MaiaWorker] Loading ${modelPath}...`);
    const startTime = performance.now();
    
    // Configure for WASM execution - use only 'wasm' provider for compatibility
    const options: ort.InferenceSession.SessionOptions = {
      executionProviders: ['wasm'],
      graphOptimizationLevel: 'all',
    };
    
    // Add timeout to detect hangs (30 second timeout)
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Model loading timed out after 30 seconds. The ONNX WASM runtime may not be compatible with this browser/environment.`));
      }, 30000);
    });
    
    // Race between model loading and timeout
    session = await Promise.race([
      ort.InferenceSession.create(modelPath, options),
      timeoutPromise,
    ]);
    
    currentRating = rating;
    
    const elapsed = performance.now() - startTime;
    console.log(`[MaiaWorker] ✅ Maia-${rating} loaded in ${elapsed.toFixed(0)}ms`);
    console.log(`[MaiaWorker] Inputs: ${session.inputNames.join(', ')}`);
    console.log(`[MaiaWorker] Outputs: ${session.outputNames.join(', ')}`);
    
  } catch (error) {
    console.error(`[MaiaWorker] ❌ Failed to load model:`, error);
    throw error;
  } finally {
    isLoading = false;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// INFERENCE
// ═══════════════════════════════════════════════════════════════════════════

async function predict(
  fen: string,
  history: string[],
  topK: number = 5
): Promise<MaiaInferenceResult> {
  if (!session || !currentRating) {
    throw new Error('Model not loaded');
  }
  
  const startTime = performance.now();
  
  // Encode position
  const inputData = encodeFenToPlanes(fen, history);
  
  // Create input tensor [batch=1, planes=112, height=8, width=8]
  const inputTensor = new ort.Tensor('float32', inputData, [1, 112, 8, 8]);
  
  // Run inference
  const feeds: Record<string, ort.Tensor> = {};
  feeds[session.inputNames[0]] = inputTensor;
  
  const results = await session.run(feeds);
  
  // Get policy output
  const policyOutput = results[session.outputNames[0]];
  const policyData = policyOutput.data as Float32Array;
  
  // Decode to moves
  const decodedMoves = decodePolicyToMoves(policyData, fen, topK);
  
  // Convert to MovePrediction with SAN notation
  const predictions: MovePrediction[] = [];
  
  for (const { uci, probability } of decodedMoves) {
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
    modelRating: currentRating,
    inferenceTimeMs,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// MESSAGE HANDLER
// ═══════════════════════════════════════════════════════════════════════════

self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  const message = event.data;
  
  try {
    switch (message.type) {
      case 'load': {
        await loadModel(message.rating);
        self.postMessage({
          type: 'loaded',
          rating: message.rating,
        });
        break;
      }
      
      case 'predict': {
        const result = await predict(
          message.fen,
          message.history,
          message.topK ?? 5
        );
        self.postMessage({
          type: 'prediction',
          requestId: message.requestId,
          result,
        });
        break;
      }
      
      case 'dispose': {
        if (session) {
          await session.release();
          session = null;
          currentRating = null;
        }
        self.postMessage({ type: 'disposed' });
        break;
      }
    }
  } catch (error) {
    self.postMessage({
      type: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
      requestId: (message as PredictMessage).requestId,
    });
  }
};

// Signal that worker is ready
self.postMessage({ type: 'ready' });
