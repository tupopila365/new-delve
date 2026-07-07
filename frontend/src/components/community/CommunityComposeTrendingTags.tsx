import type { TagSummary } from '../../api/tags'
import { extractHashtags, MAX_TAGS_PER_POST } from '../../utils/hashtags'

type Props = {
  tags: TagSummary[]
  text: string
  onChange: (next: string) => void
  onError: (message: string) => void
  variant?: 'ask' | 'tip'
}

export function CommunityComposeTrendingTags({
  tags,
  text,
  onChange,
  onError,
  variant = 'tip',
}: Props) {
  if (tags.length === 0) return null

  return (
    <div className="cm-compose-modal__tags" aria-label="Trending hashtags">
      {tags.map((tag) => {
        const hashtag = `#${tag.slug}`
        return (
          <button
            key={tag.slug}
            type="button"
            className="cm-compose-modal__tag"
            onClick={() => {
              if (extractHashtags(text).includes(tag.slug)) return
              if (extractHashtags(text).length >= MAX_TAGS_PER_POST) {
                onError(`Use up to ${MAX_TAGS_PER_POST} hashtags per post.`)
                return
              }
              onError('')
              if (variant === 'ask' && !text.trim()) {
                onChange(`Any tips on ${tag.slug}? ${hashtag}`)
                return
              }
              onChange(text.trim() ? `${text.trim()} ${hashtag}` : `${hashtag} `)
            }}
          >
            {hashtag}
          </button>
        )
      })}
    </div>
  )
}
