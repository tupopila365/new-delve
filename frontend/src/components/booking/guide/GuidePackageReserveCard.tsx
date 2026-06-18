import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Clock } from 'lucide-react'
import { useAuth } from '../../../auth/AuthContext'
import { loginHrefWithReturn } from '../../../utils/authRedirect'
import { BookingDateFields } from '../BookingDateFields'
import { BookingGuestSelector } from '../BookingGuestSelector'
import { guidePackageBookPath, nextAvailableGuideDate, todayIsoDate } from '../bookingUtils'
import type { TourPackage } from '../../guide/types'
import './guide-booking.css'

type Props = {
  guideId: string
  packageSlug: string
  pkg: TourPackage
  guideDisplayName: string
  maxGroupSize?: number
  className?: string
}

export function GuidePackageReserveCard({
  guideId,
  packageSlug,
  pkg,
  guideDisplayName,
  maxGroupSize = 20,
  className = '',
}: Props) {
  const { profile } = useAuth()
  const defaultDate = useMemo(() => nextAvailableGuideDate(), [])
  const [date, setDate] = useState(defaultDate)
  const [groupSize, setGroupSize] = useState(2)
  const [err, setErr] = useState<string | null>(null)
  const today = todayIsoDate()

  const buildBookPath = (d: string, group: number) =>
    guidePackageBookPath(guideId, packageSlug, { date: d, groupSize: group })

  const validate = (d: string): boolean => {
    setErr(null)
    if (!d) {
      setErr('Choose a preferred date.')
      return false
    }
    if (d < today) {
      setErr('Date must be today or in the future.')
      return false
    }
    if (groupSize < 1 || groupSize > maxGroupSize) {
      setErr(`Up to ${maxGroupSize} travellers.`)
      return false
    }
    return true
  }

  const bookPath = buildBookPath(date || defaultDate, groupSize)
  const loginHref = loginHrefWithReturn(bookPath)

  return (
    <div className={`guide-reserve ${className}`.trim()} id="guide-request-panel">
      <p className="guide-reserve__kicker">Request this experience</p>
      <p className="guide-reserve__price">
        ${pkg.price}
        <small>
          {' '}
          · {pkg.hours} {pkg.hours === 1 ? 'hour' : 'hours'} total
        </small>
      </p>
      <p className="guide-reserve__meta">
        <Clock size={13} strokeWidth={2.25} aria-hidden style={{ verticalAlign: -2, marginRight: 4 }} />
        With {guideDisplayName}
      </p>

      {err ? (
        <p className="guide-reserve__error" role="alert">
          {err}
        </p>
      ) : null}

      <div className="guide-reserve__fields">
        <BookingDateFields
          mode="single"
          date={{
            id: 'guide-reserve-date',
            label: 'Preferred date',
            value: date,
            min: today,
            onChange: setDate,
          }}
        />
        <BookingGuestSelector
          id="guide-reserve-group"
          label="Travellers"
          value={groupSize}
          min={1}
          max={maxGroupSize}
          onChange={setGroupSize}
          hint={`Max ${maxGroupSize} travellers`}
        />
      </div>

      {profile ? (
        <Link
          to={bookPath}
          className="btn btn-primary btn-block"
          onClick={(e) => {
            if (!validate(date)) e.preventDefault()
          }}
        >
          Check availability
        </Link>
      ) : (
        <Link to={loginHref} className="btn btn-primary btn-block">
          Sign in to request
        </Link>
      )}

      <p className="guide-reserve__hint">
        The guide confirms your date before anything is final. No charge until approved.
      </p>
    </div>
  )
}
