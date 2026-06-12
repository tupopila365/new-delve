type BreakdownRow = {
  label: string
  value: number
}

type Props = {
  rating?: string | number | null
  count?: number | null
  breakdown?: BreakdownRow[]
  emptyText?: string
  className?: string
}

export function ReviewSummary({ rating, count, breakdown, emptyText, className = '' }: Props) {
  const ratingNum = rating != null ? parseFloat(String(rating)) : null
  const hasRating = ratingNum != null && !Number.isNaN(ratingNum)
  const hasBreakdown = breakdown && breakdown.length > 0

  if (!hasRating && !hasBreakdown) {
    return emptyText ? (
      <p className={`dl-detail__review-empty ${className}`.trim()} role="status">
        {emptyText}
      </p>
    ) : null
  }

  return (
    <div className={`dl-detail__review-summary ${className}`.trim()}>
      {hasRating ? (
        <p className="dl-detail__review-score">
          ★ {ratingNum!.toFixed(1)}
          {count ? ` · ${count} ${count === 1 ? 'review' : 'reviews'}` : ''}
        </p>
      ) : null}
      {hasBreakdown ? (
        <div className="dl-detail__breakdown fd-detail__breakdown">
          {breakdown!.map((row) => (
            <div key={row.label} className="dl-detail__breakdown-row fd-detail__breakdown-row">
              <span className="dl-detail__breakdown-label fd-detail__breakdown-label">{row.label}</span>
              <div className="dl-detail__breakdown-bar fd-detail__breakdown-bar" aria-hidden>
                <span style={{ width: `${Math.min(100, (row.value / 5) * 100)}%` }} />
              </div>
              <span className="dl-detail__breakdown-val fd-detail__breakdown-val">{row.value.toFixed(1)}</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}
