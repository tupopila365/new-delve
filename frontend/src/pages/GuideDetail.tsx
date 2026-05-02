import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch, ApiError, mediaUrl } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { GuestReviewCard, normalizeReviews } from '../components/GuestReviewCard'
import { GuideAskButton } from '../components/guide/GuideAskButton'
import { GuideCredentials } from '../components/guide/GuideCredentials'
import { GuidePortfolio, type PortfolioItem } from '../components/guide/GuidePortfolio'
import { GuideResponseBadge } from '../components/guide/GuideResponseBadge'
import { GuideSimilarGuides, type SimilarGuide } from '../components/guide/GuideSimilarGuides'
import { GuideTourPackages, type TourPackage } from '../components/guide/GuideTourPackages'
import { MiniRating } from '../components/MiniRating'

type Guide = {
  id: number
  user?: number
  headline: string
  bio: string
  hourly_rate: string | null
  languages: string[]
  regions: string[]
  photo: string | null
  username: string
  display_name?: string | null
  rating_avg?: string | null
  rating_count?: number | null
  specialities?: string[]
  guest_reviews?: unknown
  response_hours_typical?: number
  tour_packages?: unknown
  years_guiding?: number | null
  certifications?: unknown
  licensed_guide?: boolean
  languages_detail?: unknown
  portfolio_gallery?: unknown
  default_meeting_point?: string
}

type Booking = {
  id: number
  status: string
  total_price: string
  mock_payment_ref: string
}

const TIME_PRESETS: { label: string; value: string }[] = [
  { label: 'Morning', value: '09:00' },
  { label: 'Midday', value: '12:00' },
  { label: 'Afternoon', value: '15:00' },
  { label: 'Evening', value: '18:00' },
]

function normalizeTourPackages(raw: unknown): TourPackage[] {
  if (!Array.isArray(raw)) return []
  const out: TourPackage[] = []
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue
    const o = row as Record<string, unknown>
    const id = typeof o.id === 'string' ? o.id.trim() : ''
    const title = typeof o.title === 'string' ? o.title.trim() : ''
    const hours = typeof o.hours === 'number' ? o.hours : Number(o.hours)
    const price = o.price != null ? String(o.price) : ''
    if (id && title && Number.isFinite(hours) && hours > 0 && price) {
      out.push({ id, title, hours, price })
    }
  }
  return out
}

type LanguageRow = { language: string; level: string }

function normalizeLanguagesDetail(raw: unknown): LanguageRow[] {
  if (!Array.isArray(raw)) return []
  const out: LanguageRow[] = []
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue
    const o = row as Record<string, unknown>
    const language = typeof o.language === 'string' ? o.language.trim() : ''
    const level = typeof o.level === 'string' ? o.level.trim() : ''
    if (language) out.push({ language, level })
  }
  return out
}

function normalizePortfolio(raw: unknown): PortfolioItem[] {
  if (!Array.isArray(raw)) return []
  const out: PortfolioItem[] = []
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue
    const o = row as Record<string, unknown>
    const src = typeof o.src === 'string' ? o.src.trim() : ''
    const caption = typeof o.caption === 'string' ? o.caption.trim() : undefined
    if (src) out.push({ src, caption })
  }
  return out
}

function normalizeCertifications(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  return raw.filter((x): x is string => typeof x === 'string' && x.trim().length > 0).map((s) => s.trim())
}

function regionsOverlap(a: string[], b: string[]): boolean {
  const set = new Set(a)
  return b.some((r) => set.has(r))
}

