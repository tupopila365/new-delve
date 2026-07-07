import { useQuery } from '@tanstack/react-query'
import { Loader2, Share2, X } from 'lucide-react'
import { apiFetch } from '../../../api/client'
import { mediaUrl } from '../../../api/client'
import { UserAvatar } from '../../UserAvatar'
import '../../community/group/group-forward-sheet.css'

type ConversationRow = {
  id: number
  other?: {
    id: number
    username: string
    display_name: string
    avatar?: string | null
  } | null
}

type Props = {
  open: boolean
  currentConversationId: string | number
  onClose: () => void
  onPick: (conversationId: number) => void
  busy?: boolean
}

export function DmForwardSheet({ open, currentConversationId, onClose, onPick, busy = false }: Props) {
  const conversationsQuery = useQuery({
    queryKey: ['conversations', 'forward'],
    enabled: open,
    queryFn: () => apiFetch<ConversationRow[]>('/api/messaging/conversations/'),
  })

  if (!open) return null

  const rows = (conversationsQuery.data ?? []).filter((row) => String(row.id) !== String(currentConversationId))

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
          {conversationsQuery.isLoading ? (
            <div className="group-forward-sheet__state">
              <Loader2 size={20} strokeWidth={2.25} className="group-chat__spin" aria-hidden />
              <span>Loading conversations…</span>
            </div>
          ) : null}

          {!conversationsQuery.isLoading && rows.length === 0 ? (
            <p className="group-forward-sheet__empty">Start another chat to forward messages.</p>
          ) : null}

          {!conversationsQuery.isLoading
            ? rows.map((row) => {
                const person = row.other
                if (!person) return null
                const name = person.display_name?.trim() || person.username
                return (
                  <button
                    key={row.id}
                    type="button"
                    className="group-forward-sheet__row"
                    disabled={busy}
                    onClick={() => onPick(row.id)}
                  >
                    <div className="group-forward-sheet__avatar">
                      <UserAvatar src={mediaUrl(person.avatar)} name={name} fill />
                    </div>
                    <div className="group-forward-sheet__copy">
                      <strong>{name}</strong>
                      <small>@{person.username}</small>
                    </div>
                  </button>
                )
              })
            : null}
        </div>
      </div>
    </div>
  )
}
