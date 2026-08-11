#!/usr/bin/env node
/**
 * Heroku web process entry — starts traveler, API, or admin based on DELVE_SERVICE.
 */
import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { resolveDelveService } from './delve-service.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const service = resolveDelveService()

console.log(`[heroku-web] starting service=${service}`)

function runNode(scriptPath, env = {}) {
  const child = spawn(process.execPath, [scriptPath], {
    stdio: 'inherit',
    env: { ...process.env, ...env },
    cwd: root,
  })
  child.on('exit', code => process.exit(code ?? 1))
  child.on('error', err => {
    console.error(err)
    process.exit(1)
  })
}

if (service === 'api') {
  runNode(path.join(root, 'apps/api/dist/server.js'))
} else if (service === 'admin') {
  runNode(path.join(root, 'scripts/serve-static.mjs'), {
    DELVE_DIST: 'apps/admin-web/dist',
  })
} else {
  runNode(path.join(root, 'scripts/serve-static.mjs'))
}
