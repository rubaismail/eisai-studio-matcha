import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // Lets the website call /api/... and reach the API running on port 4000.
    proxy: { '/api': 'http://localhost:4000' },
  },
  test: { environment: 'jsdom', setupFiles: './src/test-setup.ts' },
});
