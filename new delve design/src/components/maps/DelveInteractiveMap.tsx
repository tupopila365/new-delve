import { MapPin } from 'lucide-react'
import { GOOGLE_MAPS_API_KEY } from './GoogleMapsProvider'

interface DelveInteractiveMapProps {
  latitude: number
  longitude: number
  zoom?: number
  mapId?: string
  markerTitle?: string
  height?: string | number
  className?: string
}

export function DelveInteractiveMap({
  latitude,
  longitude,
  zoom = 15,
  markerTitle = 'Location',
  height = 200,
  className = '',
}: DelveInteractiveMapProps) {
  if (isNaN(latitude) || isNaN(longitude)) {
    return null
  }

  const heightVal = typeof height === 'number' ? `${height}px` : height

  if (GOOGLE_MAPS_API_KEY) {
    const embedUrl = `https://www.google.com/maps/embed/v1/place?key=${GOOGLE_MAPS_API_KEY}&q=${latitude},${longitude}&zoom=${zoom}`
    return (
      <div
        className={`relative w-full rounded-xl overflow-hidden border border-white/10 ${className}`}
        style={{ height: heightVal }}
      >
        <iframe
          title={markerTitle}
          src={embedUrl}
          className="w-full h-full border-0"
          loading="lazy"
          allowFullScreen
        />
      </div>
    )
  }

  return (
    <div
      className={`relative w-full rounded-xl overflow-hidden border border-white/10 bg-neutral-900 flex items-center justify-center text-center p-4 ${className}`}
      style={{ height: heightVal }}
    >
      <div className="flex flex-col items-center gap-1.5 text-neutral-400">
        <MapPin size={24} className="text-indigo-400" />
        <span className="text-xs font-semibold text-white">{markerTitle}</span>
        <span className="text-[11px] font-mono text-neutral-400">
          {latitude.toFixed(4)}, {longitude.toFixed(4)}
        </span>
      </div>
    </div>
  )
}
