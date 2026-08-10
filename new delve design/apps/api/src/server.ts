import { createApp } from './app.js'
import { loadEnv } from './config/env.js'

const env = loadEnv()
const app = createApp(env)

const server = app.listen(env.API_PORT, () => {
  console.log(`[delve-api] listening on http://localhost:${env.API_PORT}`)
  console.log(`[delve-api] health → http://localhost:${env.API_PORT}/api/v2/health`)
})

let shuttingDown = false

async function shutdown(signal: string) {
  if (shuttingDown) return
  shuttingDown = true
  console.log(`[delve-api] ${signal} received — shutting down`)

  server.close(err => {
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
