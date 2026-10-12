import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
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

// Writes dist/sw.js from src/pwa/sw.js with the list of app-shell files to precache: the HTML,
// the entry JavaScript and its static imports, their CSS, the preloaded fonts, the Spanish
// catalogue, the manifest and its icons. The version is a hash of those files, so every
// deploy that changes the shell installs a new service worker.
function serviceWorker(fonts: RegExp, publicFiles: string[]): Plugin {
  let base = '/'
  let outDir = 'dist'
  return {
    name: 'service-worker',
    apply: 'build',
    configResolved(config) {
      base = config.base
      outDir = config.build.outDir
    },
    writeBundle(_options, bundle) {
      const files = new Set(['index.html', ...publicFiles])
      const chunks = Object.values(bundle).filter((output) => output.type === 'chunk')
      const addChunk = (fileName: string) => {
        const chunk = chunks.find((candidate) => candidate.fileName === fileName)
        if (!chunk || files.has(chunk.fileName)) return
        files.add(chunk.fileName)
        for (const css of chunk.viteMetadata?.importedCss ?? []) files.add(css)
        for (const imported of chunk.imports) addChunk(imported)
      }
      for (const chunk of chunks) {
        if (chunk.isEntry || chunk.facadeModuleId?.endsWith('/src/i18n/messages/es.ts')) addChunk(chunk.fileName)
      }
      for (const fileName of Object.keys(bundle)) if (fonts.test(fileName)) files.add(fileName)

      const precache = [...files].sort()
      const hash = createHash('sha256')
      for (const file of precache) hash.update(file).update(readFileSync(join(outDir, file)))
      const source = readFileSync(fileURLToPath(new URL('./src/pwa/sw.js', import.meta.url)), 'utf8')
        .replace("'__VERSION__'", JSON.stringify(hash.digest('hex').slice(0, 12)))
        .replace("'__BASE__'", JSON.stringify(base))
        .replace('__PRECACHE__', JSON.stringify(precache))
      writeFileSync(join(outDir, 'sw.js'), source)
    },
  }
}

const PRELOADED_FONTS = /geist-latin-(400|500)-normal-[\w-]+\.woff2$/

// https://vite.dev/config/
export default defineConfig({
  base: '/obsidian-bank/',
  plugins: [
    react(),
    tailwindcss(),
    preloadFonts(PRELOADED_FONTS),
    serviceWorker(PRELOADED_FONTS, [
      'manifest.webmanifest',
      'favicon.svg',
      'icons/icon-192.png',
      'icons/icon-512.png',
      'icons/maskable-512.png',
      'icons/apple-touch-icon.png',
    ]),
  ],
  build: {
    manifest: true,
    rolldownOptions: {
      output: {
        advancedChunks: {
          groups: [{ name: 'shared', test: /\/src\/(hooks|lib|components\/ui)\//, minShareCount: 2 }],
        },
      },
    },
  },
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
