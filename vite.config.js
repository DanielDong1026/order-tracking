import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // GitHub Pages 子路径部署：仓库名为 order-tracking，访问路径为 /order-tracking/
  base: '/order-tracking/',
  plugins: [react()],
  server: {
    port: 3000,
    open: true,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.js'],
    css: true,
    testTimeout: 15000,
  },
});
