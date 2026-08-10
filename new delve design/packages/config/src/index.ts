/** Shared environment key names — server secrets must never be prefixed with VITE_. */
export const SERVER_ENV_KEYS = [
  'NODE_ENV',
  'API_PORT',
  'DATABASE_URL',
  'SESSION_SECRET',
  'TRAVELER_WEB_URL',
  'ADMIN_WEB_URL',
] as const

export const CLIENT_ENV_KEYS = ['VITE_API_BASE_URL'] as const

export type ServerEnvKey = (typeof SERVER_ENV_KEYS)[number]
export type ClientEnvKey = (typeof CLIENT_ENV_KEYS)[number]

export const DEFAULT_API_PORT = 4000
export const API_V2_PREFIX = '/api/v2'
