import { Link } from 'react-router-dom'
import { Camera } from 'lucide-react'
import { DetailSection } from './DetailSection'
import { DetailSectionHead } from './DetailSectionHead'

export type MomentItem = {
  id: string | number
  image?: string | null
  author: string
  body: string
}

type Props = {
  title?: string
  subtitle?: string
  moments: MomentItem[]
  className?: string
  showWhenEmpty?: boolean
  emptyMessage?: string
}

export function DelversMoments({
  title = 'Delvers moments',
  subtitle = 'Real posts from travellers — not owner photos.',
  moments,
  className = '',
  showWhenEmpty = false,
  emptyMessage = 'No Delvers moments yet — travellers often share photos after visiting.',
}: Props) {
  if (moments.length === 0 && !showWhenEmpty) return null

  return (
    <DetailSection className={className}>
      <DetailSectionHead
        title={title}
        subtitle={subtitle}
        action={<Link to="/delvers">See more</Link>}
      />
      {moments.length > 0 ? (
        <div className="dl-detail__moments-grid">
          {moments.map((m) => (
            <div key={m.id} className="dl-detail__moment-card">
              {m.image ? (
                <img src={m.image} alt="" loading="lazy" />
              ) : (
                <div className="dl-detail__moment-placeholder" aria-hidden>
                  <Camera size={28} strokeWidth={1.75} />
                </div>
              )}
              <p>
                <strong>@{m.author}</strong> {m.body}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="dl-detail__moments-empty" role="status">
          {emptyMessage}
        </p>
      )}
    </DetailSection>
  )
}
