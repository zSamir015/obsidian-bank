// Renders the PNG icons for the web app manifest and iOS from public/favicon.svg.
// Run with `node scripts/pwa-icons.mjs` after changing the favicon; the PNGs are committed.
import { mkdirSync, readFileSync } from 'node:fs'
import { chromium } from '@playwright/test'

const svg = readFileSync(new URL('../public/favicon.svg', import.meta.url), 'utf8')
const background = '#050505'

// `scale` is the share of the square the mark fills. Maskable icons keep it inside the
// 80% safe zone, since the platform may crop them to a circle.
const icons = [
  { file: 'icon-192.png', size: 192, scale: 0.68 },
  { file: 'icon-512.png', size: 512, scale: 0.68 },
  { file: 'maskable-512.png', size: 512, scale: 0.5 },
  { file: 'apple-touch-icon.png', size: 180, scale: 0.62 },
]

mkdirSync(new URL('../public/icons/', import.meta.url), { recursive: true })
const browser = await chromium.launch()
const page = await browser.newPage({ deviceScaleFactor: 1 })
for (const { file, size, scale } of icons) {
  await page.setViewportSize({ width: size, height: size })
  const mark = Math.round(size * scale)
  await page.setContent(
    `<body style="margin:0;width:${size}px;height:${size}px;display:grid;place-items:center;background:${background}">
      <div style="width:${mark}px;height:${mark}px">${svg.replace('<svg ', '<svg width="100%" height="100%" ')}</div>
    </body>`,
  )
  await page.screenshot({ path: new URL(`../public/icons/${file}`, import.meta.url).pathname, omitBackground: false })
  console.log(`public/icons/${file}`)
}
await browser.close()
