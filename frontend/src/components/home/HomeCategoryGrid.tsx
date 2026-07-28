import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import './HomeCategoryGrid.css'

export type HomeCategory = {
  to: string
  label: string
  Icon: LucideIcon
}

/** Categories shown before "More" — keeps the first fold scannable. */
const COLLAPSED_COUNT = 6

type Props = {
  items: readonly HomeCategory[]
}

export function HomeCategoryGrid({ items }: Props) {
  const [expanded, setExpanded] = useState(false)
  const visible = expanded ? items : items.slice(0, COLLAPSED_COUNT)
  const hidden = items.length - visible.length

  return (
    <section className="home-cat-section" aria-labelledby="home-cat-heading">
      <h2 id="home-cat-heading" className="home-cat-section__title">
        Explore
      </h2>
      <nav className="home-cat-grid" aria-label="Browse DELVE categories">
        {visible.map((item) => (
          <Link key={item.to} to={item.to} className="home-cat-grid__item">
            <span className="home-cat-grid__icon" aria-hidden>
              <item.Icon size={18} strokeWidth={2.25} />
            </span>
            <span className="home-cat-grid__label">{item.label}</span>
            <ChevronRight size={16} strokeWidth={2.25} className="home-cat-grid__chev" aria-hidden />
          </Link>
        ))}
      </nav>
      {hidden > 0 || expanded ? (
        <button
          type="button"
          className="home-cat-section__more"
          aria-expanded={expanded}
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? 'Show less' : `More ways to explore (${hidden})`}
          <ChevronDown size={16} strokeWidth={2.25} aria-hidden />
        </button>
      ) : null}
    </section>
  )
}
