import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const BACKEND = 'http://localhost:8000';

export default defineConfig({
  server: {
    port: 3000,
    host: '0.0.0.0',
    allowedHosts: ['app.teamcodezilla.in'],
    proxy: {
      // All backend API routes forwarded to local FastAPI
      '/users': { target: BACKEND, changeOrigin: true },
      '/auth': { target: BACKEND, changeOrigin: true },
      '/sos': { target: BACKEND, changeOrigin: true },
      '/api': { target: BACKEND, changeOrigin: true },
      '/direct': { target: BACKEND, changeOrigin: true },
      '/direct-request': { target: BACKEND, changeOrigin: true },
      '/accept': { target: BACKEND, changeOrigin: true },
      '/baseline': { target: BACKEND, changeOrigin: true },
      '/baseline-risk': { target: BACKEND, changeOrigin: true },
      '/red-zones': { target: BACKEND, changeOrigin: true },
      '/guardian': { target: BACKEND, changeOrigin: true },
      '/update-citizen-location': { target: BACKEND, changeOrigin: true },
      '/update-guardian-location': { target: BACKEND, changeOrigin: true },
      '/generate-verification-otp': { target: BACKEND, changeOrigin: true },
      '/verify-otp': { target: BACKEND, changeOrigin: true },
      '/route-risk': { target: BACKEND, changeOrigin: true },
      '/failsafe': { target: BACKEND, changeOrigin: true },
      // WebSocket connections
      '/ws': {
        target: BACKEND,
        changeOrigin: true,
        ws: true,
        rewrite: (path) => path,
      },
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    }
  }
});
