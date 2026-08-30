import React, { ReactNode } from 'react'
import { APIProvider } from '@vis.gl/react-google-maps'

interface GoogleMapsProviderProps {
  children: ReactNode
}

export const GOOGLE_MAPS_API_KEY = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '').trim()

export function GoogleMapsProvider({ children }: GoogleMapsProviderProps) {
  // If no API key is provided, we still render children gracefully
  if (!GOOGLE_MAPS_API_KEY) {
    return <>{children}</>
  }

  return (
    <APIProvider
      apiKey={GOOGLE_MAPS_API_KEY}
      solutionChannel="gmp_git_agentskills_v1"
      libraries={['places', 'routes', 'marker']}
    >
      {children}
    </APIProvider>
  )
}
