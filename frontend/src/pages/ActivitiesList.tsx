import { useEffect, useMemo, useState, type MouseEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Mountain, Search } from 'lucide-react'
import { apiFetch } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { ActivityCard } from '../components/activities/ActivityCard'
import { EmptyState, ListSkeleton } from '../components/ui'
import { ACTIVITY_CATEGORIES, type ActivityListing } from '../utils/activityListing'
import '../components/activities/activities.css'

export function ActivitiesList() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const qc = useQueryClient()
  const [category, setCategory] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [busyId, setBusyId] = useState<number | null>(null)

  useEffect(() => {
    const t = window.setTimeout(() => setSearch(searchInput.trim()), 350)
    return () => window.clearTimeout(t)
  }, [searchInput])

  const query = useMemo(() => {
    const params = new URLSearchParams()
    if (category) params.set('category', category)
    if (search) params.set('search', search)
    const qs = params.toString()
    return qs ? `?${qs}` : ''
  }, [category, search])

  const listKey = ['activities', category, search, Boolean(profile)] as const

  const { data: activities = [], isLoading, isError } = useQuery({
    queryKey: listKey,
    queryFn: async (): Promise<ActivityListing[]> => {
      const raw = await apiFetch<unknown>(`/api/activities/listings/${query}`, {
        auth: Boolean(profile),
      })
      if (Array.isArray(raw)) return raw as ActivityListing[]
      if (raw && typeof raw === 'object' && Array.isArray((raw as { results?: unknown }).results)) {
        return (raw as { results: ActivityListing[] }).results
      }
      return []
    },
  })

  const saveMut = useMutation({
    mutationFn: (listingId: number) =>
      apiFetch<{ saved: boolean; saves_count: number }>(
        `/api/activities/listings/${listingId}/save/`,
        { method: 'POST' },
      ),
    onMutate: (listingId) => setBusyId(listingId),
    onSuccess: (result, listingId) => {
      qc.setQueryData<ActivityListing[]>(listKey, (prev) =>
        (prev ?? []).map((row) =>
          row.id === listingId
            ? { ...row, saved_by_me: result.saved, saves_count: result.saves_count }
            : row,
        ),
      )
      void qc.invalidateQueries({ queryKey: ['activity', String(listingId)] })
      void qc.invalidateQueries({ queryKey: ['saved-activities'] })
    },
    onSettled: () => setBusyId(null),
  })

  const onToggleSave = (listingId: number, e: MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!profile) {
      navigate('/login')
      return
    }
    if (busyId === listingId || saveMut.isPending) return
    saveMut.mutate(listingId)
  }

  return (
    <main className="act-market">
      <header className="act-market__hero">
        <p className="act-market__kicker">Experiences worldwide</p>
        <h1 className="act-market__title">Activities</h1>
        <p className="act-market__lead">
          Book drives, adventure, water, and cultural experiences from local operators — photos and short videos
          included.
        </p>
        <div className="act-market__filters">
          <label className="act-market__search" htmlFor="act-search">
            <Search size={16} strokeWidth={2.25} aria-hidden />
            <input
              id="act-search"
              type="search"
              placeholder="Search activities…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              aria-label="Search activities"
            />
          </label>
          <select
            className="act-market__select"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            aria-label="Category"
          >
            {ACTIVITY_CATEGORIES.map((c) => (
              <option key={c.value || 'all'} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
      </header>

      {isLoading ? (
        <ListSkeleton count={6} variant="card" />
      ) : isError ? (
        <EmptyState
          iconElement={<Mountain size={28} strokeWidth={2} aria-hidden />}
          title="Could not load activities"
          sub="Check your connection and try again."
        />
      ) : activities.length === 0 ? (
        <EmptyState
          iconElement={<Mountain size={28} strokeWidth={2} aria-hidden />}
          title="No activities yet"
          sub="Operators can list drives and experiences here soon."
        />
      ) : (
        <div className="act-grid">
          {activities.map((activity) => (
            <ActivityCard
              key={activity.id}
              activity={activity}
              saved={Boolean(activity.saved_by_me)}
              saveBusy={busyId === activity.id}
              onToggleSave={onToggleSave}
            />
          ))}
        </div>
      )}
    </main>
  )
}
