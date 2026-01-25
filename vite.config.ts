
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',
  publicDir: 'public', // Enabled to serve manifest.json and sw.js
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  }
});
