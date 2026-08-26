import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    open: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('react-dom') || id.includes('react-router-dom')) return 'vendor'
          if (id.includes('framer-motion') || id.includes('lucide-react')) return 'ui'
          if (id.includes('recharts')) return 'charts'
          if (id.includes('@supabase/supabase-js')) return 'supabase'
          if (id.includes('@google/generative-ai') || id.includes('tesseract.js')) return 'ai'
        },
      },
    },
  },
})
