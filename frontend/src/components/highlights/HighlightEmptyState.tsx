import './highlights.css'

type Props = {
  onAdd: () => void
  copy?: string
  buttonLabel?: string
  className?: string
}

export function HighlightEmptyState({
  onAdd,
  copy = 'Add highlights travellers can tap through — name each ring yourself.',
  buttonLabel = 'Add highlight',
  className,
}: Props) {
  return (
    <div className={`hl-stories-empty${className ? ` ${className}` : ''}`}>
      <p className="hl-stories-empty__copy">{copy}</p>
      <button type="button" className="hl-stories-empty__btn" onClick={onAdd}>
        {buttonLabel}
      </button>
    </div>
  )
}
