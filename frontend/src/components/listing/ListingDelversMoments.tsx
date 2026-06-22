import { Link } from 'react-router-dom'
import { Camera } from 'lucide-react'
import { listingSeeAllPath } from '../../utils/listingSeeAll'
import { ListingSection } from './ListingSection'
import type { ListingMomentItem } from './types'
import { useListingMomentsViewer } from './useListingMomentsViewer'
import './listing-detail.css'

type Props = {
  moments: ListingMomentItem[]
  listingType: string
  listingId: string | number
  title?: string
  maxVisible?: number
  emptyMessage?: string
  showWhenEmpty?: boolean
  className?: string
}

export function ListingDelversMoments({
  moments,
  listingType,
  listingId,
  title = 'From Delvers',
  maxVisible = 8,
  emptyMessage = 'No moments yet.',
  showWhenEmpty = false,
  className = '',
}: Props) {
  const { openMoment, overlay } = useListingMomentsViewer(['listing-moments', listingType, listingId])

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
            {visible.map((moment) => (
              <article key={moment.id} className="listing-moments__card">
                {moment.image ? (
                  <button
                    type="button"
                    className="listing-moments__thumb listing-moments__thumb--btn"
                    onClick={() => openMoment(moments, moment.id)}
                    aria-label={`View photo by @${moment.author}`}
                  >
                    <img src={moment.image} alt="" loading="lazy" decoding="async" />
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
            ))}
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
