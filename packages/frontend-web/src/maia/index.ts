/**
 * Maia Chess Engine Module
 * 
 * Browser-based neural network for human-like move prediction.
 * 
 * OPTIMIZED IMPLEMENTATION:
 * - Web Worker for non-blocking UI
 * - Prediction caching
 * - Debounced updates
 * - Pre-computed move mappings
 * 
 * @example
 * ```tsx
 * import { MaiaProvider, useMaiaPredictions } from './maia';
 * 
 * function App() {
 *   return (
 *     <MaiaProvider initialRating={1500} useWorker={true}>
 *       <ChessGame />
 *     </MaiaProvider>
 *   );
 * }
 * 
 * function ChessGame() {
 *   const { predictions, isReady, inferenceTime } = useMaiaPredictions(fen);
 *   
 *   if (!isReady) return <div>Loading Maia...</div>;
 *   
 *   return (
 *     <div>
 *       <p>Inference: {inferenceTime.toFixed(0)}ms</p>
 *       {predictions.map(p => (
 *         <div key={p.uci}>
 *           {p.san}: {(p.probability * 100).toFixed(1)}%
 *         </div>
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export type {
  MaiaRating,
  MovePrediction,
  MaiaInferenceResult,
  MaiaEngineState,
  MaiaConfig,
} from './types';

export {
  DEFAULT_MAIA_CONFIG,
  LC0_INPUT_PLANES,
  LC0_BOARD_SIZE,
  LC0_INPUT_SIZE,
  LC0_POLICY_SIZE,
  formatProbability,
  formatProbabilityValue,
} from './types';

// ═══════════════════════════════════════════════════════════════════════════
// ENGINE
// ═══════════════════════════════════════════════════════════════════════════

export {
  MaiaEngine,
  MaiaWorkerEngine,
  getMaiaEngine,
  getMaiaWorkerEngine,
  disposeMaiaEngines,
} from './MaiaEngine';

// ═══════════════════════════════════════════════════════════════════════════
// ENCODER (for advanced usage)
// ═══════════════════════════════════════════════════════════════════════════

export {
  encodeFenToPlanes,
  decodePolicyToMoves,
  getUciPolicyIndex,
  getPolicyUci,
} from './encoder';

// ═══════════════════════════════════════════════════════════════════════════
// REACT INTEGRATION
// ═══════════════════════════════════════════════════════════════════════════

export {
  MaiaProvider,
  useMaiaContext,
  useMaiaPredictions,
  useMaiaEngine,
} from './useMaia';

// ═══════════════════════════════════════════════════════════════════════════
// DEBUG UTILITIES
// ═══════════════════════════════════════════════════════════════════════════

export { inspectModel } from './debugModel';
export { testEncoder } from './testEncoder';

// ═══════════════════════════════════════════════════════════════════════════
// SAMPLING & SCORING UTILITIES
// ═══════════════════════════════════════════════════════════════════════════

export {
  sampleMove,
  brierScore,
  logScore,
  brierToPoints,
  calculatePredictionReward,
  getPredictionDifficulty,
  TEMPERATURE_PRESETS,
} from './sampling';



