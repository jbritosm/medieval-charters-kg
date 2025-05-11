import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  // Base path for GitHub Pages - use repo name or '/' for custom domain
  base: '/medieval-charters-kg/',
  // Build options
  build: {
    outDir: 'dist',
    // Chunk size warnings at 1MB instead of default 500KB
    chunkSizeWarningLimit: 1000,
    // CSS code splitting
    cssCodeSplit: true
  }
})
