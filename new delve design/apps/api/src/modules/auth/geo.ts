import type { Request } from 'express'
import type { Env } from '../../config/env.js'

export type ApproximateGeo = {
  city: string | null
  region: string | null
  countryCode: string | null
}

function header(req: Request, name: string): string | null {
  const value = req.headers[name.toLowerCase()]
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed ? decodeURIComponent(trimmed.replace(/\+/g, ' ')) : null
}

/**
 * Resolve approximate location from trusted edge headers only.
 * Never invents a location. Never uses browser geolocation or GPS.
 * See docs/session-privacy.md.
 */
export function resolveApproximateGeo(req: Request, env: Env): ApproximateGeo {
  if (!env.TRUST_GEO_HEADERS) {
    return { city: null, region: null, countryCode: null }
  }

  const city =
    header(req, 'cf-ipcity') ||
    header(req, 'x-vercel-ip-city') ||
    header(req, 'x-geo-city')
  const region =
    header(req, 'cf-region') ||
    header(req, 'x-vercel-ip-country-region') ||
    header(req, 'x-geo-region')
  const countryCode = (
    header(req, 'cf-ipcountry') ||
    header(req, 'x-vercel-ip-country') ||
    header(req, 'x-geo-country')
  )?.toUpperCase()

  // Ignore Cloudflare "XX" unknown country placeholder
  const country = countryCode && countryCode !== 'XX' ? countryCode.slice(0, 2) : null

  return {
    city: city ? city.slice(0, 80) : null,
    region: region ? region.slice(0, 80) : null,
    countryCode: country,
  }
}
