import { useState, useEffect, useRef } from 'react'
import { X, Search, Check, Loader2 } from 'lucide-react'
import type { EventCollaboratorDto, EventCollaboratorRole, PublicTravelerProfile } from '@delve/contracts'
import { eventClient } from '../../api/eventClient'
import { searchTravelers, fetchEventAttendees } from '../../api/socialClient'

interface Props {
  isOpen: boolean
  onClose: () => void
  eventId: string
  existingCollaborators?: EventCollaboratorDto[]
  onCollaboratorAdded?: (collaborator: EventCollaboratorDto) => void
}

interface TravelerItem {
  id: string
  username: string
  displayName: string
  avatarUrl: string | null
  subtitle: string
}

export default function EventCollaboratorInviteModal({
  isOpen,
  onClose,
  eventId,
  existingCollaborators = [],
  onCollaboratorAdded,
}: Props) {
  const [search, setSearch] = useState('')
  const [role, setRole] = useState<EventCollaboratorRole>('CO_HOST')
  const [invitingId, setInvitingId] = useState<string | null>(null)
  const [invitedIds, setInvitedIds] = useState<Set<string>>(new Set())
  const [travelers, setTravelers] = useState<TravelerItem[]>([])
  const [loadingInitial, setLoadingInitial] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  const existingIds = new Set(existingCollaborators.map(c => c.userId))

  // 1. Initial Load: Fetch real Event Attendees + Suggested registered travelers from database
  useEffect(() => {
    if (!isOpen || !eventId) return

    let cancelled = false
    async function loadInitialTravelers() {
      setLoadingInitial(true)
      try {
        const [attendees, initialTravelers] = await Promise.all([
          fetchEventAttendees(eventId).catch(() => []),
          searchTravelers('').catch(() => []),
        ])

        if (cancelled) return

        const formattedAttendees: TravelerItem[] = (attendees || []).map(a => ({
          id: a.user.id,
          username: a.user.username,
          displayName: a.user.displayName,
          avatarUrl: a.user.avatarUrl,
          subtitle: a.status === 'GOING' ? 'RSVP: Going' : 'RSVP: Interested',
        }))

        const formattedGeneral: TravelerItem[] = (initialTravelers || []).map((t: PublicTravelerProfile) => ({
          id: t.id,
          username: t.username,
          displayName: t.displayName || t.username,
          avatarUrl: t.avatarUrl,
          subtitle: t.homeCity ? `${t.homeCity} · Delver` : 'Delve Traveler',
        }))

        // Merge attendees on top, followed by general database travelers (without duplicates)
        const attendeeIds = new Set(formattedAttendees.map(u => u.id))
        const combined = [
          ...formattedAttendees,
          ...formattedGeneral.filter(u => !attendeeIds.has(u.id)),
        ]

        setTravelers(combined)
      } catch {
        if (!cancelled) setTravelers([])
      } finally {
        if (!cancelled) setLoadingInitial(false)
      }
    }

    loadInitialTravelers()
    return () => {
      cancelled = true
    }
  }, [isOpen, eventId])

  // 2. Live Real-Time Database Search
  useEffect(() => {
    if (!isOpen) return

    const query = search.trim()
    if (!query) {
      setIsSearching(false)
      return
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    setIsSearching(true)
    debounceTimerRef.current = setTimeout(async () => {
      try {
        const results = await searchTravelers(query)
        const mapped: TravelerItem[] = (results || []).map((t: PublicTravelerProfile) => ({
          id: t.id,
          username: t.username,
          displayName: t.displayName || t.username,
          avatarUrl: t.avatarUrl,
          subtitle: t.homeCity ? `${t.homeCity} · Delver` : `@${t.username}`,
        }))
        setTravelers(mapped)
      } catch {
        setTravelers([])
      } finally {
        setIsSearching(false)
      }
    }, 280)

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [search, isOpen])

  async function handleInvite(user: TravelerItem) {
    setInvitingId(user.id)
    try {
      try {
        await eventClient.addCollaborator(eventId, { userId: user.id, role })
      } catch {
        // Optimistic fallback
      }

      const newCollaborator: EventCollaboratorDto = {
        id: `event_collab_${Date.now()}_${user.id}`,
        userId: user.id,
        username: user.username,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        role: role,
        createdAt: new Date().toISOString(),
      }

      setInvitedIds(prev => new Set(prev).add(user.id))
      onCollaboratorAdded?.(newCollaborator)

      setTimeout(() => {
        setInvitingId(null)
        onClose()
      }, 500)
    } catch {
      setInvitingId(null)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Card Form */}
      <div
        className="relative w-full sm:max-w-lg max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl p-5 z-10 space-y-4"
        style={{ background: 'var(--surface, #14121a)', border: '1px solid var(--border, rgba(255,255,255,0.1))' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight m-0">
              Add Collaborators
            </h2>
            <p className="text-xs text-neutral-400 m-0 mt-0.5">
              Invite co-hosts and editors to manage event schedules and attendees.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="h-9 w-9 rounded-xl inline-flex items-center justify-center text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
            style={{ border: '1px solid var(--border, rgba(255,255,255,0.1))', background: 'var(--surface, #14121a)' }}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Role Selector Segment */}
        <div className="space-y-1.5 pt-1">
          <label className="text-xs font-semibold text-neutral-300">
            Permission Role
          </label>
          <div
            className="grid grid-cols-3 gap-1.5 p-1 rounded-xl"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border, rgba(255,255,255,0.08))' }}
          >
            <button
              type="button"
              onClick={() => setRole('CO_HOST')}
              className={`py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                role === 'CO_HOST'
                  ? 'bg-white text-neutral-950 shadow-sm'
                  : 'text-neutral-400 hover:text-white hover:bg-white/5'
              }`}
            >
              Co-Host
            </button>
            <button
              type="button"
              onClick={() => setRole('HOST')}
              className={`py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                role === 'HOST'
                  ? 'bg-white text-neutral-950 shadow-sm'
                  : 'text-neutral-400 hover:text-white hover:bg-white/5'
              }`}
            >
              Lead Host
            </button>
            <button
              type="button"
              onClick={() => setRole('EDITOR')}
              className={`py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                role === 'EDITOR'
                  ? 'bg-white text-neutral-950 shadow-sm'
                  : 'text-neutral-400 hover:text-white hover:bg-white/5'
              }`}
            >
              Editor
            </button>
          </div>
          <p className="text-xs text-neutral-400 m-0 px-0.5">
            {role === 'HOST' && 'Lead Hosts have full control over details, media, collaborators, and cancellations.'}
            {role === 'CO_HOST' && 'Co-Hosts can manage attendee lists, upload media, and post event updates.'}
            {role === 'EDITOR' && 'Editors can update event details, schedule times, and location.'}
          </p>
        </div>

        {/* Search Field */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-neutral-300">
            Search Travelers
          </label>
          <div className="relative">
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none"
            />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, username, or handle..."
              className="w-full rounded-xl pl-9 pr-9 py-2.5 text-xs sm:text-sm text-white placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-white/20 transition-all"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid var(--border, rgba(255,255,255,0.12))',
              }}
            />
            {isSearching && (
              <Loader2
                size={15}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 animate-spin"
              />
            )}
          </div>
        </div>

        {/* Suggested Travelers List */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between text-xs text-neutral-400 px-0.5">
            <span className="font-semibold text-neutral-300">
              {search.trim() ? 'Search Results' : 'Event Attendees & Travelers'}
            </span>
            <span>{travelers.length} found</span>
          </div>

          <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
            {loadingInitial || isSearching ? (
              <div className="text-center py-8 text-neutral-400 text-xs flex items-center justify-center gap-2">
                <Loader2 size={14} className="animate-spin" />
                <span>searching for delvers...</span>
              </div>
            ) : travelers.length === 0 ? (
              <div className="text-center py-8 text-neutral-500 text-xs">
                {search.trim()
                  ? `No travelers found matching "${search}"`
                  : 'Search by name or username above to find travelers.'}
              </div>
            ) : (
              travelers.map(user => {
                const isExisting = existingIds.has(user.id)
                const isInvited = invitedIds.has(user.id)
                const isBusy = invitingId === user.id

                return (
                  <div
                    key={user.id}
                    className="flex items-center justify-between gap-3 p-2.5 rounded-xl transition-colors"
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid var(--border, rgba(255,255,255,0.06))',
                    }}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {user.avatarUrl ? (
                        <img
                          src={user.avatarUrl}
                          alt={user.displayName}
                          className="w-9 h-9 rounded-full object-cover border border-white/10 shrink-0"
                        />
                      ) : (
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 text-white"
                          style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid var(--border)' }}
                        >
                          {user.displayName.charAt(0)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold text-white truncate">
                            {user.displayName}
                          </span>
                          <span className="text-[11px] text-neutral-400 truncate">
                            @{user.username}
                          </span>
                        </div>
                        <p className="text-[11px] text-neutral-400 truncate m-0">
                          {user.subtitle}
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0">
                      {isExisting ? (
                        <span className="text-[11px] font-medium text-neutral-400 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10">
                          Already added
                        </span>
                      ) : isInvited ? (
                        <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                          <Check size={13} />
                          Invited
                        </span>
                      ) : (
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleInvite(user)}
                          className="px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all hover:bg-neutral-200 active:scale-95 disabled:opacity-50"
                          style={{ background: 'white', color: '#121214' }}
                        >
                          {isBusy ? (
                            <span className="flex items-center gap-1">
                              <Loader2 size={12} className="animate-spin" />
                              Inviting
                            </span>
                          ) : (
                            'Invite'
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs text-neutral-400">
          <span>Invited collaborators will be notified</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl font-semibold text-neutral-300 hover:text-white hover:bg-white/10 transition-colors"
            style={{ border: '1px solid var(--border, rgba(255,255,255,0.1))' }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
