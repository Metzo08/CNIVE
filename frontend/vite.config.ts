import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/uploads': {
        target: 'http://localhost:8001',
        changeOrigin: true
      },
      '/api': {
        target: 'http://localhost:8001',
        changeOrigin: true
      }
    }
  }
})

