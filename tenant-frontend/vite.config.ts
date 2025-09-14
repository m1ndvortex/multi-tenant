import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 3001,
    host: '0.0.0.0',
    hmr: {
      overlay: true,
      clientPort: 3001
    },
    proxy: {
      '/api': {
        target: 'http://backend:8000',
        changeOrigin: true,
        secure: false,
        ws: true, // Enable WebSocket proxying
      },
      // WebSocket endpoints
      '/ws': {
        target: 'ws://backend:8000',
        changeOrigin: true,
        ws: true,
      },
      // Some services (dashboard) are mounted at root paths
      '/dashboard': {
        target: 'http://backend:8000',
        changeOrigin: true,
      },
    },
    watch: {
      usePolling: false,
      interval: 100,
      ignored: ['**/node_modules/**', '**/dist/**', '**/coverage/**']
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    minify: 'esbuild',
    target: 'esnext',
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          tanstack: ['@tanstack/react-query'],
          ui: ['lucide-react', '@radix-ui/react-slot'],
        },
      },
      external: (id) => {
        // Exclude test files from build
        return id.includes('/test/') || 
               id.includes('.test.') || 
               id.includes('.spec.') ||
               id.includes('vitest') ||
               id.includes('@testing-library')
      }
    }
  },
  optimizeDeps: {
    include: [
      'react', 
      'react-dom', 
      'react-router-dom',
      '@tanstack/react-query',
      'lucide-react'
    ],
    exclude: ['@testing-library/react', 'vitest']
  },
  define: {
    __DEV__: JSON.stringify(process.env.NODE_ENV === 'development'),
  },
})