import type { ReactNode } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Clock,
  Languages,
  MapPin,
  MessageCircle,
  Route,
} from 'lucide-react'
import { apiFetch } from '../../api/client'
import { friendlyApiMessage } from '../../utils/friendlyError'
import type { TourPackage } from '../guide/types'
import { GuideAskButton } from '../guide/GuideAskButton'
import { DetailActionCard } from '../detail'
import { BookingDateFields } from './BookingDateFields'
import { BookingGuestSelector } from './BookingGuestSelector'
import { BookingNotesField } from './BookingNotesField'
import { BookingPriceSummary } from './BookingPriceSummary'
import { BookingTrustNote } from './BookingTrustNote'
import { UserBookingErrorState } from './UserBookingErrorState'
import { GuideRequestAccessGate } from './GuideRequestAccessGate'
import { GuideRequestSuccess } from './GuideRequestSuccess'
import { GUIDE_TIME_PRESETS, type GuideBookingRecord, type GuideRequestPhase } from './guideRequestShared'

type Profile = {
  email_verified: boolean
}

type Props = {
  guideId: number
  guideUserId?: number
  guideHeadline: string
  guideDisplayName: string
  guideUsername: string
  regionLine?: string
  languages?: string[]
  rateLabel: ReactNode
  hourlyRate?: string | null
  mode?: 'guide' | 'package'
  packages?: TourPackage[]
  fixedPackage?: TourPackage
  initialPackageId?: string
  initialDate?: string
  initialGroupSize?: number
  defaultMeetingPoint?: string
  profile: Profile | null
  maxGroupSize?: number
  className?: string
}

