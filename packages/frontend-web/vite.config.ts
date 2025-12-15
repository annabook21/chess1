import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
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
