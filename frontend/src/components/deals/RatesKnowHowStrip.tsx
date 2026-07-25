import { Link } from 'react-router-dom'
import { Compass, GraduationCap, IdCard, MessagesSquare } from 'lucide-react'
import { RATES_KNOW_HOW } from './localBookingTips'
import './deals.css'

const ICONS = {
  sadc: IdCard,
  student: GraduationCap,
  guide: Compass,
  community: MessagesSquare,
} as const

type Props = {
  className?: string
  /** Compact row for Home under the deals rail. */
  compact?: boolean
}

/** Practical tips so rates feel normal — not exclusive loopholes. */
export function RatesKnowHowStrip({ className, compact }: Props) {
  return (
    <section
      className={`rates-knowhow${compact ? ' rates-knowhow--compact' : ''}${className ? ` ${className}` : ''}`}
      aria-labelledby="rates-knowhow-title"
    >
      <div className="rates-knowhow__head">
        <h2 id="rates-knowhow-title" className="rates-knowhow__title">
          Know before you claim
        </h2>
        {!compact ? (
          <p className="rates-knowhow__sub">
            Small local norms — passport, student ID, when to ask — so unlocking a rate feels ordinary.
          </p>
        ) : null}
      </div>
      <ul className="rates-knowhow__grid">
        {RATES_KNOW_HOW.map((tip) => {
          const Icon = ICONS[tip.id as keyof typeof ICONS] || IdCard
          return (
            <li key={tip.id}>
              <Link to={tip.to} className="rates-knowhow__card">
                <span className="rates-knowhow__icon" aria-hidden>
                  <Icon size={16} strokeWidth={2.25} />
                </span>
                <strong>{tip.title}</strong>
                <span>{tip.body}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
