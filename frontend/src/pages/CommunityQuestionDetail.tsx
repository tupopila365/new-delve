import { Link } from 'react-router-dom'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Compass } from 'lucide-react'
import { apiFetch } from '../api/client'
import type { FeedPost } from '../components/IgPostCard'
import { CommunityQuestionThread, CommunityTipCard } from '../components/community/CommunityQuestionThread'
import { EmptyState } from '../components/ui'
import './CommunityQuestionDetail.css'

export function CommunityQuestionDetail() {
  const { id: idParam } = useParams<{ id: string }>()
  const postId = Number(idParam)
  const feedQueryKey = ['feed'] as const

  const { data: post, isLoading, isError } = useQuery({
    queryKey: ['post', postId],
    queryFn: () => apiFetch<FeedPost>(`/api/social/posts/${postId}/`),
    enabled: Number.isFinite(postId) && postId > 0,
    retry: false,
  })

  const isQuestion = post?.post_kind === 'question'

  if (!Number.isFinite(postId) || postId <= 0) {
    return (
      <main className="cm-question-page">
        <EmptyState
          iconElement={<Compass size={28} strokeWidth={2} aria-hidden />}
          title="Invalid post link"
          sub="This link does not point to a valid community post."
          cta={{ label: 'Back to Community', to: '/community' }}
        />
      </main>
    )
  }

  if (isLoading) {
    return (
      <main className="cm-question-page">
        <p role="status">Loading…</p>
      </main>
    )
  }

  if (isError || !post) {
    return (
      <main className="cm-question-page">
        <EmptyState
          iconElement={<Compass size={28} strokeWidth={2} aria-hidden />}
          title="Post not found"
          sub="It may have been removed or you do not have permission to view it."
          cta={{ label: 'Back to Community', to: '/community' }}
        />
      </main>
    )
  }

  return (
    <main className="cm-question-page">
      <Link to="/community" className="cm-question-page__back">
        <ArrowLeft size={18} strokeWidth={2.25} aria-hidden />
        Community
      </Link>

      {isQuestion ? (
        <CommunityQuestionThread post={post} queryKey={feedQueryKey} defaultOpen highlighted />
      ) : (
        <CommunityTipCard post={post} queryKey={feedQueryKey} defaultOpen highlighted />
      )}
    </main>
  )
}
