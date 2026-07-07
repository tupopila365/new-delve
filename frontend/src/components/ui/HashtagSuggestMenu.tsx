import type { TagSummary } from '../../api/tags'
import './HashtagSuggestMenu.css'

type Props = {
  open: boolean
  suggestions: TagSummary[]
  selectedIndex: number
  isLoading?: boolean
  theme?: 'dark' | 'light'
  onPick: (slug: string) => void
  onHover: (index: number) => void
}

export function HashtagSuggestMenu({
  open,
  suggestions,
  selectedIndex,
  isLoading = false,
  theme = 'dark',
  onPick,
  onHover,
}: Props) {
  if (!open) return null

  return (
    <div
      className={`hashtag-suggest hashtag-suggest--${theme}`}
      role="listbox"
      aria-label="Hashtag suggestions"
    >
      {isLoading && suggestions.length === 0 ? (
        <p className="hashtag-suggest__status">Searching tags…</p>
      ) : null}
      {suggestions.map((row, index) => (
        <button
          key={row.slug}
          type="button"
          role="option"
          aria-selected={index === selectedIndex}
          className={`hashtag-suggest__item${index === selectedIndex ? ' is-active' : ''}`}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => onPick(row.slug)}
          onMouseEnter={() => onHover(index)}
        >
          <span className="hashtag-suggest__tag">#{row.slug}</span>
          {row.use_count > 0 ? (
            <span className="hashtag-suggest__count">{row.use_count.toLocaleString()}</span>
          ) : null}
        </button>
      ))}
      {!isLoading && suggestions.length === 0 ? (
        <p className="hashtag-suggest__status">No matching tags</p>
      ) : null}
    </div>
  )
}
