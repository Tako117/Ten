import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true
      },
      '/pose-proxy': {
        target: 'https://us-central1-sign-mt.cloudfunctions.net',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/pose-proxy/, '')
      }
    }
  }
})
