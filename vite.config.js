import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    allowedHosts: ['.e2b.app', '.previews.kosuke.ai'],
    proxy: {
      '/api': {
        target: process.env.PHP_API_URL || 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
});
