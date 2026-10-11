import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5180,
    host: true,
  },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        // Keep the heavy libraries in their own cacheable chunks.
        manualChunks: {
          leaflet: ['leaflet'],
          charts: ['recharts'],
          react: ['react', 'react-dom'],
        },
      },
    },
  },
});
