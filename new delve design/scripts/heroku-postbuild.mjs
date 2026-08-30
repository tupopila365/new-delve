#!/usr/bin/env node
/**
 * Heroku postbuild — builds only what the target service needs.
 * Configure each app with DELVE_SERVICE=traveler|api|admin
 */
import { spawnSync } from 'node:child_process'
import { resolveDelveService } from './delve-service.mjs'

const service = resolveDelveService()
console.log(`[heroku-postbuild] DELVE_SERVICE=${service}`)

function run(command, args) {
  const result = spawnSync(command, args, { stdio: 'inherit', shell: true })
  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}

if (service === 'api') {
  run('pnpm', ['--filter', '@delve/contracts', 'build'])
  run('pnpm', ['--filter', '@delve/config', 'build'])
  run('pnpm', ['--filter', '@delve/database', 'generate'])
  if (process.env.DATABASE_URL) {
    console.log('[heroku-postbuild] Running database migrations...')
    const mig = spawnSync('pnpm', ['--filter', '@delve/database', 'migrate:deploy'], { stdio: 'inherit', shell: true })
    if (mig.status !== 0) {
      console.warn('[heroku-postbuild] migrate:deploy exited with code', mig.status)
    }
  }
  run('pnpm', ['--filter', '@delve/database', 'build'])
  run('pnpm', ['--filter', '@delve/api', 'build'])
  console.log('[heroku-postbuild] Backend V2 build complete')
  process.exit(0)
}

if (service === 'admin') {
  run('pnpm', ['--filter', '@delve/contracts', 'build'])
  run('pnpm', ['--filter', '@delve/admin-web', 'build'])
  console.log('[heroku-postbuild] admin-web build complete')
  process.exit(0)
}

// traveler (default)
run('pnpm', ['run', 'build'])
console.log('[heroku-postbuild] traveler-web build complete')
