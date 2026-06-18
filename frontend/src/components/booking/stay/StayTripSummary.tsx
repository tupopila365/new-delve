type Row = { label: string; value: string }

type Props = {
  image?: string
  imageAlt?: string
  title: string
  location?: string
  rows: Row[]
  total?: { label: string; value: string }
  note?: string
}

export function StayTripSummary({ image, imageAlt, title, location, rows, total, note }: Props) {
  return (
    <div className="stay-summary">
      {image ? <img src={image} alt={imageAlt ?? title} className="stay-summary__img" /> : null}
      <p className="stay-summary__type">Your trip</p>
      <h2 className="stay-summary__title">{title}</h2>
      {location ? <p className="stay-summary__location">{location}</p> : null}
      <dl className="stay-summary__rows">
        {rows.map((row) => (
          <div key={row.label} className="stay-summary__row">
            <dt>{row.label}</dt>
            <dd>{row.value}</dd>
          </div>
        ))}
      </dl>
      {total ? (
        <div className="stay-summary__total">
          <span>{total.label}</span>
          <span>{total.value}</span>
        </div>
      ) : null}
      {note ? <p className="stay-summary__note">{note}</p> : null}
    </div>
  )
}
