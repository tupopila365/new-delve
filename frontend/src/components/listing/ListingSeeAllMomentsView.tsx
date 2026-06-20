import { Camera } from 'lucide-react'
import type { ListingMomentItem } from './types'

type Props = {
  moments: ListingMomentItem[]
  emptyMessage?: string
}

export function ListingSeeAllMomentsView({
  moments,
  emptyMessage = 'No Delvers moments yet.',
}: Props) {
  if (moments.length === 0) {
    return (
      <p className="listing-see-all__muted" role="status">
        {emptyMessage}
      </p>
    )
  }

  return (
    <div className="listing-see-all__moments">
      {moments.map((moment) => (
        <article key={moment.id} className="listing-see-all__moment">
          <div className="listing-see-all__moment-thumb">
            {moment.image ? (
              <img src={moment.image} alt="" loading="lazy" decoding="async" />
            ) : (
              <div className="listing-see-all__moment-ph" aria-hidden>
                <Camera size={20} strokeWidth={1.75} />
              </div>
            )}
          </div>
          <p className="listing-see-all__moment-body">
            <strong>@{moment.author}</strong> {moment.body}
            {moment.taggedListing ? (
              <span className="listing-see-all__moment-tag">@{moment.taggedListing}</span>
            ) : null}
          </p>
        </article>
      ))}
    </div>
  )
}
