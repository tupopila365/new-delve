import type { CorsOptions } from 'cors'
import type { Env } from './env.js'

function originOf(url: string): string {
  return new URL(url).origin
}

function travelerOrigins(configuredUrl: string): string[] {
  const configured = new URL(configuredUrl)
  const origins = [configured.origin]

  // Delve serves the traveler app from both forms of its production hostname.
  if (configured.hostname === 'delveworldwide.me') {
    origins.push('https://www.delveworldwide.me')
  } else if (configured.hostname === 'www.delveworldwide.me') {
    origins.push('https://delveworldwide.me')
  }

  return origins
}

export function createCorsOptions(env: Env): CorsOptions {
  const allowed = new Set([
    ...travelerOrigins(env.TRAVELER_WEB_URL),
    originOf(env.ADMIN_WEB_URL),
    originOf(env.ADMIN_WEB_ORIGIN),
  ])

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
  return origin === originOf(env.ADMIN_WEB_ORIGIN) || origin === originOf(env.ADMIN_WEB_URL)
}
