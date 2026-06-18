import type { TripCost } from '../../data/mockTrips'

export const JOURNEY_COST_COLORS: Record<TripCost['category'], string> = {
  transport: '#3dbf7a',
  stay: '#f07830',
  food: '#e8b84b',
  activity: '#9b6ff0',
  other: '#8a8a8a',
}

export const JOURNEY_COST_LABELS: Record<TripCost['category'], string> = {
  stay: 'Accommodation',
  food: 'Food & drink',
  transport: 'Transport',
  activity: 'Activities',
  other: 'Other',
}

const CATEGORY_ORDER: TripCost['category'][] = ['transport', 'stay', 'food', 'activity', 'other']

export function totalsByCategory(costs: TripCost[]): Record<TripCost['category'], number> {
  const out: Record<TripCost['category'], number> = {
    stay: 0,
    food: 0,
    transport: 0,
    activity: 0,
    other: 0,
  }
  for (const c of costs) {
    out[c.category] += c.amount
  }
  return out
}

export function categoryBreakdown(costs: TripCost[], total: number) {
  const byCat = totalsByCategory(costs)
  return CATEGORY_ORDER.filter((cat) => byCat[cat] > 0).map((cat) => ({
    category: cat,
    label: JOURNEY_COST_LABELS[cat],
    amount: byCat[cat],
    color: JOURNEY_COST_COLORS[cat],
    pct: total > 0 ? (byCat[cat] / total) * 100 : 0,
  }))
}

export function formatBudgetAmount(amount: number, currency = 'NAD') {
  const prefix = currency === 'NAD' ? 'N$' : `${currency} `
  return `${prefix}${amount.toLocaleString()}`
}
