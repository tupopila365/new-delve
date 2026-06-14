import { Search, X } from 'lucide-react'

type Props = {
  id: string
  label: string
  placeholder: string
  value: string
  onChange: (value: string) => void
  onClear?: () => void
  className?: string
}

export function SearchPanel({ id, label, placeholder, value, onChange, onClear, className = '' }: Props) {
  return (
    <div className={`acc-page__search mk-search ${className}`.trim()}>
      <label className="visually-hidden" htmlFor={id}>
        {label}
      </label>
      <div className="acc-page__search-inner">
        <Search className="acc-page__search-icon acc-page__search-icon--graphic" size={18} strokeWidth={2.25} aria-hidden />
        <input
          id={id}
          type="search"
          className="acc-page__search-input input"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete="off"
          enterKeyHint="search"
        />
        {value && onClear ? (
          <button type="button" className="acc-page__search-clear" onClick={onClear} aria-label="Clear search">
            <X size={16} strokeWidth={2.25} aria-hidden />
          </button>
        ) : null}
      </div>
    </div>
  )
}
