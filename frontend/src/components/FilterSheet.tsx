import type { ReactNode } from 'react'

type Props = {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
}

export function FilterSheet({ open, title, onClose, children, footer }: Props) {
  if (!open) return null
  return (
    <>
      <div className="sheet-backdrop" role="presentation" onClick={onClose} />
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title}>
        <div className="sheet__handle" aria-hidden />
        <div className="sheet__head">
          <h2 className="display" style={{ margin: 0, fontSize: '1.1rem' }}>
            {title}
          </h2>
          <button type="button" className="btn btn-ghost" style={{ padding: '0.4rem 0.75rem' }} onClick={onClose}>
            Done
          </button>
        </div>
        {children}
        {footer}
      </div>
    </>
  )
}
