/* Minimal Google Maps JS API types for the venue location picker. */

declare namespace google.maps {
  class LatLng {
    lat(): number
    lng(): number
  }

  interface LatLngLiteral {
    lat: number
    lng: number
  }

  interface MapMouseEvent {
    latLng?: LatLng | null
  }

  interface MapOptions {
    center?: LatLngLiteral
    zoom?: number
    mapTypeControl?: boolean
    streetViewControl?: boolean
    fullscreenControl?: boolean
  }

  class Map {
    constructor(el: HTMLElement, opts?: MapOptions)
    setCenter(center: LatLngLiteral): void
    setZoom(zoom: number): void
    panTo(center: LatLngLiteral): void
    addListener(event: string, handler: (e: MapMouseEvent) => void): void
  }

  class Marker {
    constructor(opts?: { map?: Map; position?: LatLngLiteral; draggable?: boolean })
    setPosition(position: LatLngLiteral): void
    getPosition(): LatLng | null | undefined
    addListener(event: string, handler: () => void): void
  }

  interface GeocoderAddressComponent {
    long_name: string
    short_name: string
    types: string[]
  }

  interface GeocoderResult {
    formatted_address?: string
    place_id?: string
    address_components?: GeocoderAddressComponent[]
  }

  type GeocoderStatus = string

  class Geocoder {
    geocode(
      request: { location: LatLngLiteral },
      callback: (results: GeocoderResult[] | null, status: GeocoderStatus) => void,
    ): void
  }

  namespace places {
    interface PlaceResult {
      place_id?: string
      name?: string
      formatted_address?: string
      address_components?: GeocoderAddressComponent[]
      geometry?: { location?: LatLng }
    }

    interface AutocompleteOptions {
      fields?: string[]
      componentRestrictions?: { country: string | string[] }
    }

    class Autocomplete {
      constructor(input: HTMLInputElement, opts?: AutocompleteOptions)
      addListener(event: string, handler: () => void): void
      getPlace(): PlaceResult
    }
  }
}

declare const google: {
  maps: typeof google.maps
}
