import { createApp } from './app.js'
import { loadEnv } from './config/env.js'
import { startReconciliationScheduler } from './jobs/reconciliation-scheduler.js'

const env = loadEnv()
const app = createApp(env)
const stopReconciliation = startReconciliationScheduler(env)

/** Heroku (and most PaaS) inject PORT. Prefer it over API_PORT. */
const port = Number(process.env.PORT) || env.API_PORT

const server = app.listen(port, '0.0.0.0', () => {
  console.log(`[delve-api] listening on http://0.0.0.0:${port}`)
  console.log(`[delve-api] health → http://0.0.0.0:${port}/api/v2/health`)
})

let shuttingDown = false

async function shutdown(signal: string) {
  if (shuttingDown) return
  shuttingDown = true
  console.log(`[delve-api] ${signal} received — shutting down`)

  server.close(err => {
    stopReconciliation()
    if (err) {
      console.error('[delve-api] error during shutdown', err)
      process.exit(1)
    }
    console.log('[delve-api] closed')
    process.exit(0)
  })

  setTimeout(() => {
    console.error('[delve-api] forced shutdown after timeout')
    process.exit(1)
  }, 10_000).unref()
}

process.on('SIGTERM', () => void shutdown('SIGTERM'))
process.on('SIGINT', () => void shutdown('SIGINT'))
