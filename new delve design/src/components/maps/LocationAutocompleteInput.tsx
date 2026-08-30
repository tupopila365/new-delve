import React, { useEffect, useRef, useState } from 'react'
import { useMapsLibrary } from '@vis.gl/react-google-maps'
import { MapPin, Loader2, X, Globe2 } from 'lucide-react'

export interface PlaceSelectionResult {
  name: string
  formattedAddress?: string
  city?: string
  country?: string
  latitude?: string
  longitude?: string
}

interface PredictionItem {
  id: string
  placeId?: string
  description: string
  mainText: string
  secondaryText: string
  lat?: number
  lng?: number
  city?: string
  country?: string
}

interface LocationAutocompleteInputProps {
  id?: string
  value: string
  onChange: (value: string) => void
  onSelectPlace?: (result: PlaceSelectionResult) => void
  placeholder?: string
  label?: string
  className?: string
}

export function LocationAutocompleteInput({
  id = 'location-autocomplete',
  value,
  onChange,
  onSelectPlace,
  placeholder = 'Venue, address or place',
  label = 'Venue or meeting point',
  className = '',
}: LocationAutocompleteInputProps) {
  const placesLibrary = useMapsLibrary('places')
  const [predictions, setPredictions] = useState<PredictionItem[]>([])
  const [loading, setLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const sessionTokenRef = useRef<any>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Initialize or reset Google session token if available
  useEffect(() => {
    if (placesLibrary?.AutocompleteSessionToken && !sessionTokenRef.current) {
      sessionTokenRef.current = new (placesLibrary as any).AutocompleteSessionToken()
    }
  }, [placesLibrary])

  // Handle outside click to close suggestions
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Fetch predictions on query change
  useEffect(() => {
    if (!value || value.trim().length < 2) {
      setPredictions([])
      setIsOpen(false)
      return
    }

    let isCurrent = true
    const timeoutId = setTimeout(async () => {
      setLoading(true)
      try {
        const placesLib = placesLibrary as any

        // Priority 1: Google Places API (New) Autocomplete
        if (placesLib?.AutocompleteSuggestion?.fetchAutocompleteSuggestions) {
          const request = {
            input: value,
            sessionToken: sessionTokenRef.current || undefined,
          }
          const response = await placesLib.AutocompleteSuggestion.fetchAutocompleteSuggestions(request)
          if (!isCurrent) return
          const items: PredictionItem[] = ((response?.suggestions as any[]) || []).map((s: any, idx: number) => {
            const pred = s.placePrediction
            return {
              id: pred?.placeId || `gmp-${idx}`,
              placeId: pred?.placeId,
              description: pred?.text?.text || '',
              mainText: pred?.mainText?.text || pred?.text?.text || '',
              secondaryText: pred?.secondaryText?.text || '',
            }
          })
          if (items.length > 0) {
            setPredictions(items)
            setIsOpen(true)
            setLoading(false)
            return
          }
        }

        // Priority 2: Google AutocompleteService (Legacy/Compat)
        if (placesLib?.AutocompleteService) {
          const service = new placesLib.AutocompleteService()
          const res = await new Promise<any[] | null>(resolve => {
            service.getPlacePredictions(
              { input: value, sessionToken: sessionTokenRef.current || undefined },
              (preds: any[], status: string) => {
                if (status === 'OK' && preds) resolve(preds)
                else resolve(null)
              },
            )
          })
          if (!isCurrent) return
          if (res && res.length > 0) {
            const items: PredictionItem[] = res.map((p, idx) => ({
              id: p.place_id || `gmp-leg-${idx}`,
              placeId: p.place_id,
              description: p.description || '',
              mainText: p.structured_formatting?.main_text || p.description || '',
              secondaryText: p.structured_formatting?.secondary_text || '',
            }))
            setPredictions(items)
            setIsOpen(true)
            setLoading(false)
            return
          }
        }

        // Priority 3: Fast Global Geocoding Search (Works universally without keys)
        const geoRes = await fetch(
          `https://photon.komoot.io/api/?q=${encodeURIComponent(value)}&limit=6`,
        ).catch(() => null)

        if (geoRes?.ok) {
          const data = await geoRes.json().catch(() => null)
          if (!isCurrent) return
          if (data?.features && Array.isArray(data.features)) {
            const items: PredictionItem[] = data.features.map((f: any, idx: number) => {
              const props = f.properties || {}
              const coords = f.geometry?.coordinates || []
              const lng = coords[0]
              const lat = coords[1]
              const name = props.name || props.street || props.city || value
              const city = props.city || props.town || props.state || ''
              const country = props.country || ''
              const secondary = [city, country].filter(Boolean).join(', ')

              return {
                id: `geo-${idx}-${props.osm_id || Math.random()}`,
                description: [name, secondary].filter(Boolean).join(', '),
                mainText: name,
                secondaryText: secondary,
                lat,
                lng,
                city,
                country,
              }
            })

            if (items.length > 0) {
              setPredictions(items)
              setIsOpen(true)
              setLoading(false)
              return
            }
          }
        }
      } catch {
        // Fallback gracefully
      } finally {
        if (isCurrent) setLoading(false)
      }
    }, 250)

    return () => {
      isCurrent = false
      clearTimeout(timeoutId)
    }
  }, [value, placesLibrary])

  async function handleSelectPrediction(pred: PredictionItem) {
    onChange(pred.mainText || pred.description)
    setIsOpen(false)

    // Handle Photon/OpenStreetMap result with coordinates directly
    if (pred.lat != null && pred.lng != null) {
      onSelectPlace?.({
        name: pred.mainText || pred.description,
        formattedAddress: pred.description,
        city: pred.city,
        country: pred.country,
        latitude: pred.lat.toFixed(6),
        longitude: pred.lng.toFixed(6),
      })
      return
    }

    if (!pred.placeId || !placesLibrary?.Place) {
      onSelectPlace?.({
        name: pred.mainText || pred.description,
        formattedAddress: pred.description,
      })
      return
    }

    try {
      setLoading(true)
      const place = new (placesLibrary as any).Place({
        id: pred.placeId,
      })

      await place.fetchFields({
        fields: ['displayName', 'formattedAddress', 'location', 'addressComponents'],
      })

      if (placesLibrary.AutocompleteSessionToken) {
        sessionTokenRef.current = new (placesLibrary as any).AutocompleteSessionToken()
      }

      let city = ''
      let country = ''
      if (place.addressComponents) {
        for (const comp of place.addressComponents) {
          if (comp.types?.includes('locality') || comp.types?.includes('postal_town')) {
            city = comp.longText || ''
          }
          if (comp.types?.includes('country')) {
            country = comp.longText || ''
          }
        }
      }

      const lat = place.location?.lat()
      const lng = place.location?.lng()

      onSelectPlace?.({
        name: place.displayName || pred.mainText || pred.description,
        formattedAddress: place.formattedAddress || pred.description,
        city,
        country,
        latitude: lat != null ? lat.toFixed(6) : undefined,
        longitude: lng != null ? lng.toFixed(6) : undefined,
      })
    } catch {
      onSelectPlace?.({
        name: pred.mainText || pred.description,
        formattedAddress: pred.description,
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div ref={containerRef} className={`relative mb-3 ${className}`}>
      <input
        type="text"
        id={id}
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={() => {
          if (predictions.length > 0) setIsOpen(true)
        }}
        placeholder={placeholder}
        className="peer w-full rounded-xl bg-white/[0.04] border border-white/10 px-3.5 pt-5 pb-2 text-sm text-white placeholder-transparent focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all pr-10"
        autoComplete="off"
      />
      <label
        htmlFor={id}
        className="absolute left-3.5 top-1.5 text-xs text-neutral-400 pointer-events-none transition-all peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-sm peer-placeholder-shown:text-neutral-500 peer-focus:top-1.5 peer-focus:text-xs peer-focus:text-indigo-400"
      >
        {label}
      </label>

      {/* Right accessory icon (spinner, clear, or search indicator) */}
      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
        {loading && <Loader2 size={16} className="animate-spin text-indigo-400" />}
        {value && !loading && (
          <button
            type="button"
            onClick={() => {
              onChange('')
              setPredictions([])
              setIsOpen(false)
            }}
            className="text-neutral-500 hover:text-neutral-300 p-0.5"
            aria-label="Clear location"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Predictions Dropdown Menu */}
      {isOpen && predictions.length > 0 && (
        <div
          className="absolute left-0 right-0 top-full mt-1.5 z-[150] rounded-xl border border-white/10 bg-neutral-900/95 backdrop-blur-md shadow-2xl overflow-hidden max-h-64 overflow-y-auto"
        >
          {predictions.map(pred => (
            <button
              key={pred.id}
              type="button"
              onClick={() => handleSelectPrediction(pred)}
              className="w-full flex items-start gap-3 px-3.5 py-2.5 text-left text-sm text-white hover:bg-white/10 transition-colors border-b border-white/5 last:border-0"
            >
              <div className="mt-0.5 p-1 rounded-md bg-white/5 text-indigo-400 shrink-0">
                <MapPin size={14} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-white truncate m-0 text-xs sm:text-sm">
                  {pred.mainText}
                </p>
                {pred.secondaryText && (
                  <p className="text-[11px] text-neutral-400 truncate m-0">
                    {pred.secondaryText}
                  </p>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
