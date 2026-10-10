import { readFile } from 'node:fs/promises'
import { gzipSync } from 'node:zlib'

const manifest = JSON.parse(await readFile('dist/.vite/manifest.json', 'utf8'))
const entry = Object.values(manifest).find((chunk) => chunk.isEntry && chunk.src === 'index.html')
const card3D = Object.values(manifest).find((chunk) => chunk.src === 'src/pages/cards/Card3D.tsx')

if (!entry) throw new Error('Vite entry for index.html is missing from the build manifest.')
if (!card3D?.isDynamicEntry) throw new Error('Card3D is no longer a dynamic build entry.')

const initialFiles = new Set()
function collectStaticImports(chunk) {
  if (initialFiles.has(chunk.file)) return
  initialFiles.add(chunk.file)
  for (const key of chunk.imports ?? []) collectStaticImports(manifest[key])
}

collectStaticImports(entry)

if (initialFiles.has(card3D.file)) {
  throw new Error('Card3D is statically imported into the initial JavaScript bundle.')
}

let initialGzipBytes = 0
for (const file of initialFiles) {
  if (file.endsWith('.js')) initialGzipBytes += gzipSync(await readFile(`dist/${file}`)).byteLength
}

if (initialGzipBytes > 180_000) {
  throw new Error(`Initial JavaScript is ${initialGzipBytes} gzip bytes; the 180,000-byte budget was exceeded.`)
}

console.log(
  `Verified initial JavaScript is ${initialGzipBytes} gzip bytes and ${card3D.file} stays dynamically loaded.`,
)
