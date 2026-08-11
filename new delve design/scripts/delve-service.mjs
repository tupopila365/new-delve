/**
 * Resolve which Delve service this Heroku dyno should run.
 * Set on each app: DELVE_SERVICE=traveler | api | admin
 * Default: traveler (keeps delve-web-nust working).
 */
export function resolveDelveService(env = process.env) {
  const raw = (env.DELVE_SERVICE || env.HEROKU_APP_NAME || '').trim().toLowerCase()
  if (raw === 'api' || raw === 'delve-api' || raw.endsWith('-api')) return 'api'
  if (raw === 'admin' || raw === 'delve-admin' || raw.endsWith('-admin')) return 'admin'
  if (raw === 'traveler' || raw === 'web' || raw === 'delve-web-nust' || raw.includes('web')) {
    return 'traveler'
  }
  return 'traveler'
}
