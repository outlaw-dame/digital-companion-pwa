import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'ANE — Autonomous Node Entity',
        short_name: 'ANE',
        description: 'Your local-first digital companion',
        theme_color: '#0a0a0f',
        background_color: '#0a0a0f',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        runtimeCaching: [
          {
            urlPattern: /^https?:\/\/localhost:3001\/api\//,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 },
            },
          },
          // Cache WASM files for LiteRT offline operation
          {
            urlPattern: /\/wasm\/litert\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'litert-wasm',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
      },
    }),
  ],

  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },

  optimizeDeps: {
    // Exclude large WASM/WebGPU packages from Vite's pre-bundling
    // They handle their own module loading and should be loaded dynamically
    exclude: ['@mlc-ai/web-llm', '@mediapipe/tasks-genai'],
  },

  build: {
    rollupOptions: {
      // Treat these as external during build — they're loaded dynamically
      // and cached by the browser, not bundled into the app chunk
      external: (id) =>
        id.includes('@mlc-ai/web-llm') || id.includes('@mediapipe/tasks-genai'),
    },
  },

  // Required for WebLLM's SharedArrayBuffer usage (cross-origin isolation)
  // Note: also requires these headers on your server:
  //   Cross-Origin-Opener-Policy: same-origin
  //   Cross-Origin-Embedder-Policy: require-corp
  worker: {
    format: 'es',
  },
});
