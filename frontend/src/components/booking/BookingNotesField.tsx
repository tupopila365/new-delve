type Props = {
  id?: string
  label?: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  rows?: number
  maxLength?: number
  hint?: string
  className?: string
}

export function BookingNotesField({
  id = 'bk-notes',
  label = 'Special requests',
  value,
  onChange,
  placeholder = 'Any notes for the provider (optional)',
  rows = 3,
  maxLength,
  hint,
  className = '',
}: Props) {
  return (
    <div className={`bk-notes field ${className}`.trim()}>
      <label className="label" htmlFor={id}>
        {label}
      </label>
      <textarea
        id={id}
        className="input"
        rows={rows}
        maxLength={maxLength}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {hint ? <p className="bk-notes__hint">{hint}</p> : null}
    </div>
  )
}
