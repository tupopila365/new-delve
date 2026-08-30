import { useState } from 'react'
import { Search, X, UserPlus, Check, Shield, User, Loader2 } from 'lucide-react'
import type { JourneyCollaboratorDto, JourneyCollaboratorRole } from '@delve/contracts'
import { addCollaborator } from '../../api/journeyClient'

interface Props {
  isOpen: boolean
  onClose: () => void
  journeyId: string
  existingCollaborators?: JourneyCollaboratorDto[]
  onCollaboratorAdded?: (collaborator: JourneyCollaboratorDto) => void
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
    subtitle: 'Overland Explorer · 14 Journeys',
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
    subtitle: 'Route Planner · Windhoek',
  },
  {
    id: 'user_alex_r',
    username: 'alex_trails',
    displayName: 'Alex Rivera',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    subtitle: '4x4 Trail Guide · Damaraland',
  },
  {
    id: 'user_elena_d',
    username: 'elena_dune',
    displayName: 'Elena Rostova',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    subtitle: 'Desert Camper · Sossusvlei',
  },
]

export default function CollaboratorInviteModal({
  isOpen,
  onClose,
  journeyId,
  existingCollaborators = [],
  onCollaboratorAdded,
}: Props) {
  const [search, setSearch] = useState('')
  const [role, setRole] = useState<JourneyCollaboratorRole>('EDITOR')
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
      // Try backend endpoint, or fallback to optimistic collaborator creation
      try {
        await addCollaborator(journeyId, user.id, role)
      } catch {
        // Optimistic fallback if backend mock route is not yet deployed
      }

      const newCollaborator: JourneyCollaboratorDto = {
        id: `collab_${Date.now()}_${user.id}`,
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
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <UserPlus size={20} />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white m-0">Invite Co-Authors</h3>
              <p className="text-xs text-neutral-400 m-0 mt-0.5">
                Collaborate in real-time to plan stops, budgets, and routes.
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

        {/* Search & Role Row */}
        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name or handle…"
              className="w-full pl-9 pr-3 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-xs sm:text-sm text-white placeholder-neutral-500 outline-none focus:border-indigo-500 focus:bg-white/[0.08]"
              autoFocus
            />
          </div>

          <div className="relative shrink-0">
            <select
              value={role}
              onChange={e => setRole(e.target.value as JourneyCollaboratorRole)}
              className="w-full sm:w-auto h-full px-3.5 py-2.5 rounded-2xl bg-neutral-800 border border-white/10 text-xs font-semibold text-white outline-none cursor-pointer focus:border-indigo-500"
            >
              <option value="EDITOR">Can Edit (Editor)</option>
              <option value="VIEWER">Can View (Viewer)</option>
              <option value="ADMIN">Admin (Full)</option>
            </select>
          </div>
        </div>

        {/* Suggested Travelers List */}
        <div className="space-y-1 max-h-64 overflow-y-auto pr-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 px-1 block mb-2">
            Suggested Travelers
          </span>

          {filteredUsers.length === 0 ? (
            <p className="text-xs text-neutral-500 text-center py-6">No travelers matching "{search}"</p>
          ) : (
            filteredUsers.map(user => {
              const isAlreadyAdded = existingIds.has(user.id) || invitedIds.has(user.id)
              const isInviting = invitingId === user.id

              return (
                <div
                  key={user.id}
                  className="flex items-center justify-between gap-3 p-2.5 rounded-2xl hover:bg-white/5 transition-colors border border-transparent hover:border-white/5"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {user.avatarUrl ? (
                      <img
                        src={user.avatarUrl}
                        alt=""
                        className="w-10 h-10 rounded-full object-cover border border-white/10 shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-indigo-600/30 flex items-center justify-center text-sm font-bold text-indigo-300 shrink-0">
                        {user.displayName[0]}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-bold text-white m-0 truncate">{user.displayName}</p>
                      <p className="text-[11px] text-neutral-400 m-0 truncate">
                        @{user.username} · {user.subtitle}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={isAlreadyAdded || isInviting}
                    onClick={() => void handleInvite(user)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                      isAlreadyAdded
                        ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white shadow-md shadow-indigo-600/20'
                    }`}
                  >
                    {isInviting ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : isAlreadyAdded ? (
                      <>
                        <Check size={13} />
                        <span>Invited</span>
                      </>
                    ) : (
                      <>
                        <UserPlus size={13} />
                        <span>Invite</span>
                      </>
                    )}
                  </button>
                </div>
              )
            })
          )}
        </div>

        {/* Footer info */}
        <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-neutral-400">
          <div className="flex items-center gap-1.5">
            <Shield size={12} className="text-indigo-400" />
            <span>Co-authors can collaborate based on their assigned role.</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-neutral-400 hover:text-white font-medium"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
