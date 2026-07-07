import { useState, type MouseEvent } from 'react'
import type { FeedPost } from '../IgPostCard'
import { PostMedia } from '../PostMedia'
import { postToCommunityMedia, useCommunityMediaViewer } from './CommunityMediaViewer'

type Props = {
  post: Pick<FeedPost, 'image' | 'video' | 'body'>
  label?: string
  className?: string
}

export function CommunityFeedMedia({ post, label = 'Post media', className = '' }: Props) {
  const { openPostMedia } = useCommunityMediaViewer()
  const [failed, setFailed] = useState(false)
  const hasMedia = Boolean(post.image || post.video)

  if (!hasMedia || failed) return null

  const open = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.stopPropagation()
    const item = postToCommunityMedia(post, label)
    if (item) openPostMedia(post, label)
  }

  return (
    <button
      type="button"
      className={`cm-feed-card__media cm-media-open${className ? ` ${className}` : ''}`}
      aria-label="Open media fullscreen"
      onClick={open}
    >
      <PostMedia
        image={post.image}
        video={post.video}
        variant="feed"
        alt=""
        onMediaError={() => setFailed(true)}
      />
    </button>
  )
}