export function GuideRequestPanel({
  guideId,
  guideUserId,
  guideHeadline,
  guideDisplayName,
  guideUsername,
  regionLine,
  languages = [],
  rateLabel,
  hourlyRate,
  mode = 'guide',
  packages = [],
  fixedPackage,
  initialPackageId = '',
  initialDate = '',
  initialGroupSize = 2,
  defaultMeetingPoint = '',
  profile,
  maxGroupSize = 30,
  className = '',
}: Props) {
  const qc = useQueryClient()
  const [phase, setPhase] = useState<GuideRequestPhase>('form')
  const [date, setDate] = useState(initialDate)
  const [groupSize, setGroupSize] = useState(initialGroupSize)
  const [durationHours, setDurationHours] = useState(fixedPackage?.hours ?? 4)
  const [selectedPkg, setSelectedPkg] = useState<TourPackage | null>(fixedPackage ?? null)
  const [startTime, setStartTime] = useState('')
  const [languagePref, setLanguagePref] = useState(languages[0] ?? '')
  const [meetingPoint, setMeetingPoint] = useState(defaultMeetingPoint)
  const [notes, setNotes] = useState('')
  const [booking, setBooking] = useState<GuideBookingRecord | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const todayStr = new Date().toISOString().split('T')[0]

  useEffect(() => {
    if (defaultMeetingPoint) setMeetingPoint(defaultMeetingPoint)
  }, [defaultMeetingPoint])

  useEffect(() => {
    if (fixedPackage) {
      setSelectedPkg(fixedPackage)
      setDurationHours(fixedPackage.hours)
      return
    }
    if (initialPackageId && packages.length > 0) {
      const pkg = packages.find((p) => p.id === initialPackageId) ?? null
      if (pkg) {
        setSelectedPkg(pkg)
        setDurationHours(pkg.hours)
      }
    }
  }, [fixedPackage, initialPackageId, packages])

  useEffect(() => {
    if (initialDate) setDate(initialDate)
  }, [initialDate])

  useEffect(() => {
    if (initialGroupSize > 0) setGroupSize(Math.min(maxGroupSize, initialGroupSize))
  }, [initialGroupSize, maxGroupSize])

  const selectedPackageId = selectedPkg?.id ?? ''

  const estimatedTotal = useMemo(() => {
    if (selectedPkg) return String(selectedPkg.price)
    if (!hourlyRate) return null
    const rate = parseFloat(hourlyRate)
    if (Number.isNaN(rate)) return null
    return (rate * durationHours * groupSize).toFixed(0)
  }, [hourlyRate, durationHours, groupSize, selectedPkg])

  const createMut = useMutation({
    mutationFn: () =>
      apiFetch<GuideBookingRecord>('/api/guides/bookings/', {
        method: 'POST',
        body: JSON.stringify({
          guide: guideId,
          date,
          group_size: groupSize,
          duration_hours: selectedPkg ? selectedPkg.hours : durationHours,
          package_id: selectedPackageId,
          start_time: startTime && /^\d{2}:\d{2}$/.test(startTime) ? `${startTime}:00` : null,
          meeting_point: meetingPoint.trim(),
          notes: notes.trim(),
        }),
      }),
    onSuccess: (b) => {
      setBooking(b)
      setPhase('sent')
      void qc.invalidateQueries({ queryKey: ['guide-bookings'] })
      void qc.invalidateQueries({ queryKey: ['my-bookings'] })
    },
    onError: (e) =>
      setErr(
        friendlyApiMessage(e, "We couldn't send your guide request. Please check your details and try again."),
      ),
  })

  const validate = (): boolean => {
    setErr(null)
    if (!date) {
      setErr('Choose a preferred date.')
      return false
    }
    if (groupSize < 1) {
      setErr('Choose at least 1 traveller.')
      return false
    }
    if (groupSize > maxGroupSize) {
      setErr(`Group size cannot exceed the maximum of ${maxGroupSize}.`)
      return false
    }
    return true
  }

  const handleReview = (e: React.FormEvent) => {
    e.preventDefault()
    if (validate()) setPhase('review')
  }

  const handleSend = () => {
    if (!validate()) {
      setPhase('form')
      return
    }
    createMut.mutate()
  }

  const kicker = mode === 'package' ? 'Request this experience' : 'Request a guide'
  const experienceTitle = mode === 'package' && fixedPackage ? fixedPackage.title : guideHeadline
  const packageHref =
    mode === 'package' && fixedPackage ? `/guides/${guideId}/packages/${encodeURIComponent(fixedPackage.id)}` : undefined

  if (!profile) {
    return (
      <GuideRequestAccessGate
        mode={mode}
        backHref={mode === 'package' && packageHref ? packageHref : `/guides/${guideId}`}
        className={className}
      />
    )
  }

  if (!profile.email_verified) {
    return (
      <GuideRequestAccessGate
        mode={mode}
        needsVerify
        backHref={mode === 'package' && packageHref ? packageHref : `/guides/${guideId}`}
        className={className}
      />
    )
  }

  if (phase === 'sent' && booking) {
    return (
      <GuideRequestSuccess
        mode={mode}
        title={mode === 'package' && fixedPackage ? fixedPackage.title : guideHeadline}
        subtitle={mode === 'package' ? guideDisplayName : undefined}
        dateLabel={booking.date}
        groupLabel={`${booking.group_size} ${booking.group_size === 1 ? 'traveller' : 'travellers'}`}
        message={booking.notes || notes.trim() || undefined}
        requestRef={booking.id}
        guideProfileHref={`/guides/${guideId}`}
        guideId={guideId}
        packageHref={packageHref}
        className={className}
      />
    )
  }

  const trustCopy =
    mode === 'package'
      ? 'Send a request and confirm availability with the guide before booking.'
      : 'The guide will review your request and confirm availability before anything is final.'

  return (
    <DetailActionCard kicker={kicker} title={rateLabel} className={`gd-detail__booking-card ${className}`.trim()} footer={<BookingTrustNote>{trustCopy}</BookingTrustNote>}>
      <div className="gd-request-panel__meta">
        {regionLine ? <span>{regionLine}</span> : null}
        {languages.length > 0 ? <span>{languages.slice(0, 3).join(', ')}</span> : null}
        <span>{guideDisplayName}</span>
      </div>

      {phase === 'form' ? (
        <form className="gd-detail__booking-form bk-inline-form" onSubmit={handleReview}>
          {err ? <UserBookingErrorState message={err} onDismiss={() => setErr(null)} /> : null}

          <div className="gd-request-panel__section">
            <h4 className="gd-request-panel__section-title">Experience details</h4>
            {mode === 'guide' && packages.length > 0 ? (
              <label className="gd-detail__booking-field">
                <span className="gd-detail__booking-label">
                  <Route size={14} strokeWidth={2.25} aria-hidden />
                  Package
                </span>
                <select
                  className="input"
                  value={selectedPackageId}
                  onChange={(e) => {
                    const pkg = packages.find((p) => p.id === e.target.value) ?? null
                    setSelectedPkg(pkg)
                    if (pkg) setDurationHours(pkg.hours)
                  }}
                >
                  <option value="">Custom duration (hourly)</option>
                  {packages.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title} · {p.hours}h · ${p.price}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            {mode === 'guide' && !selectedPkg ? (
              <label className="gd-detail__booking-field">
                <span className="gd-detail__booking-label">
                  <Clock size={14} strokeWidth={2.25} aria-hidden />
                  Duration
                </span>
                <select className="input" value={durationHours} onChange={(e) => setDurationHours(Number(e.target.value))}>
                  {[2, 4, 6, 8].map((hours) => (
                    <option key={hours} value={hours}>
                      {hours} hours
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            {mode === 'package' && fixedPackage ? (
              <p className="gd-request-panel__pkg-name">{fixedPackage.title}</p>
            ) : null}
          </div>

          <div className="gd-request-panel__section">
            <h4 className="gd-request-panel__section-title">Date and group</h4>
            <BookingDateFields
              mode="single"
              date={{
                id: `gd-book-date-${guideId}`,
                label: 'Preferred date',
                value: date,
                min: todayStr,
                onChange: setDate,
              }}
              time={{
                id: `gd-book-time-${guideId}`,
                label: 'Preferred start time',
                value: startTime,
                options: GUIDE_TIME_PRESETS.map(({ label, value }) => ({ label: `${label} (${value})`, value })),
                onChange: setStartTime,
              }}
            />
            <BookingGuestSelector
              id={`gd-book-group-${guideId}`}
              label="Group size"
              value={groupSize}
              min={1}
              max={maxGroupSize}
              onChange={setGroupSize}
              hint={`Maximum ${maxGroupSize} travellers.`}
            />
            {languages.length > 0 ? (
              <label className="gd-detail__booking-field">
                <span className="gd-detail__booking-label">
                  <Languages size={14} strokeWidth={2.25} aria-hidden />
                  Preferred language
                </span>
                <select className="input" value={languagePref} onChange={(e) => setLanguagePref(e.target.value)}>
                  {languages.map((lang) => (
                    <option key={lang} value={lang}>
                      {lang}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
          </div>

          <div className="gd-request-panel__section">
            <h4 className="gd-request-panel__section-title">Message to guide</h4>
            <label className="gd-detail__booking-field">
              <span className="gd-detail__booking-label">
                <MapPin size={14} strokeWidth={2.25} aria-hidden />
                Pickup / meeting note
              </span>
              <textarea
                className="input"
                rows={2}
                value={meetingPoint}
                onChange={(e) => setMeetingPoint(e.target.value)}
                placeholder="Hotel lobby, landmark, or station exit"
              />
            </label>
            <BookingNotesField
              id={`gd-book-notes-${guideId}`}
              label="Message to guide"
              value={notes}
              onChange={setNotes}
              placeholder="Tell the guide what you want to do, your preferred time, pickup area, and any special needs."
              hint="A short message helps the guide understand your request."
            />
          </div>

          {estimatedTotal ? (
            <BookingPriceSummary
              lines={[{ label: 'Estimated total', value: `$${estimatedTotal}` }]}
              estimateNote="Final price confirmed by the guide"
            />
          ) : null}

          <button type="submit" className="btn btn-primary gd-detail__book-btn">
            {mode === 'package' ? 'Review experience request' : 'Review guide request'}
          </button>
        </form>
      ) : (
        <div className="gd-request-panel__review">
          {err ? <UserBookingErrorState message={err} onDismiss={() => setErr(null)} /> : null}
          <h4 className="gd-request-panel__section-title">Review request</h4>
          <dl className="gd-request-panel__review-dl">
            <div>
              <dt>Date</dt>
              <dd>{date}</dd>
            </div>
            {startTime ? (
              <div>
                <dt>Start time</dt>
                <dd>{startTime}</dd>
              </div>
            ) : null}
            <div>
              <dt>Group size</dt>
              <dd>{groupSize}</dd>
            </div>
            {selectedPkg ? (
              <div>
                <dt>Experience</dt>
                <dd>{selectedPkg.title}</dd>
              </div>
            ) : null}
            {meetingPoint.trim() ? (
              <div>
                <dt>Meeting note</dt>
                <dd>{meetingPoint.trim()}</dd>
              </div>
            ) : null}
            {notes.trim() ? (
              <div className="gd-request-panel__review-dl--full">
                <dt>Message</dt>
                <dd>{notes.trim()}</dd>
              </div>
            ) : null}
          </dl>
          {estimatedTotal ? (
            <BookingPriceSummary
              lines={[{ label: 'Estimated total', value: `$${estimatedTotal}` }]}
              estimateNote="Final price confirmed by the guide"
            />
          ) : null}
          <div className="gd-request-panel__review-actions">
            <button type="button" className="btn btn-primary btn-block" onClick={handleSend} disabled={createMut.isPending}>
              {createMut.isPending ? 'Sending…' : mode === 'package' ? 'Send experience request' : 'Send guide request'}
            </button>
            <button type="button" className="btn btn-ghost btn-block" onClick={() => setPhase('form')}>
              Edit details
            </button>
          </div>
        </div>
      )}

      {guideUserId && profile.email_verified ? (
        <GuideAskButton guideUserId={guideUserId} label="Message guide" />
      ) : (
        <p className="gd-detail__booking-hint">
          <MessageCircle size={14} strokeWidth={2.25} aria-hidden />
          Use messages to confirm pickup, route, language, and group details.
        </p>
      )}
    </DetailActionCard>
  )
}
