import './highlights.css'

type Props = {
  onAdd: () => void
  label?: string
  className?: string
}

/** Compact owner CTA for detail pages (journey, event, etc.). */
export function HighlightOwnerBar({ onAdd, label = 'Add highlight', className }: Props) {
  return (
    <div className={`hl-owner-bar${className ? ` ${className}` : ''}`}>
      <button type="button" className="hl-owner-bar__btn" onClick={onAdd}>
        {label}
      </button>
    </div>
  )
}
