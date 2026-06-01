import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    global: 'globalThis',
  },
  resolve: {
    alias: {
      buffer: 'buffer',
      'buffer/': 'buffer',
    },
  },
  optimizeDeps: {
    include: ['buffer'],
  },
  server: {
    host: '0.0.0.0',
    port: 3003,
  },
  build: {
    minify: false,
    rollupOptions: {},
  },
});
