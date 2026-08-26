import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

export default defineConfig({
  appType: 'spa',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@delve/contracts': path.resolve(__dirname, '../../packages/contracts/src/index.ts'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5174,
  },
})
