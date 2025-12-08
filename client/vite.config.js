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
        target: import.meta.env.VITE_API_URL || 'http://localhost:8000',   // chỗ Laravel php artisan serve
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
