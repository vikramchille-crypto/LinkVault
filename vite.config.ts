import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'node:path'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // We write manifest.webmanifest ourselves (public/manifest.webmanifest)
      // so it's easy to read/edit directly, including the Web Share Target
      // config used for Android's Share-to-LinkVault flow.
      manifest: false,
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest}'],
        // Deliberately do NOT runtime-cache Supabase API calls. Saved links
        // are NOT available offline — only the app shell (HTML/JS/CSS) is
        // precached so the app loads instantly and installs like a native
        // app. Pretending link data works offline when it doesn't would be
        // actively misleading.
        navigateFallbackDenylist: [/^\/share/],
      },
      includeAssets: ['icons/*.png'],
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
  },
})
