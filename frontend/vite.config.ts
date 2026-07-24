import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'script-defer',
      devOptions: { enabled: false },
      includeAssets: ['favicon.jpg', 'delve-logo.jpg'],
      manifest: {
        name: 'DELVE',
        short_name: 'DELVE',
        description: 'Worldwide travel marketplace — stay, move, explore, ask locals.',
        theme_color: '#8e54ff',
        background_color: '#8e54ff',
        display: 'standalone',
        orientation: 'portrait-primary',
        icons: [
          {
            src: '/delve-logo.jpg',
            sizes: '512x512',
            type: 'image/jpeg',
            purpose: 'any',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,jpg,jpeg,svg,woff2}'],
      },
    }),
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://127.0.0.1:8000', changeOrigin: true },
      '/media': { target: 'http://127.0.0.1:8000', changeOrigin: true },
    },
  },
})
