/** Parse Google Places address components into region / city / street. */

export type ParsedAddress = {
  region: string
  city: string
  address: string
  country: string
}

type AddressComponent = {
  long_name: string
  short_name: string
  types: string[]
}

/**
 * Django `DecimalField(max_digits=9, decimal_places=6)`.
 * Use string form for API payloads — JS floats reintroduce extra decimals in JSON.
 */
export function roundCoord(n: number | null | undefined): number | null {
  if (n == null || !Number.isFinite(Number(n))) return null
  return Number(Number(n).toFixed(6))
}

/** Safe for Django DecimalField — always exactly 6 decimal places as a string. */
export function coordForApi(n: number | string | null | undefined): string | null {
  if (n == null || n === '') return null
  const num = typeof n === 'number' ? n : Number(n)
  if (!Number.isFinite(num)) return null
  return num.toFixed(6)
}

export function parseGoogleAddressComponents(components: AddressComponent[]): ParsedAddress {
  let city = ''
  let region = ''
  let country = ''
  let admin2 = ''
  let streetNumber = ''
  let route = ''

  for (const component of components) {
    const types = component.types ?? []
    if (types.includes('street_number')) streetNumber = component.long_name
    if (types.includes('route')) route = component.long_name
    if (types.includes('locality')) city = component.long_name
    else if (!city && types.includes('postal_town')) city = component.long_name
    else if (!city && types.includes('sublocality_level_1')) city = component.long_name
    else if (!city && types.includes('administrative_area_level_2')) city = component.long_name
    if (types.includes('administrative_area_level_1')) region = component.long_name
    if (types.includes('administrative_area_level_2')) admin2 = component.long_name
    if (types.includes('country')) country = component.long_name
  }

  // Many lodges / POIs omit admin_area_1 — fall back before leaving region blank.
  if (!region) region = admin2
  if (!region) region = city
  if (!region) region = country

  const address = [streetNumber, route].filter(Boolean).join(' ').trim()
  return { region, city, address, country }
}

/** Never leave region empty when Google gave us any place signal. */
export function resolveRegionFromPlace(
  parsed: Pick<ParsedAddress, 'region' | 'city' | 'country'>,
  formattedAddress = '',
): string {
  const direct = (parsed.region || parsed.city || parsed.country || '').trim()
  if (direct) return direct

  const parts = formattedAddress
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean)
  if (parts.length >= 2) {
    // Usually "…, City/Region, Country" — prefer the part before country.
    return parts[parts.length - 2]
  }
  return parts[0] || ''
}

/** Default map centre — Windhoek, Namibia. */
export const DEFAULT_MAP_CENTER = { lat: -22.5609, lng: 17.0658 }
