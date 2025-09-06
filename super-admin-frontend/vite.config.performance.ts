import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  plugins: [
    react(),
    // Bundle analyzer for performance monitoring
    visualizer({
      filename: 'dist/bundle-analysis.html',
      open: true,
      gzipSize: true,
      brotliSize: true,
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    // Performance optimizations
    target: 'es2020',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug'],
      },
    },
    
    // Code splitting configuration
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'query-vendor': ['@tanstack/react-query'],
          'ui-vendor': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-select',
            '@radix-ui/react-tabs',
            '@radix-ui/react-toast',
          ],
          'chart-vendor': ['chart.js', 'react-chartjs-2'],
          
          // Feature chunks
          'dashboard-core': [
            './src/pages/OptimizedDashboard.tsx',
            './src/hooks/useOptimizedDashboard.ts',
            './src/services/optimizedDashboardService.ts',
          ],
          'dashboard-components': [
            './src/components/MemoizedDashboardComponents.tsx',
            './src/components/VirtualScrollList.tsx',
          ],
          'performance-utils': [
            './src/utils/performanceMonitor.ts',
          ],
        },
        
        // Optimize chunk names
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId
            ? chunkInfo.facadeModuleId.split('/').pop()?.replace('.tsx', '').replace('.ts', '')
            : 'chunk';
          return `js/${facadeModuleId}-[hash].js`;
        },
        
        // Optimize asset names
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name?.split('.') || [];
          const ext = info[info.length - 1];
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext || '')) {
            return `images/[name]-[hash][extname]`;
          }
          if (/css/i.test(ext || '')) {
            return `css/[name]-[hash][extname]`;
          }
          return `assets/[name]-[hash][extname]`;
        },
      },
      
      // External dependencies (if using CDN)
      external: (id) => {
        // Externalize large dependencies if served via CDN
        return false; // Keep all dependencies bundled for now
      },
    },
    
    // Chunk size warnings
    chunkSizeWarningLimit: 1000, // 1MB warning limit
    
    // Source maps for production debugging
    sourcemap: process.env.NODE_ENV === 'development',
  },
  
  // Development optimizations
  server: {
    hmr: {
      overlay: false, // Disable error overlay for performance
    },
  },
  
  // Dependency optimization
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@tanstack/react-query',
      'chart.js',
      'react-chartjs-2',
    ],
    exclude: [
      // Exclude large dependencies that should be lazy loaded
    ],
  },
  
  // Performance monitoring in development
  define: {
    __PERFORMANCE_MONITORING__: JSON.stringify(process.env.NODE_ENV === 'development'),
    __BUNDLE_ANALYSIS__: JSON.stringify(process.env.ANALYZE === 'true'),
  },
});