import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

const DAY = 60 * 60 * 24

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['pokedex-icon.svg', 'pokedex-apple-touch.png'],
      manifest: {
        id: '/',
        name: 'Pokédex',
        short_name: 'Pokédex',
        description:
          'Look up Pokémon, moves, abilities, items and type matchups, compare base stats, and keep track of the Pokémon you own.',
        lang: 'en',
        theme_color: '#f4f4f5',
        background_color: '#f4f4f5',
        display: 'standalone',
        orientation: 'portrait-primary',
        start_url: '/',
        scope: '/',
        categories: ['entertainment', 'games', 'reference'],
        icons: [
          { src: '/pokedex-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pokedex-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: '/pokedex-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
        shortcuts: [
          { name: 'Search', url: '/search' },
          { name: 'Type effectiveness', url: '/tools/type-effectiveness' },
          { name: 'Trainer', url: '/trainer' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallback: '/index.html',
        runtimeCaching: [
          {
            // Reference data rarely changes, so answer instantly and refresh in the background.
            // Full Pokémon records are large; this cap keeps the cache near 100 MB.
            urlPattern: /^https:\/\/pokeapi\.co\/api\/v2\//,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'pokeapi-responses',
              expiration: { maxEntries: 300, maxAgeSeconds: 30 * DAY, purgeOnQuotaError: true },
              cacheableResponse: { statuses: [200] },
            },
          },
          {
            // Pixel sprites are tiny, so there is room to keep the whole Pokédex offline.
            urlPattern:
              /^https:\/\/raw\.githubusercontent\.com\/PokeAPI\/sprites\/.*\/sprites\/(pokemon\/\d+\.png|items\/)/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'pokemon-sprites',
              expiration: { maxEntries: 2000, maxAgeSeconds: 90 * DAY, purgeOnQuotaError: true },
              cacheableResponse: { statuses: [200] },
            },
          },
          {
            urlPattern: /^https:\/\/raw\.githubusercontent\.com\/PokeAPI\/sprites\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'pokemon-artwork',
              expiration: { maxEntries: 150, maxAgeSeconds: 30 * DAY, purgeOnQuotaError: true },
              cacheableResponse: { statuses: [200] },
            },
          },
        ],
      },
    }),
  ],
})
