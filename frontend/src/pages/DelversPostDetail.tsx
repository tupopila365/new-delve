import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Compass } from 'lucide-react'
import { apiFetch } from '../api/client'
import type { FeedPost } from '../components/IgPostCard'
import { ProfilePostViewer } from '../components/profile'
import { EmptyState } from '../components/ui'
import { communityPostPermalinkPath, feedPostPermalinkPath } from '../utils/postPermalink'
import { isDelversPost } from '../utils/postFilters'

type Props = {
  fallbackPath?: string
}

function isDelversSwipePost(post: FeedPost): boolean {
  return isDelversPost(post) && post.post_kind !== 'question'
}

export function DelversPostDetail({ fallbackPath = '/delvers' }: Props) {
  const { id: idParam } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const postId = Number(idParam)
  const [viewerIndex, setViewerIndex] = useState(0)
  const isDelversViewer = fallbackPath === '/delvers'

  const { data: post, isLoading, isError } = useQuery({
    queryKey: ['post', postId],
    queryFn: () => apiFetch<FeedPost>(`/api/social/posts/${postId}/`),
    enabled: Number.isFinite(postId) && postId > 0,
    retry: false,
  })

  const { data: similar = [] } = useQuery({
    queryKey: ['post-similar', postId, isDelversViewer],
    queryFn: () =>
      apiFetch<FeedPost[]>(
        `/api/social/posts/${postId}/similar/${isDelversViewer ? '?context=delvers' : ''}`,
      ),
    enabled: Number.isFinite(postId) && postId > 0 && Boolean(post),
  })

  useEffect(() => {
    if (!post || !isDelversViewer) return
    if (!isDelversSwipePost(post)) {
      navigate(communityPostPermalinkPath(post.id), { replace: true })
    }
  }, [post, isDelversViewer, navigate])

  const viewerPosts = useMemo(() => {
    if (!post) return []
    const start = isDelversViewer && !isDelversSwipePost(post) ? [] : [post]
    const seen = new Set<number>(start.map((item) => item.id))
    const merged: FeedPost[] = [...start]
    for (const item of similar) {
      if (isDelversViewer && !isDelversSwipePost(item)) continue
      if (seen.has(item.id)) continue
      seen.add(item.id)
      merged.push(item)
    }
    return merged
  }, [post, similar, isDelversViewer])

  useEffect(() => {
    setViewerIndex(0)
  }, [postId])

  const close = () => {
    if (window.history.length > 1) {
      navigate(-1)
      return
    }
    navigate(fallbackPath)
  }

  const backLabel = fallbackPath === '/community' ? 'Back to Ask locals' : 'Back to Delvers'

  const handleViewerChange = (nextIndex: number) => {
    setViewerIndex(nextIndex)
    const next = viewerPosts[nextIndex]
    if (next && next.id !== postId) {
      window.history.replaceState(null, '', feedPostPermalinkPath(next))
    }
  }

  if (!Number.isFinite(postId) || postId <= 0) {
    return (
      <div className="ds-page" style={{ padding: 24 }}>
        <EmptyState
          iconElement={<Compass size={28} strokeWidth={2} aria-hidden />}
          title="Invalid post link"
          sub="This link does not point to a valid post."
          cta={{ label: backLabel, onClick: () => navigate(fallbackPath) }}
        />
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="ds-page" style={{ padding: 24 }}>
        <p className="ds-loading" role="status">Loading post…</p>
      </div>
    )
  }

  if (isError || !post) {
    return (
      <div className="ds-page" style={{ padding: 24 }}>
        <EmptyState
          iconElement={<Compass size={28} strokeWidth={2} aria-hidden />}
          title="Post not found"
          sub="It may have been removed, hidden, or you do not have permission to view it."
          cta={{ label: backLabel, onClick: () => navigate(fallbackPath) }}
        />
        <p style={{ textAlign: 'center', marginTop: 16 }}>
          <Link to={fallbackPath}>{fallbackPath === '/community' ? 'Back to Ask locals' : 'Explore Delvers'}</Link>
        </p>
      </div>
    )
  }

  if (isDelversViewer && !isDelversSwipePost(post)) {
    return (
      <div className="ds-page" style={{ padding: 24 }}>
        <p className="ds-loading" role="status">Opening community post…</p>
      </div>
    )
  }

  return (
    <ProfilePostViewer
      posts={viewerPosts}
      index={viewerIndex}
      onClose={close}
      onChange={handleViewerChange}
      queryKey={['post', viewerPosts[viewerIndex]?.id ?? postId]}
    />
  )
}
