import { Camera } from 'lucide-react'
import type { ListingMomentItem } from './types'
import { useListingMomentsViewer } from './useListingMomentsViewer'

type Props = {
  moments: ListingMomentItem[]
  emptyMessage?: string
  queryKey?: unknown[]
}

export function ListingSeeAllMomentsView({
  moments,
  emptyMessage = 'No Delvers moments yet.',
  queryKey = ['listing-moments-see-all'],
}: Props) {
  const { openMoment, overlay } = useListingMomentsViewer(queryKey)

  if (moments.length === 0) {
    return (
      <p className="listing-see-all__muted" role="status">
        {emptyMessage}
      </p>
    )
  }

  return (
    <>
      <div className="listing-see-all__moments">
        {moments.map((moment) => (
          <article key={moment.id} className="listing-see-all__moment">
            {moment.image ? (
              <button
                type="button"
                className="listing-see-all__moment-thumb listing-see-all__moment-thumb--btn"
                onClick={() => openMoment(moments, moment.id)}
                aria-label={`View photo by @${moment.author}`}
              >
                <img src={moment.image} alt="" loading="lazy" decoding="async" />
              </button>
            ) : (
              <div className="listing-see-all__moment-thumb">
                <div className="listing-see-all__moment-ph" aria-hidden>
                  <Camera size={20} strokeWidth={1.75} />
                </div>
              </div>
            )}
            <p className="listing-see-all__moment-body">
              <strong>@{moment.author}</strong> {moment.body}
              {moment.taggedListing ? (
                <span className="listing-see-all__moment-tag">@{moment.taggedListing}</span>
              ) : null}
            </p>
          </article>
        ))}
      </div>
      {overlay}
    </>
  )
}
