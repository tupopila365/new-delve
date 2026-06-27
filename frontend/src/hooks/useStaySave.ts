import { useEffect, useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '../api/client'
import { useAuth } from '../auth/AuthContext'

const LEGACY_SAVES_KEY = 'delve:saved-stays'
const MIGRATED_KEY = 'delve:saved-stays-migrated'

function readLegacySavedIds(): number[] {
  try {
    const raw = JSON.parse(window.localStorage.getItem(LEGACY_SAVES_KEY) || '[]') as string[]
    return raw
      .map((id) => parseInt(id, 10))
      .filter((id) => Number.isFinite(id) && id > 0)
  } catch {
    return []
  }
}

/** One-time import of browser-local stay saves into the account-backed API. */
export function useMigrateStaySaves() {
  const { profile } = useAuth()
  const qc = useQueryClient()
  const started = useRef(false)

  useEffect(() => {
    if (!profile || started.current) return
    if (window.localStorage.getItem(MIGRATED_KEY) === '1') return

    const legacyIds = readLegacySavedIds()
    if (legacyIds.length === 0) {
      window.localStorage.setItem(MIGRATED_KEY, '1')
      return
    }

    started.current = true
    void (async () => {
      for (const id of legacyIds) {
        try {
          await apiFetch(`/api/accommodation/listings/${id}/save/`, { method: 'POST' })
        } catch {
          // Skip invalid or unavailable listings during migration.
        }
      }
      window.localStorage.removeItem(LEGACY_SAVES_KEY)
      window.localStorage.setItem(MIGRATED_KEY, '1')
      void qc.invalidateQueries({ queryKey: ['accommodation'] })
      void qc.invalidateQueries({ queryKey: ['saved-stays'] })
      void qc.invalidateQueries({ queryKey: ['acc'] })
    })()
  }, [profile, qc])
}

export function useToggleStaySave() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (listingId: number) =>
      apiFetch<{ saved: boolean; saves_count: number }>(
        `/api/accommodation/listings/${listingId}/save/`,
        { method: 'POST' },
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['accommodation'] })
      void qc.invalidateQueries({ queryKey: ['saved-stays'] })
      void qc.invalidateQueries({ queryKey: ['acc'] })
    },
  })
}
