import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vitest/config'

// Preloads the text/amount faces (Geist 400 and 500). Geist Mono is only used for small
// details (last4, IDs), so it loads lazily through its @font-face.
function preloadFonts(pattern: RegExp): Plugin {
  let base = '/'
  return {
    name: 'preload-fonts',
    apply: 'build',
    configResolved(config) {
      base = config.base
    },
    transformIndexHtml: {
      order: 'post',
      handler(_html, { bundle }) {
        return Object.keys(bundle ?? {})
          .filter((file) => pattern.test(file))
          .map((file) => ({
            tag: 'link',
            attrs: { rel: 'preload', href: `${base}${file}`, as: 'font', type: 'font/woff2', crossorigin: '' },
            injectTo: 'head' as const,
          }))
      },
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  base: '/obsidian-bank/',
  plugins: [react(), tailwindcss(), preloadFonts(/geist-latin-(400|500)-normal-[\w-]+\.woff2$/)],
  build: { manifest: true },
  preview: {
    proxy: {
      '/obsidian-bank/auth': {
        target: 'http://127.0.0.1:54321',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/obsidian-bank/, ''),
      },
      '/obsidian-bank/rest': {
        target: 'http://127.0.0.1:54321',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/obsidian-bank/, ''),
      },
    },
  },
  resolve: {
    // Mirrors "paths" in tsconfig.app.json
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'supabase/tests/**/*.test.ts'],
  },
})
