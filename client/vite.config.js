// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  }, server: {
    port: 5173,
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || import.meta.env.VITE_API_URL || 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, '/api'), // giữ nguyên /api
      },
    },
  },
})
