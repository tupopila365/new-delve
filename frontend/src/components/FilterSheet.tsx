import type { ReactNode } from 'react'

type Props = {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  className?: string
}

export function FilterSheet({ open, title, onClose, children, footer, className }: Props) {
  if (!open) return null
  const titleId = 'filter-sheet-title'
  const sheetClass = ['sheet', 'sheet--filters', className].filter(Boolean).join(' ')
  return (
    <>
      <div className="sheet-backdrop" role="presentation" onClick={onClose} />
      <div
        className={sheetClass}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="sheet__handle" aria-hidden />
        <header className="sheet__head">
          <h2 id={titleId} className="sheet__title">
            {title}
          </h2>
          <button type="button" className="sheet__done" onClick={onClose}>
            Done
          </button>
        </header>
        <div className="sheet__body">{children}</div>
        {footer}
      </div>
    </>
  )
}
