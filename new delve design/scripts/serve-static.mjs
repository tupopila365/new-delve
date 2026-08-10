#!/usr/bin/env node
/**
 * Production static host for traveler-web.
 * - /assets/*  → 1 year immutable (Vite content hashes); missing assets → 404
 * - everything else (HTML, SPA fallback, version.json) → no-store
 */
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { pipeline } from 'node:stream/promises'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const dist = path.join(root, 'dist')
const port = Number(process.env.PORT || 3000)

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
}

function setNoStore(res) {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0')
  res.setHeader('Pragma', 'no-cache')
  res.setHeader('Expires', '0')
  // Cloudflare / surrogate caches (if any sit in front later)
  res.setHeader('CDN-Cache-Control', 'no-store')
  res.setHeader('Surrogate-Control', 'no-store')
}

function setImmutable(res) {
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
  res.setHeader('CDN-Cache-Control', 'public, max-age=31536000, immutable')
}

function safeJoin(base, requestPath) {
  const decoded = decodeURIComponent(requestPath.split('?')[0] || '/')
  const normalized = path.normalize(decoded).replace(/^(\.\.[/\\])+/, '')
  const full = path.join(base, normalized)
  if (!full.startsWith(base)) return null
  return full
}

async function sendFile(res, filePath, cache) {
  const stat = await fs.promises.stat(filePath)
  if (!stat.isFile()) return false

  const ext = path.extname(filePath).toLowerCase()
  res.statusCode = 200
  res.setHeader('Content-Type', MIME[ext] || 'application/octet-stream')
  res.setHeader('Content-Length', String(stat.size))
  if (cache === 'immutable') setImmutable(res)
  else setNoStore(res)

  await pipeline(fs.createReadStream(filePath), res)
  return true
}

function sendNotFound(res) {
  setNoStore(res)
  res.statusCode = 404
  res.setHeader('Content-Type', 'text/plain; charset=utf-8')
  res.end('Not found')
}

const server = http.createServer(async (req, res) => {
  try {
    const urlPath = (req.url || '/').split('?')[0]
    const isAsset = urlPath.startsWith('/assets/')
    const filePath = safeJoin(dist, urlPath === '/' ? '/index.html' : urlPath)

    if (filePath && fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      await sendFile(res, filePath, isAsset ? 'immutable' : 'no-store')
      return
    }

    // Never SPA-fallback hashed assets — old tabs must get a real 404
    if (isAsset) {
      sendNotFound(res)
      return
    }

    const indexPath = path.join(dist, 'index.html')
    if (fs.existsSync(indexPath)) {
      await sendFile(res, indexPath, 'no-store')
      return
    }

    sendNotFound(res)
  } catch (err) {
    if (!res.headersSent) {
      setNoStore(res)
      res.statusCode = 500
    }
    res.end(err instanceof Error ? err.message : 'Server error')
  }
})

server.listen(port, '0.0.0.0', () => {
  console.log(`Delve traveler static host on :${port} (root ${dist})`)
})
