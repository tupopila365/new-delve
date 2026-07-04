import type { ReactNode } from 'react'
import { X } from 'lucide-react'
import './CreateToolSheet.css'

type Props = {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
}

export function CreateToolSheet({ open, title, onClose, children }: Props) {
  if (!open) return null

  return (
    <div className="create-tool-sheet" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" className="create-tool-sheet__backdrop" aria-label="Close tools" onClick={onClose} />
      <div className="create-tool-sheet__panel">
        <div className="create-tool-sheet__handle" aria-hidden />
        <header className="create-tool-sheet__head">
          <strong>{title}</strong>
          <button type="button" className="create-tool-sheet__close" onClick={onClose} aria-label="Close">
            <X size={18} strokeWidth={2.25} aria-hidden />
          </button>
        </header>
        <div className="create-tool-sheet__body">{children}</div>
      </div>
    </div>
  )
}
