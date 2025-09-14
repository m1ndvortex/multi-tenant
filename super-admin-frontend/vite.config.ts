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
    port: 3000,
    host: '0.0.0.0',
    hmr: {
      overlay: false
    },
    proxy: {
      '/api': {
        target: 'http://backend:8000',
        changeOrigin: true,
        ws: true,
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq, req) => {
            // Add cache-busting headers for development
            if (process.env.NODE_ENV !== 'production') {
              proxyReq.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
              proxyReq.setHeader('Pragma', 'no-cache');
              proxyReq.setHeader('Expires', '0');
            }
          });
        }
      },
      '/ws': {
        target: 'ws://backend:8000',
        ws: true,
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      input: {
        main: './index.html'
      },
      output: {
        // Add hash to filenames for cache busting
        entryFileNames: 'assets/[name].[hash].js',
        chunkFileNames: 'assets/[name].[hash].js',
        assetFileNames: 'assets/[name].[hash].[ext]'
      }
    }
  },
  define: {
    // Add build timestamp for cache busting
    __BUILD_TIMESTAMP__: JSON.stringify(Date.now()),
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version || '2.0.0'),
  },
  optimizeDeps: {
    // Pre-bundle dependencies for faster dev startup
    include: ['react', 'react-dom', '@tanstack/react-query'],
    // Force re-optimization of these packages
    force: process.env.NODE_ENV === 'development'
  },
})