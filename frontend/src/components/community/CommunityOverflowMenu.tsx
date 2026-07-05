import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bookmark, MoreVertical } from 'lucide-react'
import { ReportButton } from '../report/ReportButton'
import type { ReportTarget } from '../report/ReportButton'

type ReplyMenuProps = {
  reportTarget: ReportTarget
}

export function CommentOverflowMenu({ reportTarget }: ReplyMenuProps) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (event: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  return (
    <div className="cm-comment__menu-wrap" ref={wrapRef}>
      <button
        type="button"
        className="cm-comment__menu-btn"
        aria-label="More actions"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <MoreVertical size={16} strokeWidth={2.25} aria-hidden />
      </button>
      {open ? (
        <div className="cm-comment__menu" role="menu">
          <ReportButton
            className="cm-comment__menu-item"
            triggerLabel="Report"
            iconOnly
            iconSize={16}
            target={reportTarget}
          />
        </div>
      ) : null}
    </div>
  )
}

type PostMenuProps = {
  signedIn: boolean
  saved: boolean
  saveBusy: boolean
  onSave: () => void
  reportTarget: ReportTarget
}

export function PostOverflowMenu({
  signedIn,
  saved,
  saveBusy,
  onSave,
  reportTarget,
}: PostMenuProps) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (event: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  return (
    <div className="cm-comment__menu-wrap" ref={wrapRef}>
      <button
        type="button"
        className="cm-comment__menu-btn"
        aria-label="More actions"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <MoreVertical size={18} strokeWidth={2.25} aria-hidden />
      </button>
      {open ? (
        <div className="cm-comment__menu" role="menu">
          {signedIn ? (
            <button
              type="button"
              role="menuitem"
              className={`cm-comment__menu-item${saved ? ' is-active' : ''}`}
              disabled={saveBusy}
              onClick={() => {
                onSave()
                setOpen(false)
              }}
            >
              <Bookmark size={16} strokeWidth={2.25} fill={saved ? 'currentColor' : 'none'} aria-hidden />
              {saved ? 'Saved' : 'Save'}
            </button>
          ) : (
            <Link to="/login" role="menuitem" className="cm-comment__menu-item" onClick={() => setOpen(false)}>
              <Bookmark size={16} strokeWidth={2.25} aria-hidden />
              Save
            </Link>
          )}
          <ReportButton
            className="cm-comment__menu-item"
            triggerLabel="Report"
            iconOnly
            iconSize={16}
            target={reportTarget}
          />
        </div>
      ) : null}
    </div>
  )
}
