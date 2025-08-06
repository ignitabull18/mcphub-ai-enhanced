import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import tailwindcss from '@tailwindcss/vite';

// For runtime configuration, we'll always use relative paths
// BASE_PATH will be determined at runtime
const basePath = '';

// https://vitejs.dev/config/
export default defineConfig({
  base: './', // Always use relative paths for runtime configuration
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  define: {
    // BASE_PATH will be loaded at runtime
  },
  build: {
    sourcemap: true, // Enable source maps for production build
  },
  server: {
    proxy: {
      [`${basePath}/api`]: {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      [`${basePath}/auth`]: {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      [`${basePath}/config`]: {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      [`${basePath}/public-config`]: {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
