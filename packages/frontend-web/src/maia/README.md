# Maia Chess Engine Integration

Browser-based neural network for human-like move prediction using ONNX Runtime Web.

## Overview

Maia is a neural network trained on millions of human chess games to predict what moves humans at specific rating levels would play. This integration runs Maia directly in the browser using WebAssembly.

### Key Features

| Feature | Benefit |
|---------|---------|
| 🧠 **Human-like predictions** | Trained on 300M+ human games |
| 🎯 **Rating-specific models** | 1100 to 1900 ELO variants |
| ⚡ **Web Worker inference** | Non-blocking UI, smooth animations |
| 💾 **Prediction caching** | Instant results for repeated positions |
| 📦 **Zero server cost** | All inference happens client-side |

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Browser                              │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐                                           │
│  │   React UI   │ ◄─── useMaiaPredictions(fen)              │
│  └──────┬───────┘                                           │
│         │                                                    │
│         ▼                                                    │
│  ┌──────────────┐     ┌───────────────────────────────────┐ │
│  │ MaiaProvider │────▶│          Web Worker               │ │
│  └──────────────┘     │  ┌─────────────┐  ┌────────────┐  │ │
│                       │  │   Encoder   │  │ ONNX Model │  │ │
│                       │  │ FEN → 112   │──│ maia.onnx  │  │ │
│                       │  │   planes    │  └────────────┘  │ │
│                       │  └─────────────┘                  │ │
│                       └───────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Quick Start

### 1. Install Dependencies

```bash
cd packages/frontend-web
pnpm install
```

### 2. Download Maia Models

```bash
# Run the model download script (recommended)
./scripts/download-maia-models.sh
```

Or download manually from HuggingFace:
```bash
# Download pre-converted ONNX models (thanks to Sherman Siu)
curl -L -o public/models/maia-1500.onnx \
  "https://huggingface.co/shermansiu/maia-1500/resolve/main/model.onnx"

# Available ratings: 1100, 1200, 1300, 1400, 1500, 1600, 1700, 1800, 1900
```

### 3. Use in Your App

```tsx
import { MaiaProvider, useMaiaPredictions } from './maia';

// Wrap your app
function App() {
  return (
    <MaiaProvider 
      initialRating={1500}
      useWorker={true}  // Recommended for smooth UI
    >
      <ChessGame />
    </MaiaProvider>
  );
}

// Use predictions in components
function ChessGame() {
  const [fen, setFen] = useState('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
  
  const { 
    predictions,
    isReady,
    isLoading,
    inferenceTime 
  } = useMaiaPredictions(fen);
  
  if (!isReady) return <div>Loading Maia engine...</div>;
  
  return (
    <div>
      <h2>Human-like Moves</h2>
      {predictions.map(p => (
        <div key={p.uci}>
          <strong>{p.san}</strong>: {(p.probability * 100).toFixed(1)}%
        </div>
      ))}
      <small>Inference: {inferenceTime.toFixed(0)}ms</small>
    </div>
  );
}
```

## API Reference

### `<MaiaProvider>`

Provider component that initializes the Maia engine.

```tsx
<MaiaProvider
  initialRating={1500}    // Which model to load (1100-1900)
  autoLoad={true}         // Load model on mount
  useWorker={true}        // Use Web Worker (recommended)
>
  {children}
</MaiaProvider>
```

### `useMaiaPredictions(fen, debounceMs?)`

Hook for getting move predictions.

```tsx
const {
  predictions,   // MovePrediction[] - sorted by probability
  isLoading,     // boolean - currently running inference
  isReady,       // boolean - model loaded and ready
  error,         // string | null - error message
  inferenceTime, // number - inference time in ms
  modelRating,   // MaiaRating | null - current model
} = useMaiaPredictions(fen, 100); // 100ms debounce
```

### `useMaiaContext()`

Access the full Maia context.

```tsx
const {
  state,            // MaiaEngineState
  loadModel,        // (rating: MaiaRating) => Promise<void>
  predict,          // (fen: string) => Promise<MaiaInferenceResult>
  updateHistory,    // (fen: string) => void
  clearHistory,     // () => void
  availableRatings, // MaiaRating[]
  isUsingWorker,    // boolean
} = useMaiaContext();
```

### Direct Engine Access

```tsx
import { MaiaEngine, MaiaWorkerEngine } from './maia';

// Main thread (simpler, but blocks UI)
const engine = new MaiaEngine();
await engine.loadModel(1500);
const result = await engine.predict(fen);

// Web Worker (recommended for production)
const workerEngine = new MaiaWorkerEngine();
await workerEngine.init();
await workerEngine.loadModel(1500);
const result = await workerEngine.predict(fen);
```

## Input Encoding

Maia uses the Lc0 (Leela Chess Zero) input format:

| Planes | Content |
|--------|---------|
| 0-95 | Piece positions (6 types × 2 colors × 8 history steps) |
| 96-99 | Castling rights |
| 100 | Side to move |
| 101-102 | Repetition counters |
| 103 | Fifty-move counter |
| 104-110 | Reserved |
| 111 | Constant (all ones) |

**Total: 112 planes × 8 × 8 = 7,168 values**

## Performance

| Metric | Value |
|--------|-------|
| Model load time | ~1-2 seconds |
| Inference time | ~50-150ms |
| Memory usage | ~100 MB |
| Cache hit time | ~1ms |

### Optimization Tips

1. **Use the Web Worker** - Prevents UI jank during inference
2. **Enable caching** - Built-in, repeated positions are instant
3. **Debounce inputs** - Default 100ms prevents wasted inference
4. **Preload models** - Load during splash screen

## Model Files

Place in `public/models/`:

| File | Rating | Description |
|------|--------|-------------|
| maia-1100.onnx | 1100 | Beginner-level predictions |
| maia-1300.onnx | 1300 | Casual player |
| maia-1500.onnx | 1500 | Club player (default) |
| maia-1700.onnx | 1700 | Strong amateur |
| maia-1900.onnx | 1900 | Expert-level |

## Troubleshooting

### "Model not found"
- Ensure ONNX files are in `public/models/`
- Check browser network tab for 404s
- Run the download script

### Slow inference
- Ensure `useWorker={true}` in provider
- Check browser supports WebAssembly
- Close heavy background tabs

### Worker errors
- Vite needs to bundle the worker correctly
- Check for CORS issues with model files
- Fallback to main thread if worker fails

## Research

This implementation is based on:

- [Maia Chess](https://maiachess.com) - Human-like chess AI research
- [maia-platform-frontend](https://github.com/csslab/maia-platform-frontend) - Reference implementation
- [Leela Chess Zero](https://lczero.org) - Neural network architecture
- [ONNX Runtime Web](https://onnxruntime.ai) - Browser inference engine
- [a0lite-js](https://ishan.page/blog/a0lite-js/) - TypeScript chess engine patterns
