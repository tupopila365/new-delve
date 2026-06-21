import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Image, Plus, Video } from 'lucide-react'
import { apiFetch, mediaUrl } from '../../../api/client'
import { useAuth } from '../../../auth/AuthContext'
import type { ProviderStayListing } from './stayListingTypes'

type AccommodationStory = {
  id: number
  body: string
  region: string
  image: string | null
  video: string | null
  created_at: string
  author: { username: string; display_name: string }
  listing?: { id: number; title: string } | null
}

type Props = {
  listings: ProviderStayListing[]
}

export function StayStoriesPanel({ listings }: Props) {
  const { profile } = useAuth()

  const { data: stories = [], isLoading } = useQuery({
    queryKey: ['provider-accommodation-stories', profile?.username],
    enabled: Boolean(profile?.username),
    queryFn: () => apiFetch<AccommodationStory[]>('/api/social/accommodation-stories/'),
    select: (rows) => rows.filter((s) => s.author.username === profile?.username),
  })

  const createHref = (listingId?: number) => {
    const params = new URLSearchParams({ return: '/provider/stays' })
    if (listingId) params.set('listing', String(listingId))
    return `/accommodation/stories/new?${params.toString()}`
  }

  return (
    <div className="stay-stories">
      <header className="stay-stories__head">
        <div>
          <h2 className="stay-stories__title">Host stories</h2>
          <p className="stay-stories__sub">
            Short photo or video updates linked to your stays — shown in story rings on Places to stay.
          </p>
        </div>
        <Link to={createHref()} className="prov-ui__btn prov-ui__btn--primary">
          <Plus size={16} aria-hidden />
          New story
        </Link>
      </header>

      {listings.length > 0 ? (
        <div className="stay-stories__listing-picks">
          <p className="stay-stories__label">Post for a specific property</p>
          <div className="stay-stories__pick-row">
            {listings.map((l) => (
              <Link key={l.id} to={createHref(l.id)} className="stay-stories__pick">
                {l.title}
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      {isLoading ? (
        <p className="stay-stories__empty">Loading stories…</p>
      ) : stories.length === 0 ? (
        <div className="stay-stories__empty">
          <strong>No stories yet</strong>
          <p>Share room tours, weekend specials, or behind-the-scenes clips to attract more bookings.</p>
          <Link to={createHref()} className="prov-ui__link">
            Create your first story
          </Link>
        </div>
      ) : (
        <ul className="stay-stories__list">
          {stories.map((story) => {
            const thumb = story.image ? mediaUrl(story.image) : story.video ? mediaUrl(story.video) : null
            return (
              <li key={story.id} className="stay-stories__item">
                <div className="stay-stories__thumb">
                  {thumb && story.image ? (
                    <img src={thumb} alt="" />
                  ) : thumb && story.video ? (
                    <video src={thumb} muted playsInline />
                  ) : (
                    <span aria-hidden>
                      <Image size={20} />
                    </span>
                  )}
                  {story.video ? (
                    <span className="stay-stories__vid-badge" aria-hidden>
                      <Video size={12} />
                    </span>
                  ) : null}
                </div>
                <div className="stay-stories__copy">
                  <p className="stay-stories__caption">{story.body || 'No caption'}</p>
                  <p className="stay-stories__meta">
                    {story.listing ? (
                      <Link to={`/accommodation/${story.listing.id}`}>{story.listing.title}</Link>
                    ) : (
                      'No listing linked'
                    )}
                    {' · '}
                    {story.region}
                    {' · '}
                    {new Date(story.created_at).toLocaleDateString()}
                  </p>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
