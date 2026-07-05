/** Parse Google Places address components into region / city / street. */

export type ParsedAddress = {
  region: string
  city: string
  address: string
}

type AddressComponent = {
  long_name: string
  short_name: string
  types: string[]
}

export function parseGoogleAddressComponents(components: AddressComponent[]): ParsedAddress {
  let city = ''
  let region = ''
  let streetNumber = ''
  let route = ''

  for (const component of components) {
    const types = component.types ?? []
    if (types.includes('street_number')) streetNumber = component.long_name
    if (types.includes('route')) route = component.long_name
    if (types.includes('locality')) city = component.long_name
    else if (!city && types.includes('postal_town')) city = component.long_name
    else if (!city && types.includes('administrative_area_level_2')) city = component.long_name
    if (types.includes('administrative_area_level_1')) region = component.long_name
  }

  const address = [streetNumber, route].filter(Boolean).join(' ').trim()
  return { region, city, address }
}

/** Default map centre — Windhoek, Namibia. */
export const DEFAULT_MAP_CENTER = { lat: -22.5609, lng: 17.0658 }
