import { Link } from 'react-router-dom'
import { Compass } from 'lucide-react'
import { mediaUrl } from '../../api/client'
import { MiniRating } from '../MiniRating'

export type SimilarGuide = {
  id: number
  headline: string
  photo: string | null
  username: string
  display_name?: string | null
  rating_avg?: string | null
  rating_count?: number | null
}

type Props = { guides: SimilarGuide[]; title?: string }

export function GuideSimilarGuides({ guides, title = 'Similar local experts' }: Props) {
  if (guides.length === 0) return null

  return (
    <section className="gd-detail__similar" aria-labelledby="gd-similar-heading">
      <h2 id="gd-similar-heading" className="gd-detail__section-title">
        {title}
      </h2>
      <p className="gd-detail__similar-sub">Other guides in similar regions — compare styles before you book.</p>
      <div className="gd-detail__similar-row">
        {guides.map((g) => {
          const name = g.display_name?.trim() || g.username
          return (
            <Link key={g.id} to={`/guides/${g.id}`} className="gd-detail__similar-card card">
              <div className="gd-detail__similar-media">
                {g.photo ? (
                  <img src={mediaUrl(g.photo) || ''} alt="" className="gd-detail__similar-img" />
                ) : (
                  <div className="gd-detail__similar-placeholder" aria-hidden>
                    <Compass size={24} strokeWidth={1.75} />
                  </div>
                )}
              </div>
              <div className="gd-detail__similar-body">
                <p className="gd-detail__similar-name">{name}</p>
                <p className="gd-detail__similar-headline">{g.headline}</p>
                <MiniRating rating={g.rating_avg} count={g.rating_count} />
              </div>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
