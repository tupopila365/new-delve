import { useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'
import './CreateToolSheet.css'

type Props = {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
}

export function CreateToolSheet({ open, title, onClose, children }: Props) {
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  if (!open) return null

  return (
    <div className="create-tool-sheet" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" className="create-tool-sheet__backdrop" aria-label="Close tools" onClick={onClose} />
      <div className="create-tool-sheet__panel">
        <div className="create-tool-sheet__bar">
          <span className="create-tool-sheet__handle" aria-hidden />
          <button type="button" className="create-tool-sheet__close" onClick={onClose} aria-label={`Close ${title}`}>
            <X size={18} strokeWidth={2.25} aria-hidden />
          </button>
        </div>
        <div className="create-tool-sheet__body">{children}</div>
      </div>
    </div>
  )
}
