import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/laposa/',  // This should match your repository name
  build: {
    outDir: 'dist',
  }
})
