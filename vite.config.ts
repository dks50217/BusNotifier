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
    proxy: {
      // API requests: /tdx-api/... → https://tdx.transportdata.tw/api/...
      // Token uses the TDX URL directly (CORS allowed on token endpoint).
      '/tdx-api': {
        target: 'https://tdx.transportdata.tw',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/tdx-api/, '/api'),
      },
    },
  },
})
