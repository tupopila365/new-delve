import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { CornerUpLeft, Share2, SmilePlus, Trash2 } from 'lucide-react'
import type { GroupMessageDeleteScope } from '../../../utils/communityGroups'
import { GROUP_MESSAGE_EMOJIS, type GroupMessageReaction } from '../../../utils/communityGroups'

type MenuProps = {
  open: boolean
  anchorRef: React.RefObject<HTMLElement | null>
  alignEnd?: boolean
  canUnsend?: boolean
  onClose: () => void
  onPick: (emoji: string) => void
  onReply: () => void
  onForward: () => void
  onDelete: (scope: GroupMessageDeleteScope) => void
}

function positionActionMenu(menuEl: HTMLDivElement, anchorEl: HTMLElement, alignEnd: boolean) {
  const anchor = anchorEl.getBoundingClientRect()
  const menu = menuEl.getBoundingClientRect()
  const gap = 8
  const margin = 8

  let top = anchor.top - menu.height - gap
  if (top < margin) top = anchor.bottom + gap

  let left = alignEnd ? anchor.right - menu.width : anchor.left
  left = Math.max(margin, Math.min(left, window.innerWidth - menu.width - margin))

  menuEl.style.top = `${top}px`
  menuEl.style.left = `${left}px`
}

export function GroupMessageActionMenu({
  open,
  anchorRef,
  alignEnd = false,
  canUnsend = false,
  onClose,
  onPick,
  onReply,
  onForward,
  onDelete,
}: MenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!open) setDeleteOpen(false)
  }, [open])

  useLayoutEffect(() => {
    if (!open || !menuRef.current || !anchorRef.current) return

    const update = () => {
      if (!menuRef.current || !anchorRef.current) return
      positionActionMenu(menuRef.current, anchorRef.current, alignEnd)
    }

    update()
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
    }
  }, [alignEnd, anchorRef, open, deleteOpen])

  useEffect(() => {
    if (!open) return
    const onDoc = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node
      if (menuRef.current?.contains(target) || anchorRef.current?.contains(target)) return
      onClose()
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('touchstart', onDoc)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('touchstart', onDoc)
    }
  }, [anchorRef, onClose, open])

  if (!open || !mounted) return null

  return createPortal(
    <div
      className="group-chat__action-menu group-chat__action-menu--floating"
      ref={menuRef}
      role="menu"
      aria-label="Message actions"
    >
      <div className="group-chat__emoji-row" role="group" aria-label="React">
        {GROUP_MESSAGE_EMOJIS.map((emoji) => (
          <button key={emoji} type="button" className="group-chat__emoji-btn" onClick={() => onPick(emoji)}>
            {emoji}
          </button>
        ))}
      </div>
      <button type="button" className="group-chat__action-item" onClick={onReply}>
        <CornerUpLeft size={15} strokeWidth={2.25} aria-hidden />
        Reply
      </button>
      <button type="button" className="group-chat__action-item" onClick={onForward}>
        <Share2 size={15} strokeWidth={2.25} aria-hidden />
        Forward
      </button>
      {!deleteOpen ? (
        <button type="button" className="group-chat__action-item group-chat__action-item--danger" onClick={() => setDeleteOpen(true)}>
          <Trash2 size={15} strokeWidth={2.25} aria-hidden />
          Delete
        </button>
      ) : (
        <div className="group-chat__delete-options">
          <button type="button" className="group-chat__action-item" onClick={() => onDelete('me')}>
            Delete for me
          </button>
          {canUnsend ? (
            <button
              type="button"
              className="group-chat__action-item group-chat__action-item--danger"
              onClick={() => onDelete('everyone')}
            >
              Delete for everyone
            </button>
          ) : null}
        </div>
      )}
    </div>,
    document.body,
  )
}

type ReactionRowProps = {
  reactions: GroupMessageReaction[]
  onToggle: (emoji: string) => void
  onOpenPicker: () => void
}

export function GroupMessageReactions({ reactions, onToggle, onOpenPicker }: ReactionRowProps) {
  const hasReactions = reactions.length > 0

  return (
    <div
      className={[
        'group-chat__message-actions',
        hasReactions ? 'group-chat__message-actions--has-reactions' : 'group-chat__message-actions--idle',
      ].join(' ')}
    >
      {hasReactions ? (
        <div className="group-chat__reactions">
          {reactions.map((row) => (
            <button
              key={row.emoji}
              type="button"
              className={`group-chat__reaction${row.reacted_by_me ? ' is-mine' : ''}`}
              onClick={() => onToggle(row.emoji)}
            >
              <span aria-hidden>{row.emoji}</span>
              <span>{row.count}</span>
            </button>
          ))}
          <button
            type="button"
            className="group-chat__reaction group-chat__reaction--more"
            onClick={onOpenPicker}
            aria-label="More reactions"
          >
            <SmilePlus size={13} strokeWidth={2.25} aria-hidden />
          </button>
        </div>
      ) : (
        <button type="button" className="group-chat__react-fab" onClick={onOpenPicker} aria-label="React">
          <SmilePlus size={14} strokeWidth={2.25} aria-hidden />
        </button>
      )}
    </div>
  )
}
