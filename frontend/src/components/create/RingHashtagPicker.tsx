import { useQuery } from '@tanstack/react-query'
import { HashtagTextarea } from '../ui/HashtagTextarea'
import { fetchTagTrending } from '../../api/tags'
import { extractHashtags } from '../../utils/hashtags'

/** Delvers rings are built from a post's hashtags, up to this many. */
export const MAX_RING_HASHTAGS = 7

type Props = {
  value: string
  onChange: (next: string) => void
  disabled?: boolean
  isHighlight?: boolean
  onLimit?: () => void
}

export function RingHashtagPicker({ value, onChange, disabled, isHighlight, onLimit }: Props) {
  const tags = extractHashtags(value)
  const atLimit = tags.length >= MAX_RING_HASHTAGS

  const trending = useQuery({
    queryKey: ['tag-trending', 'delvers'],
    queryFn: () => fetchTagTrending('delvers', 12),
    staleTime: 60_000,
  })

  const suggestions = (trending.data ?? []).filter((t) => !tags.includes(t.slug))

  const addTag = (slug: string) => {
    if (tags.includes(slug)) return
    if (atLimit) {
      onLimit?.()
      return
    }
    const trimmed = value.trim()
    onChange(trimmed ? `${trimmed} #${slug} ` : `#${slug} `)
  }

  return (
    <div className="create-ring-tags">
      <p className="create-ring-tags__label">
        {isHighlight ? 'Ring hashtags' : 'Hashtags'}
        <span className="create-ring-tags__count">{tags.length}/{MAX_RING_HASHTAGS}</span>
      </p>

      <HashtagTextarea
        value={value}
        onChange={onChange}
        theme="dark"
        rows={2}
        disabled={disabled}
        placeholder={
          isHighlight
            ? 'Add hashtags for your ring · #weekendtrips #foodfinds'
            : 'Add hashtags · #weekendtrips #foodfinds'
        }
        hashtags={{ scope: 'delvers', maxTags: MAX_RING_HASHTAGS, onMaxTags: onLimit }}
      />

      <p className="create-ring-tags__hint">
        Each hashtag becomes a ring — pick up to {MAX_RING_HASHTAGS}.
      </p>

      {suggestions.length > 0 ? (
        <div className="create-ring-tags__trending" aria-label="Trending hashtags">
          {suggestions.map((tag) => (
            <button
              key={tag.slug}
              type="button"
              className="create-ring-tags__chip"
              onClick={() => addTag(tag.slug)}
              disabled={atLimit}
            >
              #{tag.slug}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
