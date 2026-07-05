import { useEffect, useState } from 'react'

declare global {
  interface Window {
    google?: typeof google
    __delveGoogleMapsInit?: () => void
  }
}

let loadPromise: Promise<void> | null = null

export function googleMapsApiKey(): string | undefined {
  const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
  return typeof key === 'string' && key.trim() ? key.trim() : undefined
}

export function loadGoogleMaps(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('No window'))
  if (window.google?.maps?.places) return Promise.resolve()

  const key = googleMapsApiKey()
  if (!key) return Promise.reject(new Error('VITE_GOOGLE_MAPS_API_KEY is not set'))

  if (!loadPromise) {
    loadPromise = new Promise((resolve, reject) => {
      const callbackName = '__delveGoogleMapsInit'
      window[callbackName] = () => {
        delete window[callbackName]
        resolve()
      }
      const existing = document.getElementById('delve-google-maps-js')
      if (existing) {
        existing.addEventListener('load', () => resolve(), { once: true })
        existing.addEventListener('error', () => reject(new Error('Failed to load Google Maps')), {
          once: true,
        })
        return
      }
      const script = document.createElement('script')
      script.id = 'delve-google-maps-js'
      script.async = true
      script.defer = true
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&libraries=places&callback=${callbackName}`
      script.onerror = () => reject(new Error('Failed to load Google Maps'))
      document.head.appendChild(script)
    })
  }
  return loadPromise
}

export function useGoogleMapsLoader() {
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    if (!googleMapsApiKey()) {
      setError('Add VITE_GOOGLE_MAPS_API_KEY to enable the map picker.')
      return
    }
    loadGoogleMaps()
      .then(() => {
        if (!cancelled) {
          setReady(true)
          setError(null)
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Could not load Google Maps')
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  return { ready, error, hasKey: Boolean(googleMapsApiKey()) }
}
