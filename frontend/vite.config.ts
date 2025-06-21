import { defineConfig } from 'vite'
import preact from '@preact/preset-vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [preact()],
  build: {
    sourcemap: true, // Enable source maps for production
    rollupOptions: {
      output: {
        manualChunks: {
          // Split vendor code for better caching
          vendor: ['preact', 'preact/hooks'],
          router: ['preact-router'],
        },
      },
    },
  },
  server: {
    port: 5173,
    host: true, // Allow external connections
  },
  preview: {
    port: 4173,
    host: true,
  },
})
