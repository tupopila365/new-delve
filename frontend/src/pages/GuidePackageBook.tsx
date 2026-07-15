import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarDays, Compass } from 'lucide-react'
import { apiFetch, ApiError, mediaUrl } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import {
  BookingAccessGate,
  checkGuidePackageAvailability,
  formatGuideDate,
  googleCalendarGuideUrl,
  guidePackageBookPath,
  guidePackageDetailPath,
  nextAvailableGuideDate,
  todayIsoDate,
  validateGuideBookingInput,
} from '../components/booking'
import type { AvailabilityStatus } from '../components/booking'
import type { GuideBookingRecord } from '../components/booking/guideRequestShared'
import { GUIDE_TIME_PRESETS } from '../components/booking/guideRequestShared'
import {
  GuideAvailabilityPanel,
  GuideBookingLayout,
  GuideConfirmedPanel,
  GuideDetailsPanel,
  GuideReviewPanel,
  GuideTripSummary,
} from '../components/booking/guide'
import { MessageProviderLink } from '../components/messages'
import { EmptyState } from '../components/ui'
import { loginHrefWithReturn } from '../utils/authRedirect'
import {
  guideDisplayName,
  guideRegionLine,
  type GuideProfile,
} from '../utils/guideListing'
import { normalizeTourPackages } from '../utils/tourPackages'

type Phase = 'availability' | 'details' | 'review' | 'sent'

const MAX_GROUP_SIZE = 20

function parseGroupParam(raw: string | null): number | null {
  if (!raw) return null
  const n = parseInt(raw, 10)
  return Number.isNaN(n) || n < 1 ? null : n
}

function timeLabel(value: string): string {
  const preset = GUIDE_TIME_PRESETS.find((p) => p.value === value)
  return preset ? `${preset.label} (${value})` : value
}

