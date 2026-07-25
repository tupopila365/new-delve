import { COUNTRY_ROWS } from '../../lib/countryCurrencyPreferences'
import type { ExploreNearPointKind } from '../../lib/exploreNearPoint'

export function countryCodeFromName(name: string): string | null {
  const needle = name.trim().toLowerCase()
  if (!needle) return null
  const row = COUNTRY_ROWS.find((c) => c.name.toLowerCase() === needle)
  return row?.code ?? null
}

export function countryNameFromCode(code: string): string {
  return COUNTRY_ROWS.find((c) => c.code === code.trim().toUpperCase())?.name ?? code
}

export function parsePlaceSelection(place: google.maps.places.PlaceResult): {
  kind: ExploreNearPointKind
  label: string
  placeCountryCode: string | null
} {
  const types = place.types ?? []
  const comps = place.address_components ?? []
  const countryComp = comps.find((c) => c.types.includes('country'))
  const placeCountryCode = countryComp?.short_name?.trim().toUpperCase() || null
  const countryLong = countryComp?.long_name?.trim() || null

  if (types.includes('country')) {
    const label =
      place.name?.trim() || countryLong || place.formatted_address?.trim() || 'Selected country'
    return {
      kind: 'country',
      label,
      placeCountryCode: placeCountryCode || countryCodeFromName(label),
    }
  }

  const label = place.name?.trim() || place.formatted_address?.trim() || 'Selected place'
  return { kind: 'city', label, placeCountryCode }
}
