import { Link } from 'react-router-dom'
import { Camera, Copy, Play } from 'lucide-react'
import { useListingMoments } from '../../hooks/useListingMoments'
import { isRealPostId } from '../../utils/postPermalink'
import { listingSeeAllPath } from '../../utils/listingSeeAll'
import { ListingSection } from './ListingSection'
import { useListingMomentsViewer } from './useListingMomentsViewer'
import './listing-detail.css'

type Props = {
  listingType: string
  listingId: string | number
  listingTitle: string
  title?: string
  maxVisible?: number
  emptyMessage?: string
  showWhenEmpty?: boolean
  className?: string
}

export function ListingDelversMoments({
  listingType,
  listingId,
  listingTitle,
  title = 'From Delvers',
  maxVisible = 8,
  emptyMessage = 'No moments yet.',
  showWhenEmpty = false,
  className = '',
}: Props) {
  const { data: moments = [], isLoading } = useListingMoments(listingType, listingId, listingTitle)
  const { openMoment, overlay } = useListingMomentsViewer(['listing-moments', listingType, listingId])

  if (isLoading) {
    if (!showWhenEmpty) return null
    return (
      <ListingSection title={title} className={`listing-moments ${className}`.trim()}>
        <p className="listing-moments__empty" role="status">Loading moments…</p>
      </ListingSection>
    )
  }

  if (moments.length === 0 && !showWhenEmpty) return null

  const visible = moments.slice(0, maxVisible)
  const momentsPath = listingSeeAllPath(listingType, listingId, 'moments')

  return (
    <>
      <ListingSection
        title={title}
        action={
          moments.length > 0 ? (
            <Link className="listing-section__link" to={momentsPath}>
              See all
            </Link>
          ) : null
        }
        className={`listing-moments ${className}`.trim()}
      >
        {visible.length > 0 ? (
          <div className="listing-moments__strip">
            {visible.map((moment) => {
              const hasMedia =
                Boolean(moment.image) || Boolean(moment.video) || (moment.media?.length ?? 0) > 0
              const canOpen = hasMedia || isRealPostId(moment.id)
              const isVideoThumb = moment.kind === 'video'
              const isCarousel = (moment.media?.length ?? 0) > 1
              return (
                <article key={moment.id} className="listing-moments__card">
                  {canOpen ? (
                    <button
                      type="button"
                      className="listing-moments__thumb listing-moments__thumb--btn"
                      onClick={() => openMoment(moments, moment.id)}
                      aria-label={`View moment by @${moment.author}`}
                    >
                      {moment.image ? (
                        isVideoThumb ? (
                          <video
                            className="listing-moments__video"
                            src={`${moment.image}#t=0.1`}
                            muted
                            playsInline
                            preload="metadata"
                            tabIndex={-1}
                          />
                        ) : (
                          <img src={moment.image} alt="" loading="lazy" decoding="async" />
                        )
                      ) : (
                        <div className="listing-moments__placeholder" aria-hidden>
                          <Camera size={22} strokeWidth={1.75} />
                        </div>
                      )}
                      {isCarousel ? (
                        <span className="listing-moments__badge" aria-hidden>
                          <Copy size={14} strokeWidth={2.25} />
                        </span>
                      ) : isVideoThumb ? (
                        <span className="listing-moments__badge listing-moments__badge--play" aria-hidden>
                          <Play size={14} strokeWidth={2.5} fill="currentColor" />
                        </span>
                      ) : null}
                    </button>
                  ) : (
                    <div className="listing-moments__thumb">
                      <div className="listing-moments__placeholder" aria-hidden>
                        <Camera size={22} strokeWidth={1.75} />
                      </div>
                    </div>
                  )}
                  <p className="listing-moments__body">
                    <strong>@{moment.author}</strong> {moment.body}
                    {moment.taggedListing ? (
                      <span className="listing-moments__tag">@{moment.taggedListing}</span>
                    ) : null}
                  </p>
                </article>
              )
            })}
          </div>
        ) : (
          <p className="listing-moments__empty" role="status">
            {emptyMessage}
          </p>
        )}
      </ListingSection>
      {overlay}
    </>
  )
}
