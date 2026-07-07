import { useQuery } from '@tanstack/react-query'
import { Loader2, Share2, X } from 'lucide-react'
import { apiFetch } from '../../../api/client'
import type { CommunityGroup } from '../../../utils/communityGroups'
import { groupsListPath } from '../../../utils/communityGroups'
import './group-forward-sheet.css'

type Props = {
  open: boolean
  currentGroupSlug: string
  onClose: () => void
  onPick: (groupSlug: string) => void
  busy?: boolean
}

export function GroupForwardSheet({ open, currentGroupSlug, onClose, onPick, busy = false }: Props) {
  const groupsQuery = useQuery({
    queryKey: ['community-groups', 'mine-forward'],
    enabled: open,
    queryFn: () => apiFetch<CommunityGroup[]>(groupsListPath({ mine: true })),
  })

  if (!open) return null

  const groups = (groupsQuery.data ?? []).filter((group) => group.joined)

  return (
    <div className="group-forward-sheet" role="presentation" onClick={onClose}>
      <div
        className="group-forward-sheet__panel"
        role="dialog"
        aria-label="Forward message"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="group-forward-sheet__head">
          <div>
            <Share2 size={16} strokeWidth={2.25} aria-hidden />
            <strong>Forward to</strong>
          </div>
          <button type="button" className="group-forward-sheet__close" onClick={onClose} aria-label="Close">
            <X size={16} strokeWidth={2.25} aria-hidden />
          </button>
        </header>

        <div className="group-forward-sheet__body">
          {groupsQuery.isLoading ? (
            <div className="group-forward-sheet__state">
              <Loader2 size={20} strokeWidth={2.25} className="group-chat__spin" aria-hidden />
              <span>Loading your groups…</span>
            </div>
          ) : null}

          {!groupsQuery.isLoading && groups.length === 0 ? (
            <p className="group-forward-sheet__empty">Join a group to forward messages.</p>
          ) : null}

          {!groupsQuery.isLoading
            ? groups.map((group) => (
                <button
                  key={group.id}
                  type="button"
                  className="group-forward-sheet__row"
                  disabled={busy}
                  onClick={() => onPick(group.slug)}
                >
                  <div className="group-forward-sheet__avatar">
                    {group.cover_src ? <img src={group.cover_src} alt="" /> : <span>{group.name.charAt(0)}</span>}
                  </div>
                  <div className="group-forward-sheet__copy">
                    <strong>{group.name}</strong>
                    <small>
                      {group.slug === currentGroupSlug ? 'This chat' : `${group.member_count} members`}
                    </small>
                  </div>
                </button>
              ))
            : null}
        </div>
      </div>
    </div>
  )
}
