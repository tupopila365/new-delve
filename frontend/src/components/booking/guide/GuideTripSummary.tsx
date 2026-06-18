type Row = { label: string; value: string }

type Props = {
  image?: string
  imageAlt?: string
  title: string
  guideName?: string
  location?: string
  rows: Row[]
  total?: { label: string; value: string }
  note?: string
}

export function GuideTripSummary({
  image,
  imageAlt,
  title,
  guideName,
  location,
  rows,
  total,
  note,
}: Props) {
  return (
    <div className="guide-summary">
      {image ? <img src={image} alt={imageAlt ?? title} className="guide-summary__img" /> : null}
      <p className="guide-summary__type">Your experience</p>
      <h2 className="guide-summary__title">{title}</h2>
      {guideName ? <p className="guide-summary__guide">With {guideName}</p> : null}
      {location ? <p className="guide-summary__location">{location}</p> : null}
      <dl className="guide-summary__rows">
        {rows.map((row) => (
          <div key={row.label} className="guide-summary__row">
            <dt>{row.label}</dt>
            <dd>{row.value}</dd>
          </div>
        ))}
      </dl>
      {total ? (
        <div className="guide-summary__total">
          <span>{total.label}</span>
          <span>{total.value}</span>
        </div>
      ) : null}
      {note ? <p className="guide-summary__note">{note}</p> : null}
    </div>
  )
}
