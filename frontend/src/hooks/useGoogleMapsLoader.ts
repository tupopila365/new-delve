import { useEffect, useState } from 'react'

declare global {
  interface Window {
    google?: typeof google
    __delveGoogleMapsInit?: () => void
    gm_authFailure?: () => void
  }
}

/** Shown when Google rejects the key (APIs off, billing, restrictions, etc.). */
export const GOOGLE_MAPS_SETUP_HINT =
  'Enable Maps JavaScript API and Places API on your Google Cloud project, turn on billing, and allow http://localhost:5173/* on the key.'

let loadPromise: Promise<void> | null = null
let authFailed = false
let rejectPending: ((reason?: unknown) => void) | null = null

export function googleMapsApiKey(): string | undefined {
  const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
  return typeof key === 'string' && key.trim() ? key.trim() : undefined
}

function markAuthFailed() {
  authFailed = true
  const err = new Error(GOOGLE_MAPS_SETUP_HINT)
  if (rejectPending) {
    rejectPending(err)
    rejectPending = null
  }
  loadPromise = null
}

function installAuthFailureHandler() {
  const previous = window.gm_authFailure
  window.gm_authFailure = () => {
    markAuthFailed()
    if (typeof previous === 'function') previous()
  }
}

export function loadGoogleMaps(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('No window'))
  if (authFailed) return Promise.reject(new Error(GOOGLE_MAPS_SETUP_HINT))
  if (window.google?.maps?.places) return Promise.resolve()

  const key = googleMapsApiKey()
  if (!key) return Promise.reject(new Error('VITE_GOOGLE_MAPS_API_KEY is not set'))

  if (!loadPromise) {
    installAuthFailureHandler()
    loadPromise = new Promise((resolve, reject) => {
      rejectPending = reject
      const callbackName = '__delveGoogleMapsInit'
      window[callbackName] = () => {
        delete window[callbackName]
        rejectPending = null
        if (authFailed) {
          reject(new Error(GOOGLE_MAPS_SETUP_HINT))
          return
        }
        resolve()
      }
      const existing = document.getElementById('delve-google-maps-js')
      if (existing) {
        existing.addEventListener(
          'load',
          () => {
            rejectPending = null
            if (authFailed) reject(new Error(GOOGLE_MAPS_SETUP_HINT))
            else resolve()
          },
          { once: true },
        )
        existing.addEventListener(
          'error',
          () => {
            rejectPending = null
            reject(new Error('Failed to load Google Maps'))
          },
          { once: true },
        )
        return
      }
      const script = document.createElement('script')
      script.id = 'delve-google-maps-js'
      script.async = true
      script.defer = true
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&libraries=places&loading=async&callback=${callbackName}`
      script.onerror = () => {
        rejectPending = null
        reject(new Error('Failed to load Google Maps'))
      }
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
      setError('Add VITE_GOOGLE_MAPS_API_KEY to frontend/.env.development.local, then restart Vite.')
      return
    }
    loadGoogleMaps()
      .then(() => {
        if (!cancelled) {
          if (authFailed) {
            setReady(false)
            setError(GOOGLE_MAPS_SETUP_HINT)
            return
          }
          setReady(true)
          setError(null)
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setReady(false)
          setError(e instanceof Error ? e.message : GOOGLE_MAPS_SETUP_HINT)
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  return { ready, error, hasKey: Boolean(googleMapsApiKey()) }
}
