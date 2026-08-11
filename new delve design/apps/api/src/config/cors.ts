import type { CorsOptions } from 'cors'
import type { Env } from './env.js'

export function createCorsOptions(env: Env): CorsOptions {
  const allowed = new Set([env.TRAVELER_WEB_URL, env.ADMIN_WEB_URL, env.ADMIN_WEB_ORIGIN])

  return {
    origin(origin, callback) {
      if (!origin || allowed.has(origin)) {
        callback(null, true)
        return
      }
      callback(new Error(`Origin not allowed by CORS: ${origin}`))
    },
    credentials: true,
  }
}

/** Cookie-authenticated admin mutations must come from the admin web origin. */
export function isTrustedAdminOrigin(env: Env, origin: string | undefined): boolean {
  if (!origin) return false
  return origin === env.ADMIN_WEB_ORIGIN || origin === env.ADMIN_WEB_URL
}
