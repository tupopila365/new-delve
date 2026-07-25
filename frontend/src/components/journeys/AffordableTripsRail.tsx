import { Link } from 'react-router-dom'
import { MapPin, Wallet } from 'lucide-react'
import type { MockTrip } from '../../data/mockTrips'
import { homeCoverSrc } from '../../data/homeDefaults'
import {
  formatJourneyCost,
  isBudgetTrip,
  isWeekendTrip,
  routeLabel,
} from '../../utils/journeyDisplay'
import { categoryBreakdown } from './journeyBudget'
import './AffordableTripsRail.css'

type Props = {
  trips: MockTrip[]
  className?: string
  /** Cap cards shown in the rail. */
  limit?: number
  seeAllTo?: string
}

export function pickAffordableTrips(trips: MockTrip[], limit = 8): MockTrip[] {
  const scored = trips
    .map((t) => {
      const cost = Number(t.total_cost) || 0
      const weekend = isWeekendTrip(t)
      const budget = isBudgetTrip(t)
      if (!weekend && !budget && !(cost > 0 && cost < 8000)) return null
      // Prefer short + low cost
      const score =
        (weekend ? 40 : 0) +
        (budget ? 30 : 0) +
        (cost > 0 ? Math.max(0, 40 - cost / 200) : 0) +
        (t.days <= 4 ? 10 : 0)
      return { t, score, cost }
    })
    .filter(Boolean) as { t: MockTrip; score: number; cost: number }[]
  scored.sort((a, b) => b.score - a.score || a.cost - b.cost)
  const seen = new Set<number>()
  const out: MockTrip[] = []
  for (const row of scored) {
    if (seen.has(row.t.id)) continue
    seen.add(row.t.id)
    out.push(row.t)
    if (out.length >= limit) break
  }
  return out
}

function tripCostParts(trip: MockTrip): string {
  const total = Number(trip.total_cost) || 0
  if (!trip.costs?.length || total <= 0) return 'Fuel · stay · food estimates'
  const parts = categoryBreakdown(trip.costs, total)
    .slice(0, 3)
    .map((p) => p.label.replace('Accommodation', 'Stay').replace('Foodies', 'Food'))
  return parts.length ? parts.join(' · ') : 'Fuel · stay · food estimates'
}

function tripBadge(trip: MockTrip): string {
  if (isWeekendTrip(trip) && isBudgetTrip(trip)) return 'Weekend deal'
  if (isWeekendTrip(trip)) return 'Weekend'
  if (isBudgetTrip(trip)) return 'Budget'
  return 'Doable trip'
}

/** Home / Explore rail — whole trips that feel affordable, not just cheap listings. */
export function AffordableTripsRail({
  trips,
  className,
  limit = 8,
  seeAllTo = '/journeys?mode=budget',
}: Props) {
  const items = pickAffordableTrips(trips, limit)
  if (items.length === 0) return null

  const sampleCost = items
    .map((t) => Number(t.total_cost) || 0)
    .filter((n) => n > 0)
    .sort((a, b) => a - b)[0]
  const currency = items.find((t) => Number(t.total_cost) > 0)?.currency
  const underLabel =
    sampleCost > 0
      ? `Weekend under ${formatJourneyCost(Math.ceil(sampleCost / 100) * 100, currency)}`
      : 'Trips that fit a real budget'

  return (
    <section
      className={`affordable-trips${className ? ` ${className}` : ''}`}
      aria-labelledby="affordable-trips-title"
    >
      <div className="affordable-trips__head">
        <div>
          <h2 id="affordable-trips-title" className="affordable-trips__title">
            <Wallet size={18} strokeWidth={2.25} aria-hidden /> {underLabel}
          </h2>
          <p className="affordable-trips__sub">
            Full trip estimates — stay, food, and getting around — so the weekend feels doable.
          </p>
        </div>
        <Link to={seeAllTo} className="affordable-trips__all">
          See trips
        </Link>
      </div>
      <div className="affordable-trips__scroll h-scroll">
        {items.map((trip) => {
          const cost = Number(trip.total_cost) || 0
          const cover = homeCoverSrc(trip.cover_image, 'journey')
          return (
            <Link
              key={trip.id}
              to={`/journeys/${trip.id}`}
              className="affordable-trips__card"
            >
              <div
                className="affordable-trips__media"
                style={{ backgroundImage: `url(${cover})` }}
              >
                <span className="affordable-trips__badge">{tripBadge(trip)}</span>
              </div>
              <div className="affordable-trips__body">
                <strong className="affordable-trips__name">{trip.title}</strong>
                <span className="affordable-trips__route">
                  <MapPin size={12} strokeWidth={2.25} aria-hidden />
                  {routeLabel(trip)}
                </span>
                <span className="affordable-trips__meta">
                  {trip.days} {trip.days === 1 ? 'day' : 'days'}
                  {cost > 0 ? ` · ~${formatJourneyCost(cost, trip.currency)} trip` : ''}
                </span>
                <span className="affordable-trips__parts">{tripCostParts(trip)}</span>
              </div>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
