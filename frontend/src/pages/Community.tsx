import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { MessageCircle, Plus } from 'lucide-react'
import { apiFetch, asArray } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import type { FeedPost } from '../components/IgPostCard'
import { IgPostCard } from '../components/IgPostCard'
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

export function Community({ embedded = false }: CommunityProps = {}) {
  const { profile } = useAuth()
  const region = profile?.region?.trim()
  const [filter, setFilter] = useState<FeedFilter>('all')

  const { data: feedRaw, isLoading } = useQuery({
    queryKey: ['feed', region ?? '', filter],
    queryFn: () => apiFetch<FeedPost[]>(feedQueryPath(region, filter), { auth: Boolean(profile) }),
  })

  const posts = asArray<FeedPost>(feedRaw)
  const askHref = profile ? '/create/ask' : '/login'
  const tipHref = profile ? '/create/post' : '/login'

  return (
    <div className={`cm-simple${embedded ? ' cm-simple--embedded' : ''}`}>
      <div className="cm-simple__panel">
        <div className="cm-feed-cta">
          <div>
            <h2 className="cm-feed-cta__title">Ask locals</h2>
            <p className="cm-feed-cta__sub">
              Travel tips, questions, and local advice from people near you.
            </p>
          </div>
          <div className="cm-feed-cta__actions">
            <Link to={askHref} className="btn btn-primary cm-feed-cta__btn">
              <Plus size={16} strokeWidth={2.5} aria-hidden />
              Ask a question
            </Link>
            <Link to={tipHref} className="btn btn-ghost cm-feed-cta__btn cm-feed-cta__btn--secondary">
              Share a tip
            </Link>
          </div>
        </div>

        <section className="cm-ask-cta" aria-label="Ask a question">
          <p className="cm-ask-cta__copy">
            Ask anything about a place. Locals and travellers answer in plain language.
          </p>
          <Link to={askHref} className="cm-ask-cta__link">
            {profile ? 'Write your question' : 'Sign in to ask'}
          </Link>
        </section>

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

        <p className="cm-simple__count" role="status">
          {isLoading ? 'Loading feed…' : `${posts.length} ${posts.length === 1 ? 'post' : 'posts'}`}
        </p>

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
                ? 'Ask about safety, routes, prices, or anything about a place.'
                : 'Share a travel tip or ask a question — posts here stay on the community feed.'
            }
            cta={
              profile
                ? {
                    label: filter === 'question' ? 'Ask a question' : 'Share a tip',
                    to: filter === 'question' ? '/create/ask' : '/create/post',
                  }
                : { label: 'Sign in', to: '/login' }
            }
          />
        ) : (
          <ul className="cm-feed-list">
            {posts.map((post) => (
              <li key={post.id}>
                <IgPostCard post={post} queryKey={['feed', region ?? '', filter]} mediaVariant="feed" />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
