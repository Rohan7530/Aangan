import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// The browser talks only to our own server. Vite proxies /api to it in dev,
// so the web app never needs to know the server's port or origin.
// AANGAN_API_PORT lets the test setup (npm run dev:test) point at the test-room server.
const apiPort = process.env.AANGAN_API_PORT ?? '3001';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: `http://localhost:${apiPort}`,
        changeOrigin: true,
      },
    },
  },
});
