import { MEDIA_FILTERS, type MediaFilter } from './types'

type Props = {
  value: MediaFilter
  onChange: (filter: MediaFilter) => void
}

export function FilterStrip({ value, onChange }: Props) {
  return (
    <div className="create-panel">
      <p className="create-panel__title">Filters</p>
      <div className="create-filter-strip" role="list" aria-label="Photo filters">
        {MEDIA_FILTERS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="listitem"
            className={value === item.id ? 'is-active' : ''}
            onClick={() => onChange(item.id)}
          >
            <span className={`create-filter-strip__dot create-filter-strip__dot--${item.id}`} aria-hidden />
            {item.label}
          </button>
        ))}
      </div>
    </div>
  )
}
