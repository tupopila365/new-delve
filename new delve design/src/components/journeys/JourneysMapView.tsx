import { useEffect, useRef, useState } from 'react'
import { Compass, MapPin, X } from 'lucide-react'
import type { JourneySummary } from '@delve/contracts'

interface JourneysMapViewProps {
  journeys: JourneySummary[]
  selectedJourney: JourneySummary | null
  onSelectJourney: (journey: JourneySummary | null) => void
  onOpenJourney?: (journeyId: string) => void
  getCoordinates: (journey: JourneySummary) => { lat: number; lng: number }
  apiKey?: string
}

const DARK_MAP_STYLES = [
  { elementType: 'geometry', stylers: [{ color: '#17171c' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#17171c' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8e8e93' }] },
  {
    featureType: 'administrative.locality',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#d1d5db' }],
  },
  {
    featureType: 'poi',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#6366f1' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'geometry',
    stylers: [{ color: '#1c221c' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#4ade80' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#27272a' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#1e1e24' }],
  },
  {
    featureType: 'road',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#9ca3af' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#312e81' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#1e1b4b' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#c7d2fe' }],
  },
  {
    featureType: 'transit',
    elementType: 'geometry',
    stylers: [{ color: '#27272a' }],
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#0f172a' }],
  },
  {
    featureType: 'water',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#38bdf8' }],
  },
]

// Key geographical landmarks for the visual radar projection
const LANDMARKS = [
  { name: 'Etosha', lat: -18.8556, lng: 16.3293 },
  { name: 'Swakopmund', lat: -22.6792, lng: 14.5272 },
  { name: 'Windhoek', lat: -22.5609, lng: 17.0658 },
  { name: 'Sossusvlei', lat: -24.7271, lng: 15.3444 },
  { name: 'Lüderitz', lat: -26.6481, lng: 15.1594 },
  { name: 'Fish River', lat: -27.6978, lng: 17.5847 },
]

export default function JourneysMapView({
  journeys,
  selectedJourney,
  onSelectJourney,
  onOpenJourney,
  getCoordinates,
  apiKey = '',
}: JourneysMapViewProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const [googleLoaded, setGoogleLoaded] = useState(false)
  const mapInstanceRef = useRef<any>(null)
  const markersRef = useRef<any[]>([])

  // Dynamically load Google Maps script if an API key is provided
  useEffect(() => {
    if (!apiKey) return

    if (typeof window !== 'undefined' && (window as any).google?.maps) {
      setGoogleLoaded(true)
      return
    }

    const scriptId = 'delve-google-maps-script'
    const existing = document.getElementById(scriptId)
    if (existing) {
      const handleLoad = () => setGoogleLoaded(true)
      existing.addEventListener('load', handleLoad)
      return () => existing.removeEventListener('load', handleLoad)
    }

    const script = document.createElement('script')
    script.id = scriptId
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`
    script.async = true
    script.defer = true
    script.onload = () => setGoogleLoaded(true)
    document.head.appendChild(script)
  }, [apiKey])

  // Initialize and update Google Map instance when script is available
  useEffect(() => {
    if (!googleLoaded || !mapContainerRef.current || !apiKey) return

    const google = (window as any).google
    if (!google?.maps) return

    if (!mapInstanceRef.current) {
      mapInstanceRef.current = new google.maps.Map(mapContainerRef.current, {
        center: { lat: -22.5609, lng: 17.0658 },
        zoom: 5,
        styles: DARK_MAP_STYLES,
        disableDefaultUI: true,
        zoomControl: true,
      })
    }

    // Clean up previous markers
    markersRef.current.forEach(m => m.setMap(null))
    markersRef.current = []

    // Add journey markers
    journeys.forEach(journey => {
      const pos = getCoordinates(journey)
      const isSelected = selectedJourney?.id === journey.id

      const marker = new google.maps.Marker({
        position: pos,
        map: mapInstanceRef.current,
        title: journey.title,
        icon: isSelected
          ? 'https://maps.google.com/mapfiles/ms/icons/purple-dot.png'
          : 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png',
      })

      marker.addListener('click', () => {
        onSelectJourney(journey)
      })

      markersRef.current.push(marker)
    })
  }, [googleLoaded, journeys, selectedJourney, apiKey, getCoordinates, onSelectJourney])

  // Projection math for interactive dark-mode route map
  // Bounds covering Namibia & surrounding travel regions: Lat -29 to -17, Lng 11 to 26
  const minLat = -29
  const maxLat = -17
  const minLng = 11
  const maxLng = 26

  const project = (lat: number, lng: number) => {
    const x = Math.max(6, Math.min(94, ((lng - minLng) / (maxLng - minLng)) * 100))
    const y = Math.max(8, Math.min(92, ((maxLat - lat) / (maxLat - minLat)) * 100))
    return { x, y }
  }

  return (
    <div className="relative min-h-[600px] w-full rounded-3xl overflow-hidden border border-white/10 shadow-2xl bg-neutral-950 select-none">
      {/* Real Google Map container (active if Google script loaded) */}
      {apiKey && googleLoaded ? (
        <div ref={mapContainerRef} className="w-full h-full min-h-[600px]" />
      ) : (
        /* Interactive Visual Route Radar Canvas */
        <div className="relative w-full h-full min-h-[600px] bg-gradient-to-b from-neutral-950 via-[#0a0b12] to-neutral-950 flex items-center justify-center overflow-hidden">
          {/* Subtle Cartographic Grid Background */}
          <div
            className="absolute inset-0 opacity-15 pointer-events-none"
            style={{
              backgroundImage:
                'radial-gradient(circle at 50% 50%, rgba(99, 102, 241, 0.25) 0%, transparent 70%), linear-gradient(to right, rgba(255, 255, 255, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(255, 255, 255, 0.05) 1px, transparent 1px)',
              backgroundSize: '100% 100%, 48px 48px, 48px 48px',
            }}
          />

          {/* Compass Rings Background Decoration */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
            <div className="w-[500px] h-[500px] rounded-full border border-indigo-500/20 border-dashed" />
            <div className="absolute w-[300px] h-[300px] rounded-full border border-indigo-500/30" />
            <div className="absolute w-[120px] h-[120px] rounded-full border border-indigo-500/40" />
          </div>

          {/* Geographic Landmark Reference Nodes */}
          {LANDMARKS.map(lm => {
            const { x, y } = project(lm.lat, lm.lng)
            return (
              <div
                key={lm.name}
                className="absolute flex flex-col items-center pointer-events-none -translate-x-1/2 -translate-y-1/2 opacity-30"
                style={{ left: `${x}%`, top: `${y}%` }}
              >
                <div className="w-1.5 h-1.5 rounded-full bg-neutral-400" />
                <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-400 mt-1 whitespace-nowrap">
                  {lm.name}
                </span>
              </div>
            )
          })}

          {/* SVG Connecting Paths between adjacent routes */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden="true">
            {journeys.slice(0, -1).map((j, idx) => {
              const from = project(getCoordinates(j).lat, getCoordinates(j).lng)
              const next = journeys[idx + 1]
              if (!next) return null
              const to = project(getCoordinates(next).lat, getCoordinates(next).lng)
              return (
                <line
                  key={`${j.id}-${next.id}`}
                  x1={`${from.x}%`}
                  y1={`${from.y}%`}
                  x2={`${to.x}%`}
                  y2={`${to.y}%`}
                  stroke="rgba(99, 102, 241, 0.2)"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                />
              )
            })}
          </svg>

          {/* Interactive Journey Markers */}
          {journeys.map(journey => {
            const coords = getCoordinates(journey)
            const { x, y } = project(coords.lat, coords.lng)
            const isSelected = selectedJourney?.id === journey.id

            return (
              <button
                key={journey.id}
                type="button"
                onClick={() => onSelectJourney(journey)}
                className={`absolute group -translate-x-1/2 -translate-y-1/2 transition-all duration-200 z-10 ${
                  isSelected ? 'scale-125 z-30' : 'hover:scale-115'
                }`}
                style={{ left: `${x}%`, top: `${y}%` }}
                title={journey.title}
                aria-label={`Select journey: ${journey.title}`}
              >
                {/* Pulsing Beacon Ring */}
                <span
                  className={`absolute -inset-2 rounded-full transition-opacity duration-300 ${
                    isSelected
                      ? 'bg-purple-500/30 animate-ping'
                      : 'bg-indigo-500/0 group-hover:bg-indigo-500/20'
                  }`}
                />

                {/* Marker Pill / Pin */}
                <div
                  className={`relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border shadow-xl transition-colors ${
                    isSelected
                      ? 'bg-purple-600 border-purple-400 text-white ring-4 ring-purple-500/30'
                      : 'bg-neutral-900/90 border-indigo-500/40 text-neutral-200 hover:border-indigo-400 hover:text-white'
                  }`}
                >
                  <MapPin
                    size={13}
                    className={`shrink-0 ${
                      isSelected ? 'text-white' : 'text-indigo-400 group-hover:text-indigo-300'
                    }`}
                  />
                  <span className="text-xs font-bold max-w-[120px] truncate">
                    {journey.title}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* Top Control Overlay on Map */}
      <div className="absolute top-4 left-4 z-20 flex items-center gap-2.5 bg-neutral-900/90 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-white/10 shadow-lg">
        <Compass className="text-indigo-400 animate-spin-slow" size={18} />
        <div>
          <span className="text-xs font-bold text-white block">Live Route Map</span>
          <span className="text-[10px] text-neutral-400">
            Southern Africa / Namibia · {journeys.length} route{journeys.length === 1 ? '' : 's'}
          </span>
        </div>
      </div>

      {/* Interactive Selection State & Floating Preview Card */}
      {selectedJourney && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 w-11/12 max-w-sm bg-neutral-900/95 backdrop-blur-md border border-white/15 p-4 rounded-3xl shadow-2xl space-y-3 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              {selectedJourney.coverUrl ? (
                <img
                  src={selectedJourney.coverUrl}
                  alt=""
                  className="w-14 h-14 rounded-2xl object-cover border border-white/10 shrink-0"
                />
              ) : (
                <div className="w-14 h-14 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
                  <MapPin size={22} />
                </div>
              )}
              <div className="min-w-0">
                <h4 className="text-sm font-bold text-white m-0 truncate">
                  {selectedJourney.title}
                </h4>
                <p className="text-xs text-neutral-400 m-0 truncate mt-0.5">
                  {selectedJourney.startPlace} → {selectedJourney.endPlace}
                </p>
                <div className="flex items-center gap-2 mt-1 text-[11px] text-neutral-300">
                  <span>{selectedJourney.durationDays || selectedJourney.stopCount} Days</span>
                  {selectedJourney.historicalCost && (
                    <span>• {selectedJourney.currency} {selectedJourney.historicalCost}</span>
                  )}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onSelectJourney(null)}
              className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-neutral-400 hover:text-white shrink-0"
              aria-label="Close preview"
            >
              <X size={14} />
            </button>
          </div>

          <button
            type="button"
            onClick={() => onOpenJourney?.(selectedJourney.id)}
            className="w-full py-2.5 px-4 rounded-2xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-md shadow-indigo-600/30 flex items-center justify-center gap-1.5"
          >
            <span>View Itinerary</span>
            <span>→</span>
          </button>
        </div>
      )}
    </div>
  )
}
