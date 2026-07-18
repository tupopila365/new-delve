import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, Bookmark, Play, ThumbsUp } from 'lucide-react'
import { mediaUrl } from '../../api/client'
import { MediaLightbox } from '../media/MediaLightbox'
import type { ListingGalleryItem } from '../listing/types'
import { categoryLabel, delveSearchUrl, type TossLocation, type TossMedia } from '../../utils/coinToss'
import './coin-toss.css'

type TossSpotDetailProps = {
  spot: TossLocation
  kicker?: string
  onVote?: () => void
  voteBusy?: boolean
  voteMessage?: string | null
  canVote?: boolean
  onSave?: () => void
  saveBusy?: boolean
  canSave?: boolean
  /** When true, Save control is always shown as Saved (list context). */
  forceSaved?: boolean
}

function toGalleryItems(media: TossMedia[] | undefined): ListingGalleryItem[] {
  if (!media?.length) return []
  return media
    .map((m) => {
      const src = mediaUrl(m.url) ?? m.url
      if (!src) return null
      return { src, kind: m.kind === 'video' ? ('video' as const) : ('image' as const) }
    })
    .filter((item): item is ListingGalleryItem => item != null)
}

export function TossSpotDetail({
  spot,
  kicker,
  onVote,
  voteBusy,
  voteMessage,
  canVote,
  onSave,
  saveBusy,
  canSave,
  forceSaved,
}: TossSpotDetailProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const gallery = toGalleryItems(spot.media)
  const saved = forceSaved || Boolean(spot.saved_by_me)

  return (
    <article className="coin-toss-card__result coin-toss-card__result--static">
      {kicker ? <p className="coin-toss-card__result-kicker">{kicker}</p> : null}
      <h2 className="coin-toss-card__result-name">{spot.name}</h2>
      <p className="coin-toss-card__result-meta">
        <span>{categoryLabel(spot)}</span>
        {spot.city ? <span>{spot.city}</span> : null}
        {spot.region && spot.region !== spot.city ? <span>{spot.region}</span> : null}
        {typeof spot.upvote_count === 'number' ? (
          <span>
            {spot.upvote_count} upvote{spot.upvote_count === 1 ? '' : 's'}
          </span>
        ) : null}
      </p>
      {spot.description ? <p className="coin-toss-card__result-desc">{spot.description}</p> : null}

      {gallery.length > 0 ? (
        <div className="coin-toss-card__media" aria-label="Photos and videos from Delvers">
          {gallery.map((item, index) => (
            <button
              key={`${item.src}-${index}`}
              type="button"
              className="coin-toss-card__media-thumb"
              onClick={() => setLightboxIndex(index)}
              aria-label={item.kind === 'video' ? 'Open video' : 'Open photo'}
            >
              {item.kind === 'video' ? (
                <>
                  <video src={item.src} muted playsInline preload="metadata" />
                  <span className="coin-toss-card__media-play" aria-hidden>
                    <Play size={16} strokeWidth={2.5} fill="currentColor" />
                  </span>
                </>
              ) : (
                <img src={item.src} alt="" loading="lazy" />
              )}
            </button>
          ))}
        </div>
      ) : null}

      <div className="coin-toss-card__result-actions">
        <Link className="coin-toss-card__map" to={delveSearchUrl(spot.name)}>
          Open in Delve
          <ArrowUpRight size={15} strokeWidth={2.25} aria-hidden />
        </Link>
        {onSave ? (
          canSave ? (
            <button
              type="button"
              className={`coin-toss-card__save${saved ? ' is-saved' : ''}`}
              onClick={onSave}
              disabled={saveBusy}
              aria-pressed={saved}
            >
              <Bookmark size={15} strokeWidth={2.25} fill={saved ? 'currentColor' : 'none'} aria-hidden />
              {saveBusy ? 'Saving…' : saved ? 'Saved' : 'Save'}
            </button>
          ) : (
            <Link className="coin-toss-card__save" to="/login?next=/coin-toss">
              <Bookmark size={15} strokeWidth={2.25} aria-hidden />
              Save
            </Link>
          )
        ) : null}
        {onVote ? (
          canVote ? (
            <button type="button" className="coin-toss-card__vote" onClick={onVote} disabled={voteBusy}>
              <ThumbsUp size={14} strokeWidth={2.25} aria-hidden />
              {voteBusy ? 'Checking…' : 'I’m here — upvote'}
            </button>
          ) : (
            <Link className="coin-toss-card__vote" to="/login?next=/coin-toss">
              <ThumbsUp size={14} strokeWidth={2.25} aria-hidden />
              Sign in to upvote
            </Link>
          )
        ) : null}
      </div>

      {voteMessage ? <p className="coin-toss-card__vote-msg">{voteMessage}</p> : null}

      {lightboxIndex !== null && gallery.length > 0 ? (
        <MediaLightbox
          items={gallery}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onChange={setLightboxIndex}
          label={`${spot.name} media`}
        />
      ) : null}
    </article>
  )
}
