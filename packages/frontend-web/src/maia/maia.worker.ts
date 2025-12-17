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
let currentAbortController: AbortController | null = null;
let pendingLoad: { rating: MaiaRating; resolve: () => void; reject: (err: Error) => void } | null = null;

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
  // If already loaded with the correct rating, return immediately
  if (session && currentRating === rating && !isLoading) {
    return;
  }
  
  // If already loading, queue this request
  if (isLoading) {
    // Cancel any pending load request (only keep the latest)
    if (pendingLoad) {
      pendingLoad.reject(new Error('Load request superseded'));
    }
    
    return new Promise((resolve, reject) => {
      pendingLoad = { rating, resolve, reject };
    });
  }
  
  // Cancel any in-flight fetch
  if (currentAbortController) {
    currentAbortController.abort();
    currentAbortController = null;
  }
  
  isLoading = true;
  
  try {
    // Dispose existing session
    if (session) {
      await session.release();
      session = null;
      currentRating = null;
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
    
    // Try loading directly from URL first (ONNX Runtime Web handles this better)
    // If that fails, fall back to ArrayBuffer approach
    console.log(`[MaiaWorker] Attempting to load model from URL: ${modelPath}...`);
    try {
      // Create abort controller for this fetch
      currentAbortController = new AbortController();
      
      // First verify the file exists and get its size
      const headResponse = await fetch(modelPath, {
        method: 'HEAD',
        signal: currentAbortController.signal,
      });
      
      if (!headResponse.ok) {
        throw new Error(`Model file not found (${headResponse.status}): ${modelPath}`);
      }
      
      // Check if we got HTML instead of a model file (CloudFront 404 page)
      const contentType = headResponse.headers.get('content-type');
      if (contentType && contentType.includes('text/html')) {
        throw new Error(`Model file not found - got HTML response (404). Model ${rating} may not be uploaded to S3.`);
      }
      
      const contentLength = headResponse.headers.get('content-length');
      if (contentLength) {
        const sizeMB = parseInt(contentLength) / (1024 * 1024);
        console.log(`[MaiaWorker] Model size: ${sizeMB.toFixed(2)} MB`);
        
        // Verify reasonable size (should be ~3-4MB for Maia models)
        if (parseInt(contentLength) < 1000000) {
          throw new Error(`Model file seems too small (${sizeMB.toFixed(2)} MB) - may be corrupted or wrong file`);
        }
      }
      
      currentAbortController = null;
      
      // Try loading directly from URL (ONNX Runtime Web handles this better)
      console.log(`[MaiaWorker] Creating inference session from URL...`);
      session = await Promise.race([
        ort.InferenceSession.create(modelPath, options),
        timeoutPromise,
      ]);
      
    } catch (urlError) {
      console.warn(`[MaiaWorker] URL loading failed, trying ArrayBuffer approach:`, urlError);
      
      // Fallback: Try ArrayBuffer approach
      try {
        // Create abort controller for this fetch
        currentAbortController = new AbortController();
        
        console.log(`[MaiaWorker] Fetching ${modelPath} as ArrayBuffer...`);
        const response = await fetch(modelPath, {
          signal: currentAbortController.signal,
        });
        
        currentAbortController = null;
        
        if (!response.ok) {
          throw new Error(`Model file not found (${response.status}): ${modelPath}`);
        }
        
        // Check if we got HTML instead of a model file (CloudFront 404 page)
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('text/html')) {
          // Read first few bytes to confirm it's HTML
          const preview = await response.clone().text();
          if (preview.includes('<html') || preview.includes('<!DOCTYPE')) {
            throw new Error(`Model file not found - got HTML 404 page. Model ${rating} may not be uploaded to S3. Available models: 1100, 1300, 1500, 1700, 1900`);
          }
        }
        
        const modelData = await response.arrayBuffer();
        console.log(`[MaiaWorker] Model fetched: ${(modelData.byteLength / (1024 * 1024)).toFixed(2)} MB`);
        
        // Verify ArrayBuffer is not empty and has reasonable size
        if (modelData.byteLength === 0) {
          throw new Error('Model file is empty');
        }
        
        // Maia models should be ~3-4MB
        if (modelData.byteLength < 1000000) {
          throw new Error(`Model file seems too small (${(modelData.byteLength / 1024).toFixed(0)} KB) - may be corrupted or wrong file. Expected ~3-4MB.`);
        }
        
        // Check if it looks like an ONNX file (starts with protobuf magic bytes)
        const view = new Uint8Array(modelData.slice(0, 16));
        const hasProtobufHeader = view[0] === 0x08 || view[0] === 0x0A; // Common protobuf start bytes
        if (!hasProtobufHeader) {
          console.warn(`[MaiaWorker] Warning: Model file may not be a valid ONNX file (unexpected header bytes)`);
        }
        
        console.log(`[MaiaWorker] Creating inference session from ArrayBuffer...`);
        session = await Promise.race([
          ort.InferenceSession.create(modelData, options),
          timeoutPromise,
        ]);
        
      } catch (arrayBufferError) {
        currentAbortController = null;
        // Check if fetch was aborted
        if (arrayBufferError instanceof Error && arrayBufferError.name === 'AbortError') {
          throw new Error('Model load cancelled');
        }
        throw new Error(`Failed to load model (tried URL and ArrayBuffer): ${arrayBufferError instanceof Error ? arrayBufferError.message : 'Unknown error'}`);
      }
    }
    
    currentRating = rating;
    
    const elapsed = performance.now() - startTime;
    console.log(`[MaiaWorker] ✅ Maia-${rating} loaded in ${elapsed.toFixed(0)}ms`);
    console.log(`[MaiaWorker] Inputs: ${session.inputNames.join(', ')}`);
    console.log(`[MaiaWorker] Outputs: ${session.outputNames.join(', ')}`);
    
    // Resolve any pending load request
    if (pendingLoad && pendingLoad.rating === rating) {
      pendingLoad.resolve();
      pendingLoad = null;
    }
    
  } catch (error) {
    console.error(`[MaiaWorker] ❌ Failed to load model:`, error);
    // Reset state on error
    session = null;
    currentRating = null;
    currentAbortController = null;
    
    // Reject any pending load request
    if (pendingLoad) {
      pendingLoad.reject(error instanceof Error ? error : new Error('Model load failed'));
      pendingLoad = null;
    }
    
    throw error;
  } finally {
    isLoading = false;
    currentAbortController = null;
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



