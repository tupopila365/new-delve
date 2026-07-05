import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { MessageCircle, Plus, X } from 'lucide-react'
import { apiFetch, asArray } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import type { FeedPost } from '../components/IgPostCard'
import { CommunityQuestionThread, CommunityTipCard } from '../components/community/CommunityQuestionThread'
import { EmptyState } from '../components/ui'
import './CommunityPage.css'

type CommunityProps = {
  embedded?: boolean
}

type FeedFilter = 'all' | 'question' | 'tip'

function feedQueryPath(region: string | undefined, filter: FeedFilter) {
  const params = new URLSearchParams()
  if (region) params.set('region', region)
  if (filter !== 'all') params.set('kind', filter)
  const qs = params.toString()
  return `/api/social/feed/${qs ? `?${qs}` : ''}`
}

function isQuestionPost(post: FeedPost): boolean {
  return post.post_kind === 'question'
}

export function Community({ embedded = false }: CommunityProps = {}) {
  const { profile } = useAuth()
  const region = profile?.region?.trim()
  const [searchParams, setSearchParams] = useSearchParams()
  const [filter, setFilter] = useState<FeedFilter>('all')
  const [toast, setToast] = useState('')
  const [highlightId, setHighlightId] = useState<number | null>(null)
  const [openThreadId, setOpenThreadId] = useState<number | null>(null)

  const postedId = searchParams.get('posted')
  const postedTipId = searchParams.get('postedTip')
  const openId = searchParams.get('open')
  const tagFilter = searchParams.get('tag')?.trim().toLowerCase() ?? ''
  const feedQueryKey = ['feed', region ?? '', filter] as const

  const { data: feedRaw, isLoading } = useQuery({
    queryKey: feedQueryKey,
    queryFn: () => apiFetch<FeedPost[]>(feedQueryPath(region, filter), { auth: Boolean(profile) }),
  })

  const posts = useMemo(() => {
    const rows = asArray<FeedPost>(feedRaw)
    if (!tagFilter) return rows
    return rows.filter((post) => post.body.toLowerCase().includes(`#${tagFilter}`))
  }, [feedRaw, tagFilter])

  useEffect(() => {
    if (!postedId) return
    const id = Number(postedId)
    if (!Number.isFinite(id)) return
    setFilter('question')
    setHighlightId(id)
    setOpenThreadId(id)
    setToast('Your question was posted.')
    setSearchParams((params) => {
      const next = new URLSearchParams(params)
      next.delete('posted')
      return next
    }, { replace: true })
    window.setTimeout(() => {
      document.getElementById(`community-post-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 350)
    const timer = window.setTimeout(() => {
      setToast('')
      setHighlightId(null)
    }, 4200)
    return () => window.clearTimeout(timer)
  }, [postedId, setSearchParams])

  useEffect(() => {
    if (!postedTipId) return
    const id = Number(postedTipId)
    if (!Number.isFinite(id)) return
    setFilter('tip')
    setHighlightId(id)
    setToast('Your tip was shared.')
    setSearchParams((params) => {
      const next = new URLSearchParams(params)
      next.delete('postedTip')
      return next
    }, { replace: true })
    window.setTimeout(() => {
      document.getElementById(`community-post-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 350)
    const timer = window.setTimeout(() => {
      setToast('')
      setHighlightId(null)
    }, 4200)
    return () => window.clearTimeout(timer)
  }, [postedTipId, setSearchParams])

  useEffect(() => {
    if (!openId) return
    const id = Number(openId)
    if (!Number.isFinite(id)) return
    setFilter('question')
    setOpenThreadId(id)
    setSearchParams((params) => {
      const next = new URLSearchParams(params)
      next.delete('open')
      return next
    }, { replace: true })
    window.setTimeout(() => {
      document.getElementById(`community-post-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 300)
  }, [openId, setSearchParams])

  const askHref = profile ? '/create/ask' : '/login'
  const tipHref = profile ? '/create/tip' : '/login'

  const clearTag = () => {
    setSearchParams((params) => {
      const next = new URLSearchParams(params)
      next.delete('tag')
      return next
    }, { replace: true })
  }

  return (
    <div className={`cm-simple${embedded ? ' cm-simple--embedded' : ''}`}>
      <div className="cm-simple__panel">
        {toast ? (
          <p className="cm-simple__toast" role="status">
            {toast}
          </p>
        ) : null}

        <header className="cm-feed-cta">
          <h1 className="cm-feed-cta__title">Ask locals</h1>
          <div className="cm-feed-cta__actions">
            <Link to={askHref} className="btn btn-primary cm-feed-cta__btn">
              <Plus size={16} strokeWidth={2.5} aria-hidden />
              Ask a question
            </Link>
            <Link to={tipHref} className="btn btn-ghost cm-feed-cta__btn cm-feed-cta__btn--secondary">
              Share a tip
            </Link>
          </div>
        </header>

        <div className="cm-feed-filters" role="tablist" aria-label="Community feed filters">
          {(
            [
              { id: 'all', label: 'All' },
              { id: 'question', label: 'Questions' },
              { id: 'tip', label: 'Tips' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={filter === tab.id}
              className={filter === tab.id ? 'is-active' : ''}
              onClick={() => setFilter(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {tagFilter ? (
          <div className="cm-feed-tag">
            <span>Showing #{tagFilter}</span>
            <button type="button" onClick={clearTag} aria-label="Clear hashtag filter">
              <X size={14} strokeWidth={2.25} aria-hidden />
            </button>
          </div>
        ) : null}

        {isLoading ? (
          <div className="cm-feed-skeleton" aria-hidden>
            {[0, 1, 2].map((i) => (
              <div key={i} className="skeleton cm-feed-skeleton__card" />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <EmptyState
            iconElement={<MessageCircle size={28} strokeWidth={2} aria-hidden />}
            title={filter === 'question' ? 'No questions yet' : 'No community posts yet'}
            sub={
              filter === 'question'
                ? 'Be the first to ask about a place.'
                : 'Share a tip or ask a question.'
            }
            cta={
              profile
                ? {
                    label: filter === 'question' ? 'Ask a question' : 'Share a tip',
                    to: filter === 'question' ? '/create/ask' : '/create/tip',
                  }
                : { label: 'Sign in', to: '/login' }
            }
          />
        ) : (
          <ul className="cm-feed-list cm-feed-list--threads">
            {posts.map((post) => (
              <li
                key={post.id}
                id={`community-post-${post.id}`}
                className={highlightId === post.id ? 'cm-feed-list__item--highlight' : undefined}
              >
                {isQuestionPost(post) ? (
                  <CommunityQuestionThread
                    post={post}
                    queryKey={feedQueryKey}
                    highlighted={highlightId === post.id}
                    defaultOpen={openThreadId === post.id}
                  />
                ) : (
                  <CommunityTipCard post={post} queryKey={feedQueryKey} highlighted={highlightId === post.id} />
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
