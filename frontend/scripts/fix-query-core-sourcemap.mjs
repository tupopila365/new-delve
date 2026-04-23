/**
 * @tanstack/query-core sometimes ships an empty index.js.map, which breaks esbuild/Vite.
 * Replace with a minimal valid source map if the file is missing or empty.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const mapPath = path.join(
  __dirname,
  '..',
  'node_modules',
  '@tanstack',
  'query-core',
  'build',
  'modern',
  'index.js.map',
)

const minimal = JSON.stringify({
  version: 3,
  file: 'index.js',
  sources: [],
  names: [],
  mappings: '',
})

try {
  if (fs.existsSync(mapPath)) {
    const raw = fs.readFileSync(mapPath, 'utf8')
    if (raw.trim().length === 0) {
      fs.writeFileSync(mapPath, minimal, 'utf8')
      console.warn('[delve] Patched empty @tanstack/query-core index.js.map for Vite/esbuild.')
    }
  }
} catch {
  /* optional dependency path */
}
