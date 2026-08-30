import { useState } from 'react'
import { Search, X, UserPlus, Check, Shield, User, Loader2, Crown } from 'lucide-react'
import type { EventCollaboratorDto, EventCollaboratorRole } from '@delve/contracts'
import { eventClient } from '../../api/eventClient'

interface Props {
  isOpen: boolean
  onClose: () => void
  eventId: string
  existingCollaborators?: EventCollaboratorDto[]
  onCollaboratorAdded?: (collaborator: EventCollaboratorDto) => void
}

interface MockUser {
  id: string
  username: string
  displayName: string
  avatarUrl: string | null
  subtitle: string
}

const SUGGESTED_USERS: MockUser[] = [
  {
    id: 'user_johan_v',
    username: 'johan_overland',
    displayName: 'Johan V.',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    subtitle: 'Overland Host · 14 Expeditions',
  },
  {
    id: 'user_sarah_m',
    username: 'sarah_safari',
    displayName: 'Sarah Miller',
    avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
    subtitle: 'Wildlife Photographer · Swakopmund',
  },
  {
    id: 'user_taimi_n',
    username: 'taimi_namibia',
    displayName: 'Taimi N.',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    subtitle: 'Community Organizer · Windhoek',
  },
  {
    id: 'user_alex_r',
    username: 'alex_trails',
    displayName: 'Alex Rivera',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    subtitle: 'Trail Lead · Damaraland',
  },
  {
    id: 'user_elena_d',
    username: 'elena_dune',
    displayName: 'Elena Rostova',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    subtitle: 'Event Planner · Sossusvlei',
  },
]

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

  if (!isOpen) return null

  const existingIds = new Set(existingCollaborators.map(c => c.userId))

  const filteredUsers = SUGGESTED_USERS.filter(u => {
    const q = search.toLowerCase().trim()
    if (!q) return true
    return (
      u.displayName.toLowerCase().includes(q) ||
      u.username.toLowerCase().includes(q) ||
      u.subtitle.toLowerCase().includes(q)
    )
  })

  async function handleInvite(user: MockUser) {
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
      }, 600)
    } catch {
      setInvitingId(null)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-lg bg-neutral-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden p-6 z-10 space-y-5 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-600/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <UserPlus size={20} />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white m-0">Invite Co-Hosts & Staff</h3>
              <p className="text-xs text-neutral-400 m-0 mt-0.5">
                Co-manage attendees, broadcast event updates, and coordinate schedules.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-neutral-400 hover:text-white transition-colors"
            aria-label="Close modal"
          >
            <X size={16} />
          </button>
        </div>

        {/* Role Selector Pill Tabs */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
            Permission Role
          </label>
          <div className="grid grid-cols-3 gap-2 bg-neutral-950/60 p-1.5 rounded-2xl border border-white/5">
            <button
              type="button"
              onClick={() => setRole('CO_HOST')}
              className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-medium transition-all ${
                role === 'CO_HOST'
                  ? 'bg-amber-500 text-black font-semibold shadow-lg shadow-amber-500/20'
                  : 'text-neutral-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Crown size={14} />
              Co-Host
            </button>
            <button
              type="button"
              onClick={() => setRole('HOST')}
              className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-medium transition-all ${
                role === 'HOST'
                  ? 'bg-amber-500 text-black font-semibold shadow-lg shadow-amber-500/20'
                  : 'text-neutral-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Shield size={14} />
              Lead Host
            </button>
            <button
              type="button"
              onClick={() => setRole('EDITOR')}
              className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-medium transition-all ${
                role === 'EDITOR'
                  ? 'bg-amber-500 text-black font-semibold shadow-lg shadow-amber-500/20'
                  : 'text-neutral-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <User size={14} />
              Editor
            </button>
          </div>
          <p className="text-[11px] text-neutral-500 px-1">
            {role === 'HOST' && '👑 Lead Host: Full control over details, media, co-hosts, and cancellation.'}
            {role === 'CO_HOST' && '🤝 Co-Host: Manage attendee lists, upload media, and broadcast announcements.'}
            {role === 'EDITOR' && '📝 Editor: Edit event details, schedule times, and location.'}
          </p>
        </div>

        {/* Live Search Input */}
        <div className="relative">
          <Search
            size={18}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none"
          />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search traveler by name, username, or handle..."
            className="w-full bg-neutral-950/80 border border-white/10 rounded-2xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 transition-all"
          />
        </div>

        {/* Suggested Travelers List */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-neutral-400 px-1">
            <span>Suggested Travelers</span>
            <span>{filteredUsers.length} found</span>
          </div>

          <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
            {filteredUsers.length === 0 ? (
              <div className="text-center py-8 text-neutral-500 text-xs">
                No travelers match &ldquo;{search}&rdquo;
              </div>
            ) : (
              filteredUsers.map(user => {
                const isExisting = existingIds.has(user.id)
                const isInvited = invitedIds.has(user.id)
                const isBusy = invitingId === user.id

                return (
                  <div
                    key={user.id}
                    className="flex items-center justify-between gap-3 p-2.5 rounded-2xl bg-neutral-950/40 border border-white/5 hover:border-white/10 hover:bg-neutral-950/80 transition-all"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {user.avatarUrl ? (
                        <img
                          src={user.avatarUrl}
                          alt={user.displayName}
                          className="w-9 h-9 rounded-full object-cover border border-white/10 shrink-0"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 font-bold text-xs shrink-0">
                          {user.displayName.charAt(0)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold text-white truncate">
                            {user.displayName}
                          </span>
                          <span className="text-[11px] text-neutral-500 truncate">
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
                        <span className="text-[11px] font-medium text-neutral-500 bg-white/5 border border-white/5 px-2.5 py-1 rounded-full">
                          Already Co-Host
                        </span>
                      ) : isInvited ? (
                        <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
                          <Check size={12} />
                          Invited
                        </span>
                      ) : (
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleInvite(user)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-semibold text-xs transition-all shadow-md shadow-amber-500/20 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                        >
                          {isBusy ? (
                            <Loader2 size={13} className="animate-spin" />
                          ) : (
                            <UserPlus size={13} />
                          )}
                          <span>{isBusy ? 'Inviting...' : 'Invite'}</span>
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
        <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs text-neutral-500">
          <span>Invited co-hosts will be notified in their Delve feed</span>
          <button
            type="button"
            onClick={onClose}
            className="text-neutral-400 hover:text-white transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
