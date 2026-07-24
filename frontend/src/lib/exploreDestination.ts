import { COUNTRY_ROWS, defaultCurrencyForCountry } from './countryCurrencyPreferences'

/**
 * Explore destination + mode (Sprint 1 / Phase 0–1)
 *
 * - Explore ON  = browsing a destination (country ± region). Chrome says “Exploring …”.
 * - Explore OFF = “My Delve” — destination is remembered but UI doesn’t force trip chrome.
 * Exit Explore keeps country/region so the user can resume the trip later.
 */

/** Guest/session explore destination (separate from profile home country). */
export const EXPLORE_COUNTRY_STORAGE_KEY = 'delve_explore_country'
export const EXPLORE_REGION_STORAGE_KEY = 'delve_explore_region'
export const EXPLORE_MODE_STORAGE_KEY = 'delve_explore_mode'

/** Default launch destination — matches current seed inventory. */
export const DEFAULT_EXPLORE_COUNTRY = 'NA'

export type ExploreMode = 'on' | 'off'

/** Default mode: on so existing marketplace filtering keeps working until the user exits. */
export const DEFAULT_EXPLORE_MODE: ExploreMode = 'on'

export const EXPLORE_CHANGED_EVENT = 'delve:explore-changed'

/** Countries offered in the Explore switcher (expand over time). */
export const EXPLORE_DESTINATION_CODES = [
  'NA',
  'ZA',
  'BW',
  'KE',
  'TZ',
  'ZM',
  'MZ',
  'AO',
  'NG',
  'GH',
  'US',
  'GB',
  'DE',
  'FR',
  'AU',
] as const

export type ExploreDestinationCode = (typeof EXPLORE_DESTINATION_CODES)[number]

/** Regions / provinces keyed by ISO country code. */
export const REGIONS_BY_COUNTRY: Record<string, readonly string[]> = {
  NA: [
    'Khomas',
    'Erongo',
    'Oshana',
    'Otjozondjupa',
    'Hardap',
    'Karas',
    'Kunene',
    'Ohangwena',
    'Omusati',
    'Oshikoto',
    'Kavango East',
    'Kavango West',
    'Zambezi',
  ],
  ZA: [
    'Western Cape',
    'Gauteng',
    'KwaZulu-Natal',
    'Eastern Cape',
    'Limpopo',
    'Mpumalanga',
    'Free State',
    'North West',
    'Northern Cape',
  ],
  BW: ['South-East', 'North-East', 'North-West', 'Central', 'Kgatleng', 'Kweneng', 'Southern', 'Chobe'],
  KE: ['Nairobi', 'Coast', 'Rift Valley', 'Central', 'Eastern', 'Nyanza', 'Western', 'North Eastern'],
  TZ: ['Dar es Salaam', 'Arusha', 'Zanzibar', 'Kilimanjaro', 'Mwanza', 'Dodoma'],
  ZM: ['Lusaka', 'Copperbelt', 'Southern', 'Eastern', 'Northern', 'Western'],
  MZ: ['Maputo', 'Sofala', 'Nampula', 'Inhambane', 'Cabo Delgado'],
  AO: ['Luanda', 'Benguela', 'Huíla', 'Huambo'],
  NG: ['Lagos', 'Abuja', 'Rivers', 'Kano', 'Oyo'],
  GH: ['Greater Accra', 'Ashanti', 'Western', 'Central', 'Northern'],
  US: ['California', 'New York', 'Texas', 'Florida', 'Colorado', 'Hawaii'],
  GB: ['England', 'Scotland', 'Wales', 'Northern Ireland'],
  DE: ['Bavaria', 'Berlin', 'Hamburg', 'North Rhine-Westphalia', 'Baden-Württemberg'],
  FR: ['Île-de-France', 'Provence-Alpes-Côte d\'Azur', 'Auvergne-Rhône-Alpes', 'Occitanie', 'Brittany'],
  AU: ['New South Wales', 'Victoria', 'Queensland', 'Western Australia', 'South Australia'],
}

