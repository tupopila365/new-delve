#!/usr/bin/env node
/**
 * Appwrite Sites (Hosting) traveler build.
 * Vite already aliases @delve/contracts → packages/contracts/src, so no
 * separate contracts tsc step is required.
 *
 * Expected Site settings:
 *   Root:    new delve design
 *   Install: (see docs/appwrite-hosting.md — skip Prisma postinstall)
 *   Build:   node scripts/appwrite-site-build.mjs
 *   Output:  dist
 */
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
process.chdir(root)

function run(command, args) {
  console.log(`[appwrite-site-build] ${command} ${args.join(' ')}`)
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    env: {
      ...process.env,
      DELVE_SKIP_POSTINSTALL: '1',
      // Keep devDependencies available for Vite/Tailwind during the site build.
      NODE_ENV: process.env.APPWRITE_SITE_NODE_ENV || 'development',
    },
    shell: process.platform === 'win32',
  })
  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}

if (!existsSync(path.join(root, 'package.json'))) {
  console.error('[appwrite-site-build] package.json not found. Set Hosting root to "new delve design".')
  process.exit(1)
}

if (!existsSync(path.join(root, 'packages/contracts/src/index.ts'))) {
  console.error('[appwrite-site-build] packages/contracts source missing — monorepo checkout incomplete.')
  process.exit(1)
}

// Prefer a filter install so Appwrite doesn't need every workspace package
// (api/admin/prisma) just to ship the traveler static site.
const alreadyInstalled = existsSync(path.join(root, 'node_modules/vite'))
if (!alreadyInstalled) {
  run('pnpm', ['install', '--frozen-lockfile', '--filter', '@delve/traveler-web...'])
} else {
  console.log('[appwrite-site-build] node_modules present — skipping install')
}

run('pnpm', ['exec', 'vite', 'build'])
console.log('[appwrite-site-build] done → dist/')