export function GuidePackageBook() {
  const { guideId, packageSlug } = useParams<{ guideId: string; packageSlug: string }>()
  const [searchParams] = useSearchParams()
  const qc = useQueryClient()
  const { profile, loading: authLoading } = useAuth()

  const pkgId = packageSlug ? decodeURIComponent(packageSlug) : ''
  const gid = guideId ? Number(guideId) : NaN
  const packageHref = guideId && pkgId ? guidePackageDetailPath(guideId, pkgId) : '/guides'

  const [date, setDate] = useState(() => searchParams.get('date') ?? '')
  const [startTime, setStartTime] = useState(() => searchParams.get('time') ?? '')
  const [groupSize, setGroupSize] = useState(() => parseGroupParam(searchParams.get('group')) ?? 2)
  const [languagePref, setLanguagePref] = useState('')
  const [meetingPoint, setMeetingPoint] = useState('')
  const [notes, setNotes] = useState('')
  const [booking, setBooking] = useState<GuideBookingRecord | null>(null)
  const [phase, setPhase] = useState<Phase>('availability')
  const [availStatus, setAvailStatus] = useState<AvailabilityStatus>('idle')
  const [unavailableReason, setUnavailableReason] = useState<string | null>(null)
  const [showDateFields, setShowDateFields] = useState(() => !searchParams.get('date'))
  const [err, setErr] = useState<string | null>(null)
  const autoCheckedRef = useRef(false)

  const { data: guide, isLoading } = useQuery({
    queryKey: ['guide', guideId],
    enabled: Number.isFinite(gid),
    queryFn: () => apiFetch<GuideProfile>(`/api/guides/profiles/${guideId}/`, { auth: false }),
  })

  const packages = useMemo(() => normalizeTourPackages(guide?.tour_packages), [guide?.tour_packages])
  const pkg = useMemo(() => packages.find((p) => p.id === pkgId), [packages, pkgId])

  const { data: existingBookings } = useQuery({
    queryKey: ['guide-bookings', guide?.id],
    enabled: !!profile && !!guide?.id,
    queryFn: () => apiFetch<{ date: string; guide: number; status: string }[]>('/api/guides/bookings/').catch(() => []),
  })

  const bookedDates = useMemo(() => {
    if (!guide?.id || !existingBookings) return []
    return existingBookings
      .filter((b) => b.guide === guide.id && ['pending', 'confirmed', 'requested'].includes(b.status))
      .map((b) => b.date)
  }, [existingBookings, guide?.id])

  const bookPath = useMemo(
    () =>
      guideId && pkgId
        ? guidePackageBookPath(guideId, pkgId, {
            date: date || nextAvailableGuideDate({ bookedDates }),
            groupSize,
            startTime,
          })
        : '/guides',
    [guideId, pkgId, date, groupSize, startTime, bookedDates],
  )

  useEffect(() => {
    if (!guide || !pkg || date) return
    setDate(nextAvailableGuideDate({ bookedDates }))
  }, [guide, pkg, date, bookedDates])

  useEffect(() => {
    if (guide?.languages?.length && !languagePref) {
      setLanguagePref(guide.languages[0])
    }
  }, [guide?.languages, languagePref])

  useEffect(() => {
    const mp = guide?.default_meeting_point?.trim()
    if (mp && !meetingPoint) setMeetingPoint(mp)
  }, [guide?.default_meeting_point, meetingPoint])

  useEffect(() => {
    setGroupSize((g) => Math.min(g, MAX_GROUP_SIZE))
  }, [])

  const displayName = guide ? guideDisplayName(guide) : ''
  const regionLine = guide ? guideRegionLine(guide) : ''
  const coverSrc = pkg?.photo ? mediaUrl(pkg.photo) || '' : guide?.photo ? mediaUrl(guide.photo) || '' : undefined

  const runAvailabilityCheck = useCallback(async () => {
    setErr(null)
    setUnavailableReason(null)
    setAvailStatus('checking')

    const result = await checkGuidePackageAvailability(
      { date, groupSize, maxGroupSize: MAX_GROUP_SIZE },
      { bookedDates },
    )

    if (result.available) {
      setAvailStatus('available')
      setShowDateFields(false)
    } else {
      setAvailStatus('unavailable')
      setUnavailableReason(result.reason)
      setShowDateFields(true)
    }
  }, [date, groupSize, bookedDates])

  useEffect(() => {
    if (!guide || !pkg || !date || phase !== 'availability') return
    if (availStatus !== 'idle') return
    if (autoCheckedRef.current) return
    autoCheckedRef.current = true
    void runAvailabilityCheck()
  }, [guide, pkg, date, phase, availStatus, runAvailabilityCheck])

  const createMut = useMutation({
    mutationFn: () => {
      const noteParts: string[] = []
      if (languagePref.trim()) noteParts.push(`Preferred language: ${languagePref.trim()}`)
      if (notes.trim()) noteParts.push(notes.trim())
      return apiFetch<GuideBookingRecord>('/api/guides/bookings/', {
        method: 'POST',
        body: JSON.stringify({
          guide: guide!.id,
          date,
          group_size: groupSize,
          duration_hours: pkg!.hours,
          package_id: pkg!.id,
          start_time: startTime && /^\d{2}:\d{2}$/.test(startTime) ? `${startTime}:00` : null,
          meeting_point: meetingPoint.trim(),
          notes: noteParts.join('\n'),
        }),
      })
    },
    onSuccess: (b) => {
      setBooking(b)
      setPhase('sent')
      void qc.invalidateQueries({ queryKey: ['guide-bookings'] })
      void qc.invalidateQueries({ queryKey: ['my-bookings'] })
    },
    onError: (e) =>
      setErr(
        e instanceof ApiError
          ? e.message
          : "We couldn't send your guide request. Please check your details and try again.",
      ),
  })

  if (!Number.isFinite(gid) || !pkgId) {
    return (
      <div className="guide-book">
        <div className="guide-book__container">
          <EmptyState
            iconElement={<Compass size={28} strokeWidth={1.75} />}
            title="Experience not found"
            sub="This booking link is invalid."
            cta={{ label: 'Browse guides', to: '/guides' }}
          />
        </div>
      </div>
    )
  }

  if (isLoading || !guide) {
    return (
      <div className="guide-book">
        <div className="guide-book__container">
          <div className="skeleton" style={{ minHeight: 320, borderRadius: 16 }} />
        </div>
      </div>
    )
  }

  if (!pkg) {
    return (
      <div className="guide-book">
        <div className="guide-book__container">
          <EmptyState
            iconElement={<Compass size={28} strokeWidth={1.75} />}
            title="Experience unavailable"
            sub="This package is no longer offered or the link is incorrect. You can't book it."
            cta={{ label: 'Back to guide', to: `/guides/${guideId}` }}
          />
        </div>
      </div>
    )
  }

  if (authLoading) {
    return (
      <div className="guide-book">
        <div className="guide-book__container">
          <div className="skeleton" style={{ minHeight: 320, borderRadius: 16 }} />
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <BookingAccessGate
        serviceType="experience"
        mode="signin"
        backTo={packageHref}
        backLabel="Back to experience"
        signInHref={loginHrefWithReturn(bookPath)}
        className="guide-book-page guide-book-page--gate"
      />
    )
  }

  if (!profile.email_verified) {
    return (
      <BookingAccessGate
        serviceType="experience"
        mode="verify"
        backTo={packageHref}
        backLabel="Back to experience"
        className="guide-book-page guide-book-page--gate"
      />
    )
  }

  const today = todayIsoDate()
  const activeDate = booking?.date ?? date
  const activeGroup = booking?.group_size ?? groupSize
  const displayTotal = booking?.total_price ?? pkg.price

  const summaryRows = [
    activeDate ? { label: 'Date', value: formatGuideDate(activeDate) } : null,
    startTime ? { label: 'Start', value: timeLabel(startTime) } : null,
    { label: 'Duration', value: `${pkg.hours} ${pkg.hours === 1 ? 'hour' : 'hours'}` },
    { label: 'Travellers', value: `${activeGroup}` },
  ].filter(Boolean) as { label: string; value: string }[]

  const tripSummary = (
    <GuideTripSummary
      image={coverSrc}
      imageAlt={pkg.title}
      title={pkg.title}
      guideName={displayName}
      location={regionLine}
      rows={summaryRows}
      total={{ label: 'Package price', value: `$${displayTotal}` }}
      note="Final price confirmed by the guide before payment."
    />
  )

  const stepIndex =
    phase === 'availability' ? 1 : phase === 'details' ? 2 : phase === 'review' ? 3 : 4

  const steps = [
    { id: 'availability', label: 'Availability', active: stepIndex === 1, done: stepIndex > 1 },
    { id: 'details', label: 'Trip details', active: stepIndex === 2, done: stepIndex > 2 },
    { id: 'review', label: 'Review', active: stepIndex === 3, done: stepIndex > 3 },
    { id: 'sent', label: 'Sent', active: stepIndex === 4 },
  ]

  const reviewItems = [
    { label: 'Experience', value: pkg.title },
    { label: 'Guide', value: displayName },
    { label: 'Date', value: formatGuideDate(date) },
    ...(startTime ? [{ label: 'Start time', value: timeLabel(startTime) }] : []),
    { label: 'Travellers', value: `${groupSize}` },
    { label: 'Duration', value: `${pkg.hours} ${pkg.hours === 1 ? 'hour' : 'hours'}` },
    ...(languagePref ? [{ label: 'Language', value: languagePref }] : []),
    ...(meetingPoint.trim() ? [{ label: 'Meeting note', value: meetingPoint.trim(), fullWidth: true as const }] : []),
    ...(notes.trim() ? [{ label: 'Message', value: notes.trim(), fullWidth: true as const }] : []),
  ]

  const sentDetails = booking
    ? [
        { label: 'Experience', value: pkg.title },
        { label: 'Guide', value: displayName },
        ...(regionLine ? [{ label: 'Region', value: regionLine }] : []),
        { label: 'Date', value: formatGuideDate(booking.date) },
        { label: 'Travellers', value: `${booking.group_size}` },
        { label: 'Duration', value: `${pkg.hours} ${pkg.hours === 1 ? 'hour' : 'hours'}` },
        ...(booking.total_price ? [{ label: 'Estimated total', value: `$${booking.total_price}` }] : []),
        ...(booking.notes || notes.trim()
          ? [{ label: 'Message', value: booking.notes || notes.trim(), fullWidth: true as const }]
          : []),
      ]
    : []

  const calUrl =
    phase === 'sent' && activeDate
      ? googleCalendarGuideUrl({
          title: `Experience: ${pkg.title}`,
          details: `Guide experience via DELVE. ${activeGroup} traveller(s). With ${displayName}.`,
          date: activeDate,
          hours: pkg.hours,
        })
      : ''

  const handleCheckAvailability = () => {
    const validationErr = validateGuideBookingInput({ date, groupSize, maxGroupSize: MAX_GROUP_SIZE })
    if (validationErr) {
      setErr(validationErr)
      setShowDateFields(true)
      return
    }
    void runAvailabilityCheck()
  }

  const handleContinueFromAvailability = () => {
    if (availStatus !== 'available') return
    setPhase('details')
    setErr(null)
  }

  const handleChangeDate = () => {
    setAvailStatus('idle')
    setUnavailableReason(null)
    setShowDateFields(true)
    setErr(null)
    autoCheckedRef.current = false
  }

  const handleSendRequest = () => {
    const validationErr = validateGuideBookingInput({ date, groupSize, maxGroupSize: MAX_GROUP_SIZE })
    if (validationErr) {
      setErr(validationErr)
      setPhase('availability')
      setAvailStatus('idle')
      setShowDateFields(true)
      return
    }
    setErr(null)
    createMut.mutate()
  }

  return (
    <GuideBookingLayout
      backTo={packageHref}
      backLabel="Back to experience"
      steps={steps}
      summary={phase !== 'sent' ? tripSummary : undefined}
    >
      {err && phase !== 'availability' ? (
        <p className="guide-avail__error" role="alert">
          {err}
        </p>
      ) : null}

      {phase === 'availability' ? (
        <GuideAvailabilityPanel
          status={availStatus}
          unavailableReason={unavailableReason}
          date={date}
          startTime={startTime}
          groupSize={groupSize}
          maxGroupSize={MAX_GROUP_SIZE}
          packageTitle={pkg.title}
          durationHours={pkg.hours}
          packagePrice={pkg.price}
          showFields={showDateFields || availStatus === 'idle'}
          error={err}
          today={today}
          onDateChange={(v) => {
            setDate(v)
            setAvailStatus('idle')
          }}
          onStartTimeChange={(v) => {
            setStartTime(v)
            setAvailStatus('idle')
          }}
          onGroupSizeChange={(v) => {
            setGroupSize(v)
            setAvailStatus('idle')
          }}
          onCheck={handleCheckAvailability}
          onContinue={handleContinueFromAvailability}
          onChangeDate={handleChangeDate}
        />
      ) : null}

      {phase === 'details' ? (
        <GuideDetailsPanel
          date={date}
          startTime={startTime}
          groupSize={groupSize}
          languagePref={languagePref}
          languages={guide.languages ?? []}
          meetingPoint={meetingPoint}
          notes={notes}
          defaultMeetingPoint={guide.default_meeting_point}
          onLanguageChange={setLanguagePref}
          onMeetingPointChange={setMeetingPoint}
          onNotesChange={setNotes}
          onBack={() => setPhase('availability')}
          onContinue={() => {
            setErr(null)
            setPhase('review')
          }}
        />
      ) : null}

      {phase === 'review' ? (
        <GuideReviewPanel
          experienceTitle={pkg.title}
          guideName={displayName}
          items={reviewItems}
          priceLine={`$${pkg.price} · ${pkg.hours}h experience`}
          total={`$${pkg.price}`}
          isSubmitting={createMut.isPending}
          onBack={() => setPhase('details')}
          onConfirm={handleSendRequest}
        />
      ) : null}

      {phase === 'sent' && booking ? (
        <GuideConfirmedPanel
          details={sentDetails}
          reference={booking.id}
          actions={
            <>
              <MessageProviderLink
                username={guide.username}
                label="Message guide"
                role="guide"
                variant="primary"
                size="block"
                place={{
                  type: 'booking_guide',
                  id: booking.id,
                  label: booking.guide_headline || pkg?.title || guide.headline,
                }}
              />
              <Link to={packageHref} className="btn btn-ghost btn-block">
                View experience
              </Link>
              <Link to={`/guides/${guideId}`} className="btn btn-ghost btn-block">
                View guide profile
              </Link>
              {calUrl ? (
                <a
                  href={calUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-ghost btn-block"
                >
                  <CalendarDays size={16} strokeWidth={2.25} aria-hidden />
                  Save to calendar
                </a>
              ) : null}
              <Link to="/guides" className="btn btn-ghost btn-block">
                Browse more guides
              </Link>
              <Link to="/dashboard#bookings" className="btn btn-ghost btn-block">
                View my bookings
              </Link>
            </>
          }
        />
      ) : null}
    </GuideBookingLayout>
  )
}
