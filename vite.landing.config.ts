import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Standalone build config for the marketing/landing site.
// Kept separate from the Tauri app build (vite.config.ts) so the desktop
// app is never affected. Outputs static files to dist-landing/.
//
// base is set to the GitHub Pages project path (/Tracely/). Override with
// LANDING_BASE=/ for local `vite preview` or a custom domain.
export default defineConfig({
  root: path.resolve(__dirname, 'landing'),
  base: process.env.LANDING_BASE ?? '/Tracely/',
  plugins: [react(), tailwindcss()],
  // Serve logos and other static assets from the existing public/ dir.
  publicDir: path.resolve(__dirname, 'public'),
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: path.resolve(__dirname, 'dist-landing'),
    emptyOutDir: true,
  },
})
