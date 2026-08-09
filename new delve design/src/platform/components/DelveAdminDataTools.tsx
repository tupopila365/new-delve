import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { VerificationDocument } from '../api/types'

type Props = {
  search?: string
  onSearchChange?: (v: string) => void
  searchPlaceholder?: string
  children?: ReactNode
}

export function DelveAdminFilterBar({
  search,
  onSearchChange,
  searchPlaceholder = 'Search…',
  children,
}: Props) {
  return (
    <div className="da-filter">
      {onSearchChange ? (
        <input
          type="search"
          className="da-filter__search"
          value={search ?? ''}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
          aria-label="Search"
        />
      ) : null}
      {children ? <div className="da-filter__chips">{children}</div> : null}
    </div>
  )
}

type ChipProps = {
  label: string
  active?: boolean
  onClick: () => void
}

export function DelveAdminFilterChip({ label, active, onClick }: ChipProps) {
  return (
    <button
      type="button"
      className={`da-filter__chip${active ? ' da-filter__chip--active' : ''}`}
      onClick={onClick}
    >
      {label}
    </button>
  )
}

type RowProps = {
  primary: string
  secondary?: string
  meta?: ReactNode
  badge?: ReactNode
  actions?: ReactNode
}

export function DelveAdminDataRow({ primary, secondary, meta, badge, actions }: RowProps) {
  return (
    <article className="da-row">
      <div className="da-row__copy">
        <strong>{primary}</strong>
        {secondary ? <span>{secondary}</span> : null}
        {meta}
      </div>
      {badge}
      {actions ? <div className="da-row__actions">{actions}</div> : null}
    </article>
  )
}

type DrawerProps = {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
}

export function DelveAdminDrawer({ open, title, onClose, children }: DrawerProps) {
  if (!open) return null
  return (
    <>
      <button type="button" className="da-drawer__backdrop" aria-label="Close" onClick={onClose} />
      <aside className="da-drawer" role="dialog" aria-modal="true" aria-labelledby="da-drawer-title">
        <div className="da-drawer__head">
          <h2 id="da-drawer-title">{title}</h2>
          <button type="button" className="da-drawer__close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className="da-drawer__body">{children}</div>
      </aside>
    </>
  )
}

type VerifyProps = {
  open: boolean
  businessName: string
  mode: 'approve' | 'reject'
  onClose: () => void
  onConfirm: (reason: string) => void
  busy?: boolean
}

export function DelveAdminVerifyDialog({
  open,
  businessName,
  mode,
  onClose,
  onConfirm,
  busy,
}: VerifyProps) {
  const [reason, setReason] = useState('')
  const isReject = mode === 'reject'

  useEffect(() => {
    if (!open) setReason('')
  }, [open])

  if (!open) return null

  return (
    <>
      <button type="button" className="da-drawer__backdrop" aria-label="Close" onClick={onClose} />
      <div className="da-dialog" role="dialog" aria-modal="true">
        <h2>{isReject ? 'Reject business' : 'Approve business'}</h2>
        <p className="da-dialog__sub">
          {businessName}
          {isReject ? ' — provide a reason the provider will see.' : ' — optional note for the record.'}
        </p>
        <label className="da-field">
          <span>{isReject ? 'Reason (required)' : 'Note (optional)'}</span>
          <textarea
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={
              isReject ? 'e.g. Documents incomplete or unclear…' : 'Approved — documents look good.'
            }
          />
        </label>
        <div className="da-dialog__actions">
          <button type="button" className="da-btn da-btn--ghost" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button
            type="button"
            className={`da-btn${isReject ? ' da-btn--danger' : ' da-btn--primary'}`}
            disabled={busy || (isReject && !reason.trim())}
            onClick={() => onConfirm(reason.trim())}
          >
            {busy ? 'Saving…' : isReject ? 'Reject' : 'Approve'}
          </button>
        </div>
      </div>
    </>
  )
}

export function DelveAdminDocList({ documents }: { documents: VerificationDocument[] }) {
  if (documents.length === 0) {
    return <p className="da-docs__empty">No documents uploaded yet.</p>
  }
  return (
    <ul className="da-docs">
      {documents.map((doc) => (
        <li key={doc.id} className="da-docs__item">
          <div>
            <strong>{doc.doc_type_label}</strong>
            <span>{new Date(doc.uploaded_at).toLocaleDateString()}</span>
          </div>
          <a href={doc.file} target="_blank" rel="noopener noreferrer" className="da-link-btn">
            View file
          </a>
        </li>
      ))}
    </ul>
  )
}

export function DelveAdminExternalLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link to={to} className="da-link-btn">
      {children}
    </Link>
  )
}
