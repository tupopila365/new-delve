import type { ReactNode } from 'react'
import { X } from 'lucide-react'
import './community-compose-modal.css'

type Props = {
  open: boolean
  title: string
  titleId: string
  onClose: () => void
  children: ReactNode
}

export function CommunityComposeModalShell({ open, title, titleId, onClose, children }: Props) {
  if (!open) return null

  return (
    <div className="cm-compose-modal" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <button type="button" className="cm-compose-modal__backdrop" onClick={onClose} aria-label="Close" />
      <div className="cm-compose-modal__panel">
        <div className="cm-compose-modal__head">
          <h2 id={titleId}>{title}</h2>
          <button type="button" className="cm-compose-modal__close" onClick={onClose} aria-label="Close">
            <X size={18} strokeWidth={2.25} aria-hidden />
          </button>
        </div>
        <div className="cm-compose-modal__body">{children}</div>
      </div>
    </div>
  )
}
