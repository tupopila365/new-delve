#!/usr/bin/env node
/**
 * Heroku release phase — runs Prisma migrations for Backend V2 only.
 */
import { spawnSync } from 'node:child_process'
import { resolveDelveService } from './delve-service.mjs'

const service = resolveDelveService()

if (service !== 'api') {
  console.log(`[heroku-release] skip migrations (service=${service})`)
  process.exit(0)
}

console.log('[heroku-release] running prisma migrate deploy')
const result = spawnSync(
  'pnpm',
  ['--filter', '@delve/database', 'migrate:deploy'],
  { stdio: 'inherit', shell: true },
)
process.exit(result.status ?? 1)
