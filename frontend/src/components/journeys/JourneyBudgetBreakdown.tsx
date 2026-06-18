import { useMemo } from 'react'
import type { TripCost } from '../../data/mockTrips'
import { ListingSection } from '../listing'
import {
  categoryBreakdown,
  formatBudgetAmount,
  JOURNEY_COST_COLORS,
  JOURNEY_COST_LABELS,
} from './journeyBudget'
import './journey-budget.css'

type Props = {
  totalCost: number
  days: number
  costs: TripCost[]
  currency?: string
  className?: string
}

export function JourneyBudgetBreakdown({
  totalCost,
  days,
  costs,
  currency = 'NAD',
  className = '',
}: Props) {
  const perDay = days > 0 ? Math.round(totalCost / days) : null
  const categories = useMemo(() => categoryBreakdown(costs, totalCost), [costs, totalCost])

  if (costs.length === 0 && totalCost <= 0) return null

  return (
    <ListingSection title="Budget breakdown" className={`jn-budget-section ${className}`.trim()}>
      <div className="jn-budget">
        <div className="jn-budget__summary">
          <div className="jn-budget__stat jn-budget__stat--main">
            <span className="jn-budget__value">{formatBudgetAmount(totalCost, currency)}</span>
            <span className="jn-budget__label">Total spend</span>
          </div>
          {perDay != null ? (
            <div className="jn-budget__stat">
              <span className="jn-budget__value">{formatBudgetAmount(perDay, currency)}</span>
              <span className="jn-budget__label">Per day</span>
            </div>
          ) : null}
          <div className="jn-budget__stat">
            <span className="jn-budget__value">{days}</span>
            <span className="jn-budget__label">Days</span>
          </div>
        </div>

        {categories.length > 0 ? (
          <>
            <div className="jn-budget__bar" aria-label="Spending by category">
              {categories.map((row) => (
                <span
                  key={row.category}
                  className="jn-budget__bar-seg"
                  style={{ flexGrow: row.amount, background: row.color }}
                  title={`${row.label}: ${row.pct.toFixed(0)}%`}
                />
              ))}
            </div>

            <ul className="jn-budget__categories">
              {categories.map((row) => (
                <li key={row.category} className="jn-budget__cat-row">
                  <span className="jn-budget__dot" style={{ background: row.color }} aria-hidden />
                  <span className="jn-budget__cat-name">{row.label}</span>
                  <span className="jn-budget__cat-pct">{row.pct.toFixed(0)}%</span>
                  <span className="jn-budget__cat-amt">{formatBudgetAmount(row.amount, currency)}</span>
                </li>
              ))}
            </ul>
          </>
        ) : null}

        {costs.length > 0 ? (
          <div className="jn-budget__expenses">
            <p className="jn-budget__expenses-title">All expenses</p>
            <ul className="jn-budget__expense-list">
              {costs.map((item, i) => (
                <li key={`${item.category}-${item.note}-${i}`} className="jn-budget__expense-row">
                  <span
                    className="jn-budget__dot"
                    style={{ background: JOURNEY_COST_COLORS[item.category] }}
                    aria-hidden
                  />
                  <span className="jn-budget__expense-note">{item.note}</span>
                  <span className="jn-budget__expense-cat">{JOURNEY_COST_LABELS[item.category]}</span>
                  <span className="jn-budget__expense-amt">{formatBudgetAmount(item.amount, currency)}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </ListingSection>
  )
}
