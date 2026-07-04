import { canStartSeatAt } from '../../../utils/transportSeatBlock'
import './transport-booking.css'

type Props = {
  totalSeats: number
  taken: Set<number>
  passengers: number
  firstSeat: number | null
  blockSeats: number[]
  blockValid: boolean
  onSelectSeat: (seat: number | null) => void
  compact?: boolean
  className?: string
}

export function BusSeatPicker({
  totalSeats,
  taken,
  passengers,
  firstSeat,
  blockSeats,
  blockValid,
  onSelectSeat,
  compact = false,
  className = '',
}: Props) {
  const seatNumbers = Array.from({ length: totalSeats }, (_, i) => i + 1)
  const gridClass = compact ? 'tp-seat-grid tp-seat-grid--compact' : 'tp-seat-map'

  return (
    <div className={className}>
      {compact ? (
        <>
          <p className="shared-reserve__seats-label">Pick your seats</p>
          <p className="shared-reserve__seats-hint">
            Tap the first seat — we hold {passengers} adjacent {passengers === 1 ? 'seat' : 'seats'}.
          </p>
        </>
      ) : null}

      <div className={gridClass} role="group" aria-label="Seat map">
        {seatNumbers.map((n) => {
          const isTaken = taken.has(n)
          const canStart = canStartSeatAt(n, totalSeats, passengers, taken)
          const inBlock = blockSeats.includes(n)
          const isSelectedStart = firstSeat === n
          return (
            <button
              key={n}
              type="button"
              disabled={isTaken || !canStart}
              className={`tp-seat${inBlock && blockValid ? ' tp-seat--in-block' : ''}${isSelectedStart ? ' tp-seat--selected' : ''}${isTaken || !canStart ? ' tp-seat--taken' : ''}`}
              aria-pressed={isSelectedStart}
              aria-label={
                isTaken
                  ? `Seat ${n} taken`
                  : !canStart
                    ? `Seat ${n} unavailable for a ${passengers}-seat block`
                    : `Seat ${n}`
              }
              onClick={() => onSelectSeat(n === firstSeat ? null : n)}
            >
              {n}
            </button>
          )
        })}
      </div>

      {compact ? (
        <div className="tp-seat-grid__legend" aria-hidden>
          <span>
            <span className="tp-seat-grid__dot tp-seat-grid__dot--selected" /> Selected
          </span>
          <span>
            <span className="tp-seat-grid__dot tp-seat-grid__dot--block" /> Your block
          </span>
          <span>
            <span className="tp-seat-grid__dot tp-seat-grid__dot--taken" /> Taken
          </span>
        </div>
      ) : null}

      {firstSeat != null && (
        <p
          className={`${compact ? 'tp-seat-grid__block-hint' : 'tp-detail__block-hint'}${!blockValid ? ` ${compact ? 'tp-seat-grid__block-hint--warn' : 'tp-detail__block-hint--warn'}` : ''}`}
          role="status"
        >
          {blockValid ? (
            <>
              Seats <strong>{blockSeats.join(', ')}</strong> reserved together.
            </>
          ) : (
            <>One or more seats in this block are taken — pick another.</>
          )}
        </p>
      )}
    </div>
  )
}