/** @deprecated Prefer REGIONS_BY_COUNTRY['NA'] — kept for older imports. */
export const EXPLORE_REGIONS = REGIONS_BY_COUNTRY.NA

export type ExploreRegion = (typeof EXPLORE_REGIONS)[number]

export function exploreCountryOptions() {
  const allowed = new Set<string>(EXPLORE_DESTINATION_CODES)
  return COUNTRY_ROWS.filter((c) => allowed.has(c.code))
}

export function countryName(code: string): string {
  const row = COUNTRY_ROWS.find((c) => c.code === code)
  return row?.name ?? code
}

export function regionsForCountry(code: string): readonly string[] {
  return REGIONS_BY_COUNTRY[code.trim().toUpperCase()] ?? []
}

export function displayCurrencyForExploreCountry(code: string): string {
  return defaultCurrencyForCountry(code) || 'USD'
}

/** Current Explore session currency (for non-React helpers). */
export function exploreDisplayCurrency(): string {
  return displayCurrencyForExploreCountry(readExploreCountry())
}

export function readExploreCountry(): string {
  try {
    const raw = localStorage.getItem(EXPLORE_COUNTRY_STORAGE_KEY)
    const code = typeof raw === 'string' ? raw.trim().toUpperCase() : ''
    if (code && EXPLORE_DESTINATION_CODES.includes(code as ExploreDestinationCode)) return code
  } catch {
    // ignore
  }
  return DEFAULT_EXPLORE_COUNTRY
}

export function writeExploreCountry(code: string): void {
  const next = code.trim().toUpperCase() || DEFAULT_EXPLORE_COUNTRY
  try {
    localStorage.setItem(EXPLORE_COUNTRY_STORAGE_KEY, next)
  } catch {
    // ignore
  }
}

export function readExploreRegion(): string {
  try {
    const raw = localStorage.getItem(EXPLORE_REGION_STORAGE_KEY)
    return typeof raw === 'string' ? raw.trim() : ''
  } catch {
    return ''
  }
}

export function writeExploreRegion(region: string): void {
  const next = region.trim()
  try {
    if (!next) {
      localStorage.removeItem(EXPLORE_REGION_STORAGE_KEY)
      return
    }
    localStorage.setItem(EXPLORE_REGION_STORAGE_KEY, next)
  } catch {
    // ignore
  }
}

export function readExploreMode(): ExploreMode {
  try {
    const raw = localStorage.getItem(EXPLORE_MODE_STORAGE_KEY)
    if (raw === 'on' || raw === 'off') return raw
  } catch {
    // ignore
  }
  return DEFAULT_EXPLORE_MODE
}

export function writeExploreMode(mode: ExploreMode): void {
  try {
    localStorage.setItem(EXPLORE_MODE_STORAGE_KEY, mode === 'off' ? 'off' : 'on')
  } catch {
    // ignore
  }
}

/** Clear region if it is not valid for the given country. */
export function sanitizeRegionForCountry(country: string, region: string): string {
  const allowed = regionsForCountry(country)
  if (!region) return ''
  if (allowed.length === 0) return ''
  return allowed.includes(region) ? region : ''
}

export function announceExploreChanged(): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(EXPLORE_CHANGED_EVENT))
}

/** Guest helpers kept for older call sites. */
export function readGuestExploreRegion(): string {
  return readExploreRegion()
}

export function writeGuestExploreRegion(region: string): void {
  writeExploreRegion(region)
  announceExploreChanged()
}

export function clearGuestExploreRegion(): void {
  writeExploreRegion('')
  announceExploreChanged()
}

/** Client-side match when APIs lack country_code (Niche 2). */
export function listingMatchesExplore(
  listing: { region?: string | null; city?: string | null },
  country: string,
  region: string,
): boolean {
  const listingRegion = (listing.region || '').trim()
  if (region) {
    return listingRegion.toLowerCase() === region.toLowerCase()
  }
  const allowed = regionsForCountry(country)
  if (allowed.length === 0) return true
  if (!listingRegion) return true
  return allowed.some((r) => r.toLowerCase() === listingRegion.toLowerCase())
}