export function GuideDetail() {
  const { id } = useParams()
  const nav = useNavigate()
  const qc = useQueryClient()
  const { profile } = useAuth()

  const [date, setDate] = useState('')
  const [groupSize, setGroupSize] = useState(2)
  const [durationHours, setDurationHours] = useState(4)
  const [selectedPkg, setSelectedPkg] = useState<TourPackage | null>(null)
  const [startTime, setStartTime] = useState('')
  const [meetingPoint, setMeetingPoint] = useState('')
  const [notes, setNotes] = useState('')
  const [booking, setBooking] = useState<Booking | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const { data: g, isLoading } = useQuery({
    queryKey: ['guide', id],
    enabled: !!id,
    queryFn: () => apiFetch<Guide>(`/api/guides/profiles/${id}/`, { auth: false }),
  })

  const { data: allGuides } = useQuery({
    queryKey: ['guides', 'all-for-similar'],
    queryFn: () => apiFetch<Guide[]>('/api/guides/profiles/', { auth: false }),
    staleTime: 60_000,
  })

  useEffect(() => {
    if (g?.default_meeting_point) {
      setMeetingPoint(g.default_meeting_point)
    }
  }, [g?.default_meeting_point])

  const packages = useMemo(() => normalizeTourPackages(g?.tour_packages), [g?.tour_packages])
  const reviews = useMemo(() => normalizeReviews(g?.guest_reviews), [g?.guest_reviews])
  const langsDetail = useMemo(() => normalizeLanguagesDetail(g?.languages_detail), [g?.languages_detail])
  const portfolio = useMemo(() => normalizePortfolio(g?.portfolio_gallery), [g?.portfolio_gallery])
  const certifications = useMemo(() => normalizeCertifications(g?.certifications), [g?.certifications])

  const similarGuides: SimilarGuide[] = useMemo(() => {
    if (!allGuides || !g) return []
    const rid = g.id
    const regs = g.regions || []
    return allGuides
      .filter((o) => o.id !== rid && regionsOverlap(regs, o.regions || []))
      .sort((a, b) => parseFloat(String(b.rating_avg ?? 0)) - parseFloat(String(a.rating_avg ?? 0)))
      .slice(0, 3)
      .map((o) => ({
        id: o.id,
        headline: o.headline,
        photo: o.photo,
        username: o.username,
        display_name: o.display_name,
        rating_avg: o.rating_avg,
        rating_count: o.rating_count,
      }))
  }, [allGuides, g])

  const estimatedTotal = useMemo(() => {
    if (selectedPkg) return selectedPkg.price
    if (!g?.hourly_rate) return null
    const rate = parseFloat(g.hourly_rate)
    if (Number.isNaN(rate)) return null
    return (rate * durationHours * groupSize).toFixed(2)
  }, [g?.hourly_rate, durationHours, groupSize, selectedPkg])

  const selectedPackageId = selectedPkg?.id ?? ''

  const createMut = useMutation({
    mutationFn: () =>
      apiFetch<Booking>('/api/guides/bookings/', {
        method: 'POST',
        body: JSON.stringify({
          guide: Number(id),
          date,
          group_size: groupSize,
          duration_hours: selectedPkg ? selectedPkg.hours : durationHours,
          package_id: selectedPackageId,
          start_time: startTime && /^\d{2}:\d{2}$/.test(startTime) ? `${startTime}:00` : null,
          meeting_point: meetingPoint,
          notes,
        }),
      }),
    onSuccess: (b) => {
      setBooking(b)
      void qc.invalidateQueries({ queryKey: ['guide-bookings'] })
    },
    onError: (e) => setErr(e instanceof ApiError ? e.message : "We couldn't save that booking. Try again in a moment."),
  })

  const payMut = useMutation({
    mutationFn: (bid: number) =>
      apiFetch<{ status: string; mock_payment_ref: string }>(`/api/guides/bookings/${bid}/mock_pay/`, {
        method: 'POST',
        body: JSON.stringify({}),
      }),
    onSuccess: (r) => {
      setBooking((b) => (b ? { ...b, status: r.status, mock_payment_ref: r.mock_payment_ref } : b))
    },
    onError: (e) => setErr(e instanceof ApiError ? e.message : "The practice payment didn't go through. You can try again."),
  })

  if (isLoading || !g) {
    return (
      <div className="gd-detail">
        <div className="skeleton gd-detail__skeleton" />
      </div>
    )
  }

  const displayName = g.display_name?.trim() || g.username
  const bookingStep = booking?.status === 'confirmed' ? 3 : booking ? 2 : 1
  const responseH = g.response_hours_typical ?? 0

  const publicBlocks = (
    <>
      {responseH > 0 ? <GuideResponseBadge hours={responseH} /> : null}

      {packages.length > 0 ? (
        <GuideTourPackages
          packages={packages}
          selectedId={null}
          onSelect={() => {}}
          selectable={false}
        />
      ) : null}

      <GuidePortfolio items={portfolio} />

      <GuideCredentials
        yearsGuiding={g.years_guiding}
        licensed={g.licensed_guide}
        certifications={certifications}
        languagesDetail={langsDetail}
        fallbackLanguages={g.languages || []}
      />

      {g.bio ? (
        <section className="gd-detail__bio">
          <h2 className="gd-detail__section-label">About</h2>
          <p className="gd-detail__bio-text">{g.bio}</p>
        </section>
      ) : null}

      {g.specialities && g.specialities.length > 0 ? (
        <section className="gd-detail__specialities">
          <h2 className="gd-detail__section-label">Specialities</h2>
          <div className="chip-row">
            {g.specialities.map((s) => (
              <span key={s} className="chip chip--muted">
                {s}
              </span>
            ))}
          </div>
        </section>
      ) : null}

      <section className="acc-detail__reviews gd-detail__reviews" aria-labelledby="gd-reviews-heading">
        <h2 id="gd-reviews-heading" className="acc-detail__section-label acc-detail__section-label--reviews">
          Guest reviews
        </h2>
        <div className="acc-detail__reviews-summary card">
          {g.rating_avg != null ? (
            <>
              <div className="acc-detail__reviews-score">
                <MiniRating rating={g.rating_avg} count={g.rating_count} />
              </div>
              <p className="acc-detail__reviews-summary-text">
                {g.rating_count != null && g.rating_count > 0
                  ? `Based on ${g.rating_count} ${g.rating_count === 1 ? 'rating' : 'ratings'} from verified tours on DELVE.`
                  : 'Overall guest score for this guide.'}
                {reviews.length > 0
                  ? ` Below are ${reviews.length} recent ${reviews.length === 1 ? 'review' : 'reviews'}.`
                  : null}
              </p>
            </>
          ) : (
            <p className="acc-detail__reviews-summary-text acc-detail__reviews-summary-text--solo">
              Ratings and written reviews will appear as guests complete tours on DELVE.
            </p>
          )}
        </div>
        {reviews.length > 0 ? (
          <div className="acc-detail__review-list">
            {reviews.map((r, i) => (
              <GuestReviewCard key={`${i}-${r.name}`} r={r} />
            ))}
          </div>
        ) : (
          <p className="acc-detail__reviews-empty" role="status">
            No written reviews yet — the score above reflects overall ratings. New comments show here after each tour.
          </p>
        )}
      </section>
    </>
  )

  // Auth gate — show profile info then gate the booking form
  if (!profile) {
    return (
      <div className="gd-detail">
        <Link to="/guides" className="gd-detail__back">
          ← Back to guides
        </Link>
        <GuideProfileTop g={g} displayName={displayName} />
        {publicBlocks}
        <div className="gd-detail__gate card">
          <h2 className="gd-detail__gate-title">Sign in to book or message</h2>
          <p className="gd-detail__gate-text">
            A free account lets you message this guide and request a date. You can browse every profile without signing in.
          </p>
          <div className="gd-detail__gate-actions">
            <Link to="/login" className="btn btn-primary btn-block">
              Sign in
            </Link>
            <Link to="/register" className="btn btn-ghost btn-block">
              Create free account
            </Link>
          </div>
        </div>
        <GuideSimilarGuides guides={similarGuides} />
        <button type="button" className="btn btn-ghost btn-block gd-detail__back-btn" onClick={() => nav(-1)}>
          Go back
        </button>
      </div>
    )
  }

  if (!profile.email_verified) {
    return (
      <div className="gd-detail">
        <Link to="/guides" className="gd-detail__back">
          ← Back to guides
        </Link>
        <GuideProfileTop g={g} displayName={displayName} />
        {publicBlocks}
        <div className="gd-detail__gate card">
          <h2 className="gd-detail__gate-title">Verify your email</h2>
          <p className="gd-detail__gate-text">A confirmed address helps guides reply to you. It only takes a moment.</p>
          <Link to="/verify-email" className="btn btn-primary btn-block">
            Verify email
          </Link>
          <Link to="/guides" className="gd-detail__gate-back">
            ← Back to guides
          </Link>
        </div>
        <GuideSimilarGuides guides={similarGuides} />
        <button type="button" className="btn btn-ghost btn-block gd-detail__back-btn" onClick={() => nav(-1)}>
          Go back
        </button>
      </div>
    )
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setErr(null)
    if (!date) {
      setErr('Please pick a date.')
      return
    }
    createMut.mutate()
  }

  const onPackageSelect = (pkg: TourPackage | null) => {
    setSelectedPkg(pkg)
    if (pkg) setDurationHours(pkg.hours)
  }

  return (
    <div className="gd-detail">
      <Link to="/guides" className="gd-detail__back">
        ← Back to guides
      </Link>

      <GuideProfileTop g={g} displayName={displayName} />

      {responseH > 0 ? <GuideResponseBadge hours={responseH} /> : null}

      <div className="gd-detail__cta-row">
        {g.user ? <GuideAskButton guideUserId={g.user} label="Send a question" /> : null}
      </div>

      <GuidePortfolio items={portfolio} />

      <GuideCredentials
        yearsGuiding={g.years_guiding}
        licensed={g.licensed_guide}
        certifications={certifications}
        languagesDetail={langsDetail}
        fallbackLanguages={g.languages || []}
      />

      {g.bio ? (
        <section className="gd-detail__bio">
          <h2 className="gd-detail__section-label">About</h2>
          <p className="gd-detail__bio-text">{g.bio}</p>
        </section>
      ) : null}

      {g.specialities && g.specialities.length > 0 ? (
        <section className="gd-detail__specialities">
          <h2 className="gd-detail__section-label">Specialities</h2>
          <div className="chip-row">
            {g.specialities.map((s) => (
              <span key={s} className="chip chip--muted">
                {s}
              </span>
            ))}
          </div>
        </section>
      ) : null}

      <section className="acc-detail__reviews gd-detail__reviews" aria-labelledby="gd-reviews-heading2">
        <h2 id="gd-reviews-heading2" className="acc-detail__section-label acc-detail__section-label--reviews">
          Guest reviews
        </h2>
        <div className="acc-detail__reviews-summary card">
          {g.rating_avg != null ? (
            <>
              <div className="acc-detail__reviews-score">
                <MiniRating rating={g.rating_avg} count={g.rating_count} />
              </div>
              <p className="acc-detail__reviews-summary-text">
                {g.rating_count != null && g.rating_count > 0
                  ? `Based on ${g.rating_count} ${g.rating_count === 1 ? 'rating' : 'ratings'} from verified tours on DELVE.`
                  : 'Overall guest score for this guide.'}
                {reviews.length > 0
                  ? ` Below are ${reviews.length} recent ${reviews.length === 1 ? 'review' : 'reviews'}.`
                  : null}
              </p>
            </>
          ) : (
            <p className="acc-detail__reviews-summary-text acc-detail__reviews-summary-text--solo">
              Ratings and written reviews will appear as guests complete tours on DELVE.
            </p>
          )}
        </div>
        {reviews.length > 0 ? (
          <div className="acc-detail__review-list">
            {reviews.map((r, i) => (
              <GuestReviewCard key={`${i}-${r.name}`} r={r} />
            ))}
          </div>
        ) : (
          <p className="acc-detail__reviews-empty" role="status">
            No written reviews yet — the score above reflects overall ratings.
          </p>
        )}
      </section>

      <section className="gd-detail__book">
        <ol className="acc-book__steps" aria-label="Booking steps">
          <li
            className={`acc-book__step${bookingStep === 1 ? ' acc-book__step--active' : ''}${bookingStep > 1 ? ' acc-book__step--done' : ''}`}
          >
            <span className="acc-book__step-num">1</span>
            <span className="acc-book__step-label">Details</span>
          </li>
          <li
            className={`acc-book__step${bookingStep === 2 ? ' acc-book__step--active' : ''}${bookingStep > 2 ? ' acc-book__step--done' : ''}`}
          >
            <span className="acc-book__step-num">2</span>
            <span className="acc-book__step-label">Review</span>
          </li>
          <li className={`acc-book__step${bookingStep === 3 ? ' acc-book__step--active' : ''}`}>
            <span className="acc-book__step-num">3</span>
            <span className="acc-book__step-label">Done</span>
          </li>
        </ol>

        {err ? <div className="error-banner">{err}</div> : null}

        {!booking && (
          <form className="acc-book__form card" onSubmit={handleSubmit}>
            <h2 className="gd-detail__book-form-title">Request a booking</h2>
            <p className="gd-detail__book-form-lead">
              Pick a package or set your own duration, then add group size, time, and where to meet.
            </p>

            {packages.length > 0 ? (
              <GuideTourPackages
                packages={packages}
                selectedId={selectedPackageId}
                onSelect={onPackageSelect}
                selectable
              />
            ) : null}

            {!selectedPkg ? (
              <div className="field">
                <label className="label">Duration (custom)</label>
                <div className="gd-detail__duration-row" role="group" aria-label="Select duration">
                  {[2, 4, 6, 8].map((hours) => (
                    <button
                      key={hours}
                      type="button"
                      className={`gd-detail__dur-btn${durationHours === hours ? ' gd-detail__dur-btn--active' : ''}`}
                      aria-pressed={durationHours === hours}
                      onClick={() => setDurationHours(hours)}
                    >
                      {hours} hrs
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="field">
              <label className="label" htmlFor="gd-date">
                Date
              </label>
              <input
                id="gd-date"
                className="input"
                type="date"
                required
                min={new Date().toISOString().split('T')[0]}
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>

            <div className="field">
              <label className="label" htmlFor="gd-group">
                Group size
              </label>
              <input
                id="gd-group"
                className="input"
                type="number"
                min={1}
                max={30}
                required
                value={groupSize}
                onChange={(e) => setGroupSize(Math.max(1, Number(e.target.value) || 1))}
              />
              <p className="gd-detail__field-hint">Total people on this booking — affects the estimate when using hourly pricing.</p>
            </div>

            <div className="field">
              <label className="label" htmlFor="gd-time">
                Start time
              </label>
              <div className="gd-detail__time-presets" role="group" aria-label="Quick time presets">
                {TIME_PRESETS.map(({ label, value }) => (
                  <button
                    key={value}
                    type="button"
                    className={`gd-detail__time-preset${startTime === value ? ' gd-detail__time-preset--active' : ''}`}
                    onClick={() => setStartTime(value)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <input
                id="gd-time"
                className="input gd-detail__time-input"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>

            <div className="field">
              <label className="label" htmlFor="gd-meet">
                Meeting point
              </label>
              <textarea
                id="gd-meet"
                className="input"
                rows={2}
                value={meetingPoint}
                onChange={(e) => setMeetingPoint(e.target.value)}
                placeholder="e.g. hotel lobby, landmark, or station exit"
              />
            </div>

            {estimatedTotal ? (
              <div className="acc-book__nights-summary">
                <span className="acc-book__nights-count">
                  {selectedPkg ? selectedPkg.title : `${durationHours} hrs × ${groupSize} guests`}
                </span>
                <span className="acc-book__nights-est">≈ ${estimatedTotal} estimated</span>
              </div>
            ) : null}

            <div className="field">
              <label className="label" htmlFor="gd-notes">
                Notes for your guide (optional)
              </label>
              <textarea
                id="gd-notes"
                className="input"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Interests, mobility, or anything the guide should know…"
              />
            </div>

            <p className="acc-book__avail-note" role="note">
              <span className="acc-book__avail-icon" aria-hidden>
                ℹ
              </span>
              Availability is subject to guide confirmation — you&apos;ll hear back once booking goes live on DELVE.
            </p>

            <button type="submit" className="btn btn-primary btn-block" disabled={createMut.isPending}>
              {createMut.isPending ? 'Saving…' : 'Continue to review'}
            </button>
          </form>
        )}

        {booking?.status === 'pending' && (
          <div className="acc-book__pay card">
            <h2 className="acc-book__pay-title">Review (demo)</h2>
            <p className="acc-book__pay-total">
              <span className="acc-book__pay-label">Total for this practice flow</span>
              <strong>${booking.total_price}</strong>
            </p>
            <p className="acc-book__pay-note">
              Tapping below runs a <strong>simulated</strong> payment — like trying on the experience. No bank or card is charged in
              DELVE today.
            </p>
            <button
              type="button"
              className="btn btn-primary btn-block"
              onClick={() => payMut.mutate(booking.id)}
              disabled={payMut.isPending}
            >
              {payMut.isPending ? 'Processing…' : 'Run practice payment'}
            </button>
          </div>
        )}

        {booking?.status === 'confirmed' && (
          <div className="acc-book__success card">
            <h2 className="acc-book__success-title">Flow complete</h2>
            <p className="acc-book__success-text">
              In a live product, you&apos;d get a confirmation for you and the guide. Here, you&apos;ve seen the full path — same
              care, no real money moved.
            </p>
            <p className="acc-book__ref">
              Reference: <code>{booking.mock_payment_ref}</code>
            </p>
            <Link to="/guides" className="btn btn-primary btn-block">
              Explore more guides
            </Link>
          </div>
        )}
      </section>

      <GuideSimilarGuides guides={similarGuides} />

      <button type="button" className="btn btn-ghost btn-block gd-detail__back-btn" onClick={() => nav(-1)}>
        Go back
      </button>
    </div>
  )
}

function GuideProfileTop({ g, displayName }: { g: Guide; displayName: string }) {
  return (
    <div className="gd-detail__profile">
      <div className="gd-detail__profile-top">
        <div className="gd-detail__photo-wrap">
          {g.photo ? (
            <img className="gd-detail__photo" src={mediaUrl(g.photo) || ''} alt={displayName} />
          ) : (
            <div className="gd-detail__photo gd-detail__photo--placeholder">
              <span className="gd-detail__photo-initials" aria-hidden>
                {displayName.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
        </div>

        <div className="gd-detail__info">
          <h1 className="display gd-detail__name">{displayName}</h1>
          <p className="gd-detail__username">@{g.username}</p>

          {g.rating_avg != null && (
            <div className="gd-detail__rating">
              <span className="gd-detail__rating-star">★</span>
              <span className="gd-detail__rating-val">{parseFloat(g.rating_avg).toFixed(1)}</span>
              {g.rating_count ? (
                <span className="gd-detail__rating-count">
                  {g.rating_count} {g.rating_count === 1 ? 'rating' : 'ratings'}
                </span>
              ) : null}
            </div>
          )}

          {g.hourly_rate && (
            <div className="gd-detail__rate-badge">
              <span className="gd-detail__rate-amount">${g.hourly_rate}</span>
              <span className="gd-detail__rate-unit"> / hr</span>
            </div>
          )}
        </div>
      </div>

      <p className="gd-detail__headline">{g.headline}</p>

      {g.languages && g.languages.length > 0 ? (
        <div className="gd-detail__langs chip-row">
          {g.languages.map((l) => (
            <span key={l} className="chip">
              {l}
            </span>
          ))}
        </div>
      ) : null}

      {g.regions && g.regions.length > 0 ? (
        <div className="gd-detail__regions chip-row">
          {g.regions.map((r) => (
            <span key={r} className="chip chip--muted">
              {r}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  )
}
