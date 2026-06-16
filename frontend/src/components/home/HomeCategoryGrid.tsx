import { Link } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'
import { ChevronRight } from 'lucide-react'
import './HomeCategoryGrid.css'

export type HomeCategory = {
  to: string
  label: string
  Icon: LucideIcon
}

type Props = {
  items: readonly HomeCategory[]
}

export function HomeCategoryGrid({ items }: Props) {
  return (
    <section className="home-cat-section" aria-labelledby="home-cat-heading">
      <h2 id="home-cat-heading" className="home-cat-section__title">
        Explore
      </h2>
      <nav className="home-cat-grid" aria-label="Browse DELVE categories">
        {items.map((item) => (
          <Link key={item.to} to={item.to} className="home-cat-grid__item">
            <span className="home-cat-grid__icon" aria-hidden>
              <item.Icon size={18} strokeWidth={2.25} />
            </span>
            <span className="home-cat-grid__label">{item.label}</span>
            <ChevronRight size={16} strokeWidth={2.25} className="home-cat-grid__chev" aria-hidden />
          </Link>
        ))}
      </nav>
    </section>
  )
}
