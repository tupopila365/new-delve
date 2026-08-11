export type DeviceType = 'desktop' | 'phone' | 'tablet' | 'unknown'

export type ParsedUserAgent = {
  browserName: string
  browserMajorVersion: number | null
  operatingSystem: string
  deviceType: DeviceType
  /** Human-readable, e.g. "Chrome on Windows" or "Unknown browser" */
  description: string
}

function majorVersion(ua: string, pattern: RegExp): number | null {
  const match = ua.match(pattern)
  if (!match?.[1]) return null
  const n = Number.parseInt(match[1], 10)
  return Number.isFinite(n) ? n : null
}

/**
 * Server-side UA normalization only. Never trust client-supplied device fields.
 * Does not build a fingerprint — stores coarse family labels only.
 */
export function parseUserAgent(raw: string | undefined | null): ParsedUserAgent {
  const ua = (raw || '').trim()
  if (!ua) {
    return {
      browserName: 'Unknown browser',
      browserMajorVersion: null,
      operatingSystem: 'Unknown',
      deviceType: 'unknown',
      description: 'Unknown browser',
    }
  }

  const lower = ua.toLowerCase()

  let deviceType: DeviceType = 'desktop'
  if (/ipad|tablet|kindle|silk|playbook/.test(lower)) deviceType = 'tablet'
  else if (/mobi|iphone|ipod|android.*mobile|windows phone|blackberry/.test(lower)) deviceType = 'phone'

  let operatingSystem = 'Unknown'
  if (/windows nt/i.test(ua)) operatingSystem = 'Windows'
  else if (/android/i.test(ua)) operatingSystem = 'Android'
  else if (/iphone|ipad|ipod/i.test(ua)) operatingSystem = deviceType === 'tablet' ? 'iPadOS' : 'iOS'
  else if (/mac os x|macintosh/i.test(ua)) operatingSystem = 'macOS'
  else if (/cros/i.test(ua)) operatingSystem = 'Chrome OS'
  else if (/linux/i.test(ua)) operatingSystem = 'Linux'

  let browserName = 'Unknown browser'
  let browserMajorVersion: number | null = null

  if (/edg\//i.test(ua)) {
    browserName = 'Edge'
    browserMajorVersion = majorVersion(ua, /edg\/(\d+)/i)
  } else if (/opr\/|opera/i.test(ua)) {
    browserName = 'Opera'
    browserMajorVersion = majorVersion(ua, /(?:opr|opera)\/(\d+)/i)
  } else if (/firefox\//i.test(ua) || /fxios\//i.test(ua)) {
    browserName = 'Firefox'
    browserMajorVersion = majorVersion(ua, /(?:firefox|fxios)\/(\d+)/i)
  } else if (/chrome\//i.test(ua) && !/chromium/i.test(ua)) {
    browserName = 'Chrome'
    browserMajorVersion = majorVersion(ua, /chrome\/(\d+)/i)
  } else if (/crios\//i.test(ua)) {
    browserName = 'Chrome'
    browserMajorVersion = majorVersion(ua, /crios\/(\d+)/i)
  } else if (/safari\//i.test(ua) && !/chrome|crios|android/i.test(ua)) {
    browserName = 'Safari'
    browserMajorVersion = majorVersion(ua, /version\/(\d+)/i)
  } else if (/samsungbrowser\//i.test(ua)) {
    browserName = 'Samsung Internet'
    browserMajorVersion = majorVersion(ua, /samsungbrowser\/(\d+)/i)
  }

  const osLabel =
    operatingSystem === 'iOS' && deviceType === 'phone'
      ? 'iPhone'
      : operatingSystem === 'iPadOS'
        ? 'iPad'
        : operatingSystem === 'Android' && deviceType === 'phone'
          ? 'Android'
          : operatingSystem === 'Android' && deviceType === 'tablet'
            ? 'Android tablet'
            : operatingSystem

  const description =
    browserName === 'Unknown browser'
      ? 'Unknown browser'
      : osLabel === 'Unknown'
        ? browserName
        : `${browserName} on ${osLabel}`

  return {
    browserName,
    browserMajorVersion,
    operatingSystem,
    deviceType,
    description,
  }
}

export function formatApproximateLocation(input: {
  city?: string | null
  region?: string | null
  countryCode?: string | null
}): string | null {
  const city = input.city?.trim() || ''
  const region = input.region?.trim() || ''
  const country = input.countryCode?.trim().toUpperCase() || ''
  if (!city && !region && !country) return null
  const parts = [city, region, country].filter(Boolean)
  return parts.join(', ')
}
