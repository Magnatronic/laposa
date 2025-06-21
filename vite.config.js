import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/laposa/',  // This should match your repository name
  server: {
    port: 3000,
    strictPort: true, // Exit if port 3000 is already in use
    host: true // Allow external connections
  },
  preview: {
    port: 3000,
    strictPort: true
  },
  build: {
    outDir: 'dist',
  }
})
