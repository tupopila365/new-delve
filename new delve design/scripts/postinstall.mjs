#!/usr/bin/env node
/**
 * Root postinstall. Prisma generate is required for local/API work but must
 * not run on Appwrite Sites (static traveler hosting).
 */
import { spawnSync } from 'node:child_process'

const skipFlag = String(process.env.DELVE_SKIP_POSTINSTALL || '').toLowerCase()
const skip =
  skipFlag === '1' ||
  skipFlag === 'true' ||
  process.env.APPWRITE_SITE === '1'

if (skip) {
  console.log('[postinstall] skipped (static / Appwrite site install)')
  process.exit(0)
}

const result = spawnSync('pnpm', ['db:generate'], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
})
process.exit(result.status ?? 1)
