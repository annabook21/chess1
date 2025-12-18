/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteStaticCopy } from 'vite-plugin-static-copy';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    coverage: {
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/main.tsx'],
    },
  },
  resolve: {
    // Prevent duplicate React instances in production bundle
    dedupe: ['react', 'react-dom'],
  },
  plugins: [
    react(),
    // Copy ONNX runtime WASM files to dist for browser inference
    // Both .mjs (JavaScript loader) and .wasm (binary) files are required
    viteStaticCopy({
      targets: [
        // JavaScript loaders
        {
          src: 'node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.jsep.mjs',
          dest: 'assets',
        },
        {
          src: 'node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.mjs',
          dest: 'assets',
        },
        // WASM binaries (required for actual inference)
        {
          src: 'node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.jsep.wasm',
          dest: 'assets',
        },
        {
          src: 'node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.wasm',
          dest: 'assets',
        },
      ],
    }),
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/game': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
    // Headers for SharedArrayBuffer (needed for some WASM features)
    headers: {
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin',
    },
  },
  optimizeDeps: {
    // Exclude ONNX runtime from pre-bundling (it loads WASM dynamically)
    exclude: ['onnxruntime-web'],
  },
  worker: {
    // Enable ES modules in workers
    format: 'es',
  },
  build: {
    target: 'esnext',
    rollupOptions: {
      output: {
        // Keep WASM filenames stable for caching
        assetFileNames: (assetInfo) => {
          if (assetInfo.name?.endsWith('.wasm')) {
            return 'assets/[name][extname]';
          }
          return 'assets/[name]-[hash][extname]';
        },
      },
    },
  },
});
