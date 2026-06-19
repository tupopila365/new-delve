import { ListingSection } from '../listing'
import { BusSeatPicker } from '../booking/transport/BusSeatPicker'
import '../booking/transport/transport-booking.css'

type Props = {
  totalSeats: number
  taken: Set<number>
  passengers: number
  firstSeat: number | null
  blockSeats: number[]
  blockValid: boolean
  onSelectSeat: (seat: number | null) => void
  className?: string
}

export function BusSeatMap({
  totalSeats,
  taken,
  passengers,
  firstSeat,
  blockSeats,
  blockValid,
  onSelectSeat,
  className = '',
}: Props) {
  return (
    <ListingSection
      title="Choose your seats"
      className={`tp-bus-seats tp-bus-seats-section ${className}`.trim()}
      id="bus-seats"
    >
      <p className="tp-detail__seat-hint">
        Select the <strong>first seat</strong> in your block — we reserve {passengers}{' '}
        {passengers === 1 ? 'adjacent seat' : 'adjacent seats'} together.
      </p>

      <BusSeatPicker
        totalSeats={totalSeats}
        taken={taken}
        passengers={passengers}
        firstSeat={firstSeat}
        blockSeats={blockSeats}
        blockValid={blockValid}
        onSelectSeat={onSelectSeat}
      />
    </ListingSection>
  )
}
