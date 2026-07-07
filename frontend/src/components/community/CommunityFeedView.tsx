import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { MessageCircle } from 'lucide-react'
import { apiFetch, asArray } from '../../api/client'
import { useAuth } from '../../auth/AuthContext'
import type { FeedPost } from '../IgPostCard'
import { parseTagFromSearch } from '../../utils/communityTags'
import { communityPostPermalinkPath } from '../../utils/postPermalink'
import { type FeedKind } from './CommunityFeedKindTabs'
import { CommunityAskModal } from './CommunityAskModal'
import { CommunityFeedToolbar } from './CommunityFeedToolbar'
import { CommunityQuestionFeedCard } from './CommunityQuestionFeedCard'
import { CommunityTipFeedCard } from './CommunityTipFeedCard'
import { CommunityTipModal } from './CommunityTipModal'
import { EmptyState } from '../ui'
import './community-feed-cards.css'
import './communityHub.css'

export type FeedFilter = FeedKind
export type ComposeModal = 'ask' | 'tip' | null

function feedQueryPath(region: string | undefined, filter: FeedKind, tag?: string) {
  const params = new URLSearchParams({ kind: filter })
  if (region) params.set('region', region)
  if (tag) params.set('tag', tag)
  return `/api/social/feed/?${params}`
}

function matchesSearch(post: FeedPost, query: string): boolean {
  if (parseTagFromSearch(query)) return true
  if (!query.trim()) return true
  const hay = `${post.body} ${post.place_label ?? ''} ${post.author.display_name} ${post.author.username}`.toLowerCase()
  return hay.includes(query.trim().toLowerCase())
}

type Props = {
  searchQuery: string
  tagSlug?: string
}

export function CommunityFeedView({ searchQuery, tagSlug = '' }: Props) {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const region = profile?.region?.trim()
  const [searchParams, setSearchParams] = useSearchParams()
  const [kind, setKind] = useState<FeedKind>('question')
  const [composeModal, setComposeModal] = useState<ComposeModal>(null)
  const [highlightId, setHighlightId] = useState<number | null>(null)
  const [toast, setToast] = useState('')

  const postedId = searchParams.get('posted')
  const postedTipId = searchParams.get('postedTip')
  const openId = searchParams.get('open')
  const activeTag = tagSlug
  const feedQueryKey = ['feed', region ?? '', kind, activeTag] as const

  const { data: feedRaw, isLoading } = useQuery({
    queryKey: feedQueryKey,
    queryFn: () =>
      apiFetch<FeedPost[]>(feedQueryPath(region, kind, activeTag || undefined), { auth: Boolean(profile) }),
  })

  const posts = useMemo(() => {
    const rows = asArray<FeedPost>(feedRaw)
    return rows.filter((post) => matchesSearch(post, searchQuery))
  }, [feedRaw, searchQuery])

  useEffect(() => {
    if (!postedId) return
    const id = Number(postedId)
    if (!Number.isFinite(id)) return
    setKind('question')
    setHighlightId(id)
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
    setKind('tip')
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
    setSearchParams((params) => {
      const next = new URLSearchParams(params)
      next.delete('open')
      return next
    }, { replace: true })
    navigate(communityPostPermalinkPath(id))
  }, [openId, navigate, setSearchParams])

  const emptyTitle =
    kind === 'question'
      ? activeTag
        ? searchQuery.trim()
          ? 'No matching questions'
          : `No questions with #${activeTag}`
        : searchQuery.trim()
          ? 'No matching questions'
          : 'No questions yet'
      : activeTag
        ? searchQuery.trim()
          ? 'No matching tips'
          : `No tips with #${activeTag}`
        : searchQuery.trim()
          ? 'No matching tips'
          : 'No tips yet'

  const emptySub =
    kind === 'question'
      ? 'Ask locals about safety, prices, routes, and more.'
      : 'Share practical advice for travellers in your area.'

  const openCompose = (modal: Exclude<ComposeModal, null>) => {
    if (!profile) {
      navigate('/login')
      return
    }
    setComposeModal(modal)
  }

  const handleAskPosted = (post: FeedPost) => {
    setKind('question')
    setHighlightId(post.id)
    setToast('Your question was posted.')
    window.setTimeout(() => {
      document.getElementById(`community-post-${post.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 350)
    window.setTimeout(() => {
      setToast('')
      setHighlightId(null)
    }, 4200)
  }

  const handleTipPosted = (post: FeedPost) => {
    setKind('tip')
    setHighlightId(post.id)
    setToast('Your tip was shared.')
    window.setTimeout(() => {
      document.getElementById(`community-post-${post.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 350)
    window.setTimeout(() => {
      setToast('')
      setHighlightId(null)
    }, 4200)
  }

  const emptyCta =
    kind === 'question'
      ? profile
        ? { label: 'Ask a question', onClick: () => openCompose('ask') }
        : { label: 'Sign in', to: '/login' }
      : profile
        ? { label: 'Share a tip', onClick: () => openCompose('tip') }
        : { label: 'Sign in', to: '/login' }

  return (
    <>
      <CommunityFeedToolbar
        kind={kind}
        onKindChange={setKind}
        onAskClick={() => openCompose('ask')}
        onTipClick={() => openCompose('tip')}
      />

      <CommunityAskModal
        open={composeModal === 'ask'}
        onClose={() => setComposeModal(null)}
        onPosted={handleAskPosted}
      />

      <CommunityTipModal
        open={composeModal === 'tip'}
        onClose={() => setComposeModal(null)}
        onPosted={handleTipPosted}
      />

      {toast ? (
        <p className="cm-simple__toast" role="status">
          {toast}
        </p>
      ) : null}

      {isLoading ? (
        <div className="cm-feed-skeleton" aria-hidden>
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton cm-feed-skeleton__card cm-feed-skeleton__card--rounded" />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <EmptyState
          iconElement={<MessageCircle size={28} strokeWidth={2} aria-hidden />}
          title={emptyTitle}
          sub={emptySub}
          cta={emptyCta}
        />
      ) : (
        <ul className="cm-feed-list cm-feed-list--cards">
          {posts.map((post) => (
            <li key={post.id}>
              {kind === 'question' ? (
                <CommunityQuestionFeedCard post={post} highlighted={highlightId === post.id} />
              ) : (
                <CommunityTipFeedCard post={post} highlighted={highlightId === post.id} />
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
