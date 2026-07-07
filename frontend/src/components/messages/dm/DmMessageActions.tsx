import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { CornerUpLeft, Share2, Trash2 } from 'lucide-react'
import type { DmMessageDeleteScope } from './dmMessageUtils'

type MenuProps = {
  open: boolean
  anchorRef: React.RefObject<HTMLElement | null>
  alignEnd?: boolean
  canUnsend?: boolean
  onClose: () => void
  onReply: () => void
  onForward: () => void
  onDelete: (scope: DmMessageDeleteScope) => void
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

export function DmMessageActionMenu({
  open,
  anchorRef,
  alignEnd = false,
  canUnsend = false,
  onClose,
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
      <button type="button" className="group-chat__action-item" onClick={onReply}>
        <CornerUpLeft size={15} strokeWidth={2.25} aria-hidden />
        Reply
      </button>
      <button type="button" className="group-chat__action-item" onClick={onForward}>
        <Share2 size={15} strokeWidth={2.25} aria-hidden />
        Forward
      </button>
      {!deleteOpen ? (
        <button
          type="button"
          className="group-chat__action-item group-chat__action-item--danger"
          onClick={() => setDeleteOpen(true)}
        >
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
