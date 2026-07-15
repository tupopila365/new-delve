import { useMemo, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import { ApiError } from '../api/client'
import { fetchTagDetail, fetchTagTrending } from '../api/tags'
import { CommunityFeedView } from '../components/community/CommunityFeedView'
import { CommunityTrailShell } from '../components/community/CommunityTrailShell'
import { communityTagPath, parseTagFromSearch } from '../utils/communityTags'
import { normalizeTag } from '../utils/hashtags'
import './CommunityPage.css'

export function CommunityTag() {
  const navigate = useNavigate()
  const { slug: rawSlug } = useParams()
  const tagSlug = normalizeTag(rawSlug ?? '')
  const [searchQuery, setSearchQuery] = useState('')

  const tagQuery = useQuery({
    queryKey: ['tag-detail', tagSlug],
    queryFn: () => fetchTagDetail(tagSlug),
    enabled: Boolean(tagSlug),
    retry: (_, error) => !(error instanceof ApiError && error.status === 404),
  })

  const trendingQuery = useQuery({
    queryKey: ['tags-trending', 'community'],
    queryFn: () => fetchTagTrending('community', 12),
  })

  const relatedTags = useMemo(() => {
    return (trendingQuery.data ?? []).filter((row) => row.slug !== tagSlug).slice(0, 8)
  }, [trendingQuery.data, tagSlug])

  if (!tagSlug) {
    return <Navigate to="/community" replace />
  }

  const shellProps = {
    title: `#${tagSlug}`,
    kicker: 'Tag',
    lead: tagQuery.isLoading
      ? 'Loading tag…'
      : tagQuery.data
        ? `${tagQuery.data.post_count === 1 ? '1 post' : `${tagQuery.data.post_count} posts`} on this tag.`
        : 'Browse posts for this tag.',
    searchValue: searchQuery,
    onSearchChange: setSearchQuery,
    onSearchEnter: (value: string) => {
      const slug = parseTagFromSearch(value)
      if (slug) navigate(communityTagPath(slug))
    },
  }

  if (tagQuery.isError && tagQuery.error instanceof ApiError && tagQuery.error.status === 404) {
    return (
      <CommunityTrailShell {...shellProps} showSearch={false} lead="This tag isn’t available.">
        <div className="cm-tag-page">
          <button type="button" className="cm-tag-page__back" onClick={() => navigate('/community')}>
            <ArrowLeft size={18} strokeWidth={2.25} aria-hidden />
            Community
          </button>
          <div className="cm-tag-page__empty">
            <h2>Tag not found</h2>
            <p>#{rawSlug} doesn&apos;t exist or isn&apos;t available.</p>
            <Link to="/community" className="cm-trail-btn">
              Back to feed
            </Link>
          </div>
        </div>
      </CommunityTrailShell>
    )
  }

  const tag = tagQuery.data
  const postLabel = tag?.post_count === 1 ? '1 post' : `${tag?.post_count ?? 0} posts`

  return (
    <CommunityTrailShell {...shellProps}>
      <div className="cm-tag-page">
        <button type="button" className="cm-tag-page__back" onClick={() => navigate('/community')}>
          <ArrowLeft size={18} strokeWidth={2.25} aria-hidden />
          Community
        </button>

        <header className="cm-tag-page__header">
          <p className="cm-tag-page__meta">
            {tagQuery.isLoading ? 'Loading…' : postLabel}
            {tag?.use_count ? ` · used ${tag.use_count.toLocaleString()} times` : null}
          </p>
        </header>

        {relatedTags.length > 0 ? (
          <div className="cm-tag-page__related" aria-label="Related tags">
            {relatedTags.map((row) => (
              <Link key={row.slug} to={communityTagPath(row.slug)} className="cm-tag-page__chip">
                #{row.slug}
              </Link>
            ))}
          </div>
        ) : null}

        <CommunityFeedView searchQuery={searchQuery} tagSlug={tagSlug} />
      </div>
    </CommunityTrailShell>
  )
}
