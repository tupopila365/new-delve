import { mediaUrl } from '../../api/client'

export type PortfolioItem = { src: string; caption?: string }

type Props = { items: PortfolioItem[]; title?: string }

export function GuidePortfolio({ items, title = 'Trips & moments' }: Props) {
  if (!items.length) return null

  return (
    <section className="gd-detail__portfolio" aria-labelledby="gd-portfolio-heading">
      <h2 id="gd-portfolio-heading" className="gd-detail__section-title">
        {title}
      </h2>
      <div className="gd-detail__portfolio-grid">
        {items.map((item, i) => {
          const url = mediaUrl(item.src) || item.src
          return (
            <figure key={`${item.src}-${i}`} className="gd-detail__portfolio-fig">
              <img
                className="gd-detail__portfolio-img"
                src={url}
                alt={item.caption || ''}
                loading="lazy"
              />
              {item.caption ? (
                <figcaption className="gd-detail__portfolio-cap">{item.caption}</figcaption>
              ) : null}
            </figure>
          )
        })}
      </div>
    </section>
  )
}
