import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Compass } from 'lucide-react'
import { apiFetch, asArray, mediaUrl } from '../../api/client'
import type { FeedPost } from '../IgPostCard'
import { isDelversPost } from '../../utils/postFilters'
import { postPermalinkPath } from '../../utils/postPermalink'
import { BusinessProfileSection } from './BusinessProfileSection'

type Props = {
  ownerUsername: string
  businessName: string
}

export function BusinessTeamPosts({ ownerUsername, businessName }: Props) {
  const { data: postsRaw, isLoading } = useQuery({
    queryKey: ['user-posts', ownerUsername],
    queryFn: () =>
      apiFetch<FeedPost[]>(`/api/social/users/${encodeURIComponent(ownerUsername)}/posts/`, { auth: false }),
    enabled: Boolean(ownerUsername),
  })

  const delversPosts = asArray<FeedPost>(postsRaw).filter(isDelversPost).slice(0, 6)

  if (isLoading) {
    return (
      <BusinessProfileSection title="From the team">
        <div className="skeleton biz-profile__sk" />
      </BusinessProfileSection>
    )
  }

  if (delversPosts.length === 0) return null

  return (
    <BusinessProfileSection title="From the team">
      <div className="biz-profile__team-head">
        <p className="biz-profile__team-sub">
          Delvers moments from the team behind {businessName}.
        </p>
        <Link className="biz-profile__section-link" to={`/u/${encodeURIComponent(ownerUsername)}`}>
          @{ownerUsername}
        </Link>
      </div>
      <div className="biz-profile__team-strip">
        {delversPosts.map((post) => {
          const thumb = post.image ? mediaUrl(post.image) : post.video ? mediaUrl(post.video) : null
          const preview = post.body?.trim() || 'Travel moment'
          return (
            <Link
              key={post.id}
              to={postPermalinkPath(post.id)}
              className="biz-profile__team-card"
              aria-label={`View post: ${preview.slice(0, 60)}`}
            >
              {thumb ? (
                <img src={thumb} alt="" loading="lazy" />
              ) : (
                <span className="biz-profile__team-card--text" aria-hidden>
                  <Compass size={22} strokeWidth={2} />
                </span>
              )}
              <span className="biz-profile__team-card__body">{preview.slice(0, 72)}</span>
            </Link>
          )
        })}
      </div>
    </BusinessProfileSection>
  )
}
