import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Compass } from 'lucide-react'
import { apiFetch } from '../api/client'
import type { FeedPost } from '../components/IgPostCard'
import { CommunityQuestionThread } from '../components/community/CommunityQuestionThread'
import { EmptyState } from '../components/ui'
import './CommunityQuestionDetail.css'

export function CommunityQuestionDetail() {
  const { id: idParam } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const postId = Number(idParam)
  const feedQueryKey = ['feed'] as const

  const { data: post, isLoading, isError } = useQuery({
    queryKey: ['post', postId],
    queryFn: () => apiFetch<FeedPost>(`/api/social/posts/${postId}/`),
    enabled: Number.isFinite(postId) && postId > 0,
    retry: false,
  })

  useEffect(() => {
    if (post && post.post_kind !== 'question') {
      navigate('/community', { replace: true })
    }
  }, [post, navigate])

  if (!Number.isFinite(postId) || postId <= 0) {
    return (
      <main className="cm-question-page">
        <EmptyState
          iconElement={<Compass size={28} strokeWidth={2} aria-hidden />}
          title="Invalid question link"
          sub="This link does not point to a valid question."
          cta={{ label: 'Back to Ask locals', onClick: () => navigate('/community') }}
        />
      </main>
    )
  }

  if (isLoading) {
    return (
      <main className="cm-question-page">
        <p role="status">Loading question…</p>
      </main>
    )
  }

  if (isError || !post) {
    return (
      <main className="cm-question-page">
        <EmptyState
          iconElement={<Compass size={28} strokeWidth={2} aria-hidden />}
          title="Question not found"
          sub="It may have been removed or you do not have permission to view it."
          cta={{ label: 'Back to Ask locals', onClick: () => navigate('/community') }}
        />
      </main>
    )
  }

  return (
    <main className="cm-question-page">
      <CommunityQuestionThread post={post} queryKey={feedQueryKey} defaultOpen highlighted />
    </main>
  )
}
