import { ReactNode } from 'react'

interface GoogleMapsProviderProps {
  children: ReactNode
}

export const GOOGLE_MAPS_API_KEY = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '').trim()

export function GoogleMapsProvider({ children }: GoogleMapsProviderProps) {
  return <>{children}</>
}
