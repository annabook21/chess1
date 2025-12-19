/**
 * Vitest Setup
 * 
 * Global test configuration and mocks.
 */

import '@testing-library/jest-dom';
import { vi, beforeAll, afterAll, afterEach } from 'vitest';

// ============================================================================
// GLOBAL MOCKS
// ============================================================================

/**
 * Mock localStorage
 */
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: vi.fn((index: number) => Object.keys(store)[index] || null),
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

/**
 * Mock matchMedia for responsive tests
 */
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

/**
 * Mock ResizeObserver
 */
class ResizeObserverMock {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

Object.defineProperty(window, 'ResizeObserver', {
  writable: true,
  value: ResizeObserverMock,
});

/**
 * Mock IntersectionObserver
 */
class IntersectionObserverMock {
  root = null;
  rootMargin = '';
  thresholds = [];
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
  takeRecords = vi.fn().mockReturnValue([]);
}

Object.defineProperty(window, 'IntersectionObserver', {
  writable: true,
  value: IntersectionObserverMock,
});

/**
 * Mock Audio (for sound effects)
 */
class AudioMock {
  src = '';
  volume = 1;
  play = vi.fn().mockResolvedValue(undefined);
  pause = vi.fn();
  load = vi.fn();
  addEventListener = vi.fn();
  removeEventListener = vi.fn();
}

Object.defineProperty(window, 'Audio', {
  writable: true,
  value: AudioMock,
});

/**
 * Mock ONNX Runtime (for Maia)
 * This is a simplified mock - tests that need real ONNX should be integration tests.
 * The policy output uses LC0 move encoding - we populate known move indices with higher values.
 */
vi.mock('onnxruntime-web', () => {
  // Create realistic policy with some moves having higher probabilities
  // LC0 indices for common opening moves (approximate):
  // e2e4 ≈ index 52, d2d4 ≈ index 36, g1f3 ≈ index 97, etc.
  const createPolicyOutput = () => {
    const policy = new Float32Array(1858).fill(0.001);
    // Set higher values for common move indices (these are approximations)
    policy[52] = 0.35;  // e2e4-ish
    policy[36] = 0.25;  // d2d4-ish
    policy[97] = 0.15;  // g1f3-ish
    policy[44] = 0.10;  // c2c4-ish
    policy[88] = 0.08;  // b1c3-ish
    return policy;
  };

  return {
    InferenceSession: {
      create: vi.fn().mockResolvedValue({
        inputNames: ['/input/planes'],
        outputNames: ['/output/policy', '/output/wdl'],
        run: vi.fn().mockResolvedValue({
          '/output/policy': {
            data: createPolicyOutput(),
            dims: [1, 1858],
          },
          '/output/wdl': {
            data: new Float32Array([0.3, 0.4, 0.3]),
            dims: [1, 3],
          },
        }),
        release: vi.fn(),
      }),
    },
    Tensor: vi.fn().mockImplementation((type, data, dims) => ({
      type,
      data,
      dims,
    })),
    env: {
      wasm: {
        wasmPaths: '',
        numThreads: 1,
        simd: true,
        proxy: false,
      },
    },
  };
});

/**
 * Mock Web Worker - Simulates Maia worker behavior
 */
class WorkerMock {
  onmessage: ((e: MessageEvent) => void) | null = null;
  onerror: ((e: ErrorEvent) => void) | null = null;
  private messageListeners: Array<(e: MessageEvent) => void> = [];

  constructor() {
    // Simulate worker becoming ready after construction
    setTimeout(() => {
      this.sendMessage({ type: 'ready' });
    }, 5);
  }

  private sendMessage(data: any) {
    if (this.onmessage) {
      this.onmessage(new MessageEvent('message', { data }));
    }
    this.messageListeners.forEach(listener => {
      listener(new MessageEvent('message', { data }));
    });
  }

  postMessage = vi.fn((message) => {
    // Simulate async response based on message type
    setTimeout(() => {
      if (message.type === 'load') {
        this.sendMessage({ 
          type: 'loaded', 
          rating: message.rating 
        });
      } else if (message.type === 'predict') {
        this.sendMessage({
          type: 'prediction',
          requestId: message.requestId,
          result: {
            predictions: [
              { uci: 'e2e4', san: 'e4', probability: 0.4, from: 'e2', to: 'e4' },
              { uci: 'd2d4', san: 'd4', probability: 0.3, from: 'd2', to: 'd4' },
            ],
            modelRating: 1500,
            inferenceTimeMs: 50,
          },
        });
      } else if (message.type === 'dispose') {
        // No response needed
      }
    }, 10);
  });

  terminate = vi.fn();
  
  addEventListener = vi.fn((event: string, handler: any) => {
    if (event === 'message') {
      this.messageListeners.push(handler);
    }
  });
  
  removeEventListener = vi.fn((event: string, handler: any) => {
    if (event === 'message') {
      this.messageListeners = this.messageListeners.filter(h => h !== handler);
    }
  });
  
  dispatchEvent = vi.fn();
}

Object.defineProperty(window, 'Worker', {
  writable: true,
  value: WorkerMock,
});

// ============================================================================
// TEST LIFECYCLE
// ============================================================================

beforeAll(() => {
  // Console silence for cleaner test output (optional)
  // vi.spyOn(console, 'log').mockImplementation(() => {});
  // vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  // Clear localStorage between tests
  localStorageMock.clear();
  
  // Reset all mocks
  vi.clearAllMocks();
});

afterAll(() => {
  vi.restoreAllMocks();
});

// ============================================================================
// CUSTOM MATCHERS
// ============================================================================

// Add custom matchers if needed
// expect.extend({
//   toBeValidFen(received: string) {
//     const fenPattern = /^([rnbqkpRNBQKP1-8]+\/){7}[rnbqkpRNBQKP1-8]+ [wb] [KQkq-]+ [a-h36-]+ \d+ \d+$/;
//     const pass = fenPattern.test(received);
//     return {
//       pass,
//       message: () => `expected ${received} ${pass ? 'not ' : ''}to be a valid FEN`,
//     };
//   },
// });

