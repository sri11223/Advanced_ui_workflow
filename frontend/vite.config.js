import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          canvas: ['konva', 'react-konva'],
          ui: ['framer-motion', 'lucide-react'],
        },
      },
    },
    sourcemap: false,
    chunkSizeWarningLimit: 1000,
  },
})
