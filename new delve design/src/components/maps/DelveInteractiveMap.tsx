import React from 'react'
import { Map, AdvancedMarker, Pin } from '@vis.gl/react-google-maps'
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
  mapId = 'DEMO_MAP_ID',
  markerTitle = 'Location',
  height = 200,
  className = '',
}: DelveInteractiveMapProps) {
  if (!GOOGLE_MAPS_API_KEY || isNaN(latitude) || isNaN(longitude)) {
    return null
  }

  const position = { lat: latitude, lng: longitude }

  return (
    <div
      className={`relative w-full rounded-xl overflow-hidden border border-white/10 ${className}`}
      style={{ height: typeof height === 'number' ? `${height}px` : height }}
    >
      <Map
        mapId={mapId}
        defaultCenter={position}
        center={position}
        defaultZoom={zoom}
        gestureHandling="cooperative"
        disableDefaultUI={false}
        className="w-full h-full"
      >
        <AdvancedMarker position={position} title={markerTitle}>
          <Pin
            background="#8C52FF"
            glyphColor="#FFFFFF"
            borderColor="#5918CA"
          />
        </AdvancedMarker>
      </Map>
    </div>
  )
}
