import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch, mediaUrl } from '../api/client'
import { friendlyApiMessage } from '../utils/friendlyError'
import { useAuth } from '../auth/AuthContext'
import { GuestReviewCard, normalizeReviews } from '../components/GuestReviewCard'
import { GuideAskButton } from '../components/guide/GuideAskButton'
import { GuideCredentials } from '../components/guide/GuideCredentials'
import { GuidePortfolio, type PortfolioItem } from '../components/guide/GuidePortfolio'
import { GuideResponseBadge } from '../components/guide/GuideResponseBadge'
import { GuideSimilarGuides, type SimilarGuide } from '../components/guide/GuideSimilarGuides'
import { GuideTourPackages, type TourPackage } from '../components/guide/GuideTourPackages'
import { MiniRating } from '../components/MiniRating'
import { normalizeTourPackages } from '../utils/tourPackages'
import {
  CommentBox,
  DelversMoments,
  DetailActionCard,
  DetailHeroWrap,
  DetailLayout,
  DetailPage,
  DetailSkeleton,
  MobileStickyCTA,
  SocialActionRow,
  TrustBadgeRow,
} from '../components/detail'
import { EmptyState } from '../components/ui'

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

type GuideComment = { id: string; author: string; body: string; ago: string }

const TIME_PRESETS: { label: string; value: string }[] = [
  { label: 'Morning', value: '09:00' },
  { label: 'Midday', value: '12:00' },
  { label: 'Afternoon', value: '15:00' },
  { label: 'Evening', value: '18:00' },
]

const SEED_QUESTIONS: GuideComment[] = [
  { id: 'q1', author: 'Mila K.', body: 'Can you pick us up at the hotel?', ago: '3h ago' },
  { id: 'q2', author: 'Jonas T.', body: 'Is this suitable for families with kids?', ago: '1d ago' },
]

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

function whyBookGuide(g: Guide): string[] {
  const items = [
    'Local knowledge',
    'Private routes',
    g.default_meeting_point || g.regions?.length ? 'Flexible meeting point' : null,
    g.languages?.[0] ? `Speaks ${g.languages[0]}` : null,
    g.response_hours_typical != null && g.response_hours_typical <= 6 ? 'Fast response' : null,
    g.licensed_guide ? 'Verified guide' : null,
    g.years_guiding != null && g.years_guiding >= 3 ? `${g.years_guiding} years guiding` : null,
  ].filter(Boolean) as string[]

  const unique: string[] = []
  for (const item of items) {
    if (!unique.includes(item)) unique.push(item)
    if (unique.length >= 6) break
  }
  return unique
}

export function GuideDetail() {
  const { id } = useParams()
  const nav = useNavigate()
  const [searchParams] = useSearchParams()
  const qc = useQueryClient()
  const { profile } = useAuth()

  const [saved, setSaved] = useState(false)
  const [shareMsg, setShareMsg] = useState('')
  const [date, setDate] = useState('')
  const [groupSize, setGroupSize] = useState(2)
  const [durationHours, setDurationHours] = useState(4)
  const [selectedPkg, setSelectedPkg] = useState<TourPackage | null>(null)
  const [startTime, setStartTime] = useState('')
  const [meetingPoint, setMeetingPoint] = useState('')
  const [notes, setNotes] = useState('')
  const [showExtraFields, setShowExtraFields] = useState(false)
  const [commentDraft, setCommentDraft] = useState('')
  const [questions, setQuestions] = useState<GuideComment[]>(SEED_QUESTIONS)
  const [booking, setBooking] = useState<Booking | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const { data: g, isLoading, isError, refetch } = useQuery({
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

  useEffect(() => {
    if (!g) return
    const slug = searchParams.get('package')
    if (slug) {
      const list = normalizeTourPackages(g.tour_packages)
      const pkg = list.find((p) => p.id === slug)
      if (pkg) {
        setSelectedPkg(pkg)
        setDurationHours(pkg.hours)
      }
    }
  }, [g, searchParams])

  const estimatedTotal = useMemo(() => {
    if (selectedPkg) return selectedPkg.price
    if (!g?.hourly_rate) return null
    const rate = parseFloat(g.hourly_rate)
    if (Number.isNaN(rate)) return null
    return (rate * durationHours * groupSize).toFixed(0)
  }, [g?.hourly_rate, durationHours, groupSize, selectedPkg])

  const selectedPackageId = selectedPkg?.id ?? ''
  const todayStr = new Date().toISOString().split('T')[0]

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
    onError: (e) => setErr(friendlyApiMessage(e, "We couldn't save that booking. Try again in a moment.")),
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
    onError: (e) => setErr(friendlyApiMessage(e, "The practice payment didn't go through. You can try again.")),
  })

  const onShare = async (title: string) => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setShareMsg(`Link to ${title} copied`)
      window.setTimeout(() => setShareMsg(''), 1600)
    } catch {
      setShareMsg('Copy failed')
      window.setTimeout(() => setShareMsg(''), 1600)
    }
  }

  const onPackageSelect = (pkg: TourPackage | null) => {
    setSelectedPkg(pkg)
    if (pkg) setDurationHours(pkg.hours)
  }

  const handleRequestBooking = (e?: React.FormEvent) => {
    e?.preventDefault()
    setErr(null)
    if (!profile) {
      nav('/login')
      return
    }
    if (!profile.email_verified) {
      nav('/verify-email')
      return
    }
    if (!date) {
      setErr('Please pick a date.')
      return
    }
    createMut.mutate()
  }

  const postQuestion = () => {
    const body = commentDraft.trim()
    if (!body) return
    const author = profile?.display_name?.trim() || profile?.username || 'Guest'
    setQuestions((prev) => [{ id: `local-${Date.now()}`, author, body, ago: 'Just now' }, ...prev])
    setCommentDraft('')
  }

  if (isLoading) {
    return (
      <DetailPage prefix="gd-detail" className="gd-detail--premium">
        <DetailSkeleton className="gd-detail__skeleton" />
      </DetailPage>
    )
  }

  if (isError) {
    return (
      <DetailPage prefix="gd-detail" className="gd-detail--premium">
        <EmptyState
          icon="🧭"
          title="We couldn't load this guide"
          sub="Please check your connection and try again."
          cta={{ label: 'Try again', onClick: () => void refetch() }}
        />
      </DetailPage>
    )
  }

  if (!g || !('headline' in g)) {
    return (
      <DetailPage prefix="gd-detail" className="gd-detail--premium">
        <EmptyState
          icon="🧭"
          title="Guide not found"
          sub="This profile may have been removed or the link is incorrect."
          cta={{ label: 'Browse guides', to: '/guides' }}
        />
      </DetailPage>
    )
  }

  const displayName = g.display_name?.trim() || g.username || 'Guide'
  const responseH = g.response_hours_typical ?? 0
  const loveItems = whyBookGuide(g)
  const canBook = !booking || booking.status === 'pending'
  const rateLabel = g.hourly_rate ? `From $${g.hourly_rate}/hr` : selectedPkg ? `$${selectedPkg.price}` : 'Price on request'

  const hasCredentials =
    (g.years_guiding != null && g.years_guiding > 0) ||
    g.licensed_guide ||
    certifications.length > 0 ||
    langsDetail.length > 0 ||
    (g.languages && g.languages.length > 0)

  const trustItems = [
    g.licensed_guide ? 'Verified guide' : 'Listed guide',
    responseH > 0 ? `Responds in ${responseH}h` : null,
    g.licensed_guide ? 'Licensed' : null,
    g.years_guiding != null && g.years_guiding > 0
      ? `${g.years_guiding} ${g.years_guiding === 1 ? 'year' : 'years'} guiding`
      : null,
  ].filter(Boolean) as string[]

  const bookingCard =
    canBook && !booking ? (
      <DetailActionCard kicker="Ready to explore?" title={rateLabel} className="gd-detail__booking-card">
        <form className="gd-detail__booking-form" onSubmit={handleRequestBooking}>
          {packages.length > 0 ? (
            <label className="gd-detail__booking-field">
              Package
              <select
                value={selectedPackageId}
                onChange={(e) => {
                  const pkg = packages.find((p) => p.id === e.target.value) ?? null
                  onPackageSelect(pkg)
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

          {!selectedPkg ? (
            <label className="gd-detail__booking-field">
              Duration
              <select value={durationHours} onChange={(e) => setDurationHours(Number(e.target.value))}>
                {[2, 4, 6, 8].map((hours) => (
                  <option key={hours} value={hours}>
                    {hours} hours
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <label className="gd-detail__booking-field">
            Date
            <input type="date" min={todayStr} required value={date} onChange={(e) => setDate(e.target.value)} />
          </label>

          <label className="gd-detail__booking-field">
            Start time
            <select value={startTime} onChange={(e) => setStartTime(e.target.value)}>
              <option value="">Select time</option>
              {TIME_PRESETS.map(({ label, value }) => (
                <option key={value} value={value}>
                  {label} ({value})
                </option>
              ))}
            </select>
          </label>

          <label className="gd-detail__booking-field">
            Group size
            <input
              type="number"
              min={1}
              max={30}
              required
              value={groupSize}
              onChange={(e) => setGroupSize(Math.max(1, Number(e.target.value) || 1))}
            />
          </label>

          {estimatedTotal ? (
            <div className="gd-detail__total">
              <span>Estimated total</span>
              <strong>${estimatedTotal}</strong>
            </div>
          ) : null}

          <button type="submit" className="btn btn-primary gd-detail__book-btn" disabled={createMut.isPending}>
            {createMut.isPending ? 'Saving…' : 'Request booking'}
          </button>

          <button
            type="button"
            className="gd-detail__extra-toggle"
            onClick={() => setShowExtraFields((v) => !v)}
            aria-expanded={showExtraFields}
          >
            {showExtraFields ? '− Hide meeting point and notes' : '+ Add meeting point and notes'}
          </button>

          {showExtraFields ? (
            <div className="gd-detail__extra-fields">
              <label className="gd-detail__booking-field">
                Meeting point
                <textarea
                  rows={2}
                  value={meetingPoint}
                  onChange={(e) => setMeetingPoint(e.target.value)}
                  placeholder="Hotel lobby, landmark, or station exit"
                />
              </label>
              <label className="gd-detail__booking-field">
                Notes (optional)
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Interests, mobility, or anything the guide should know"
                />
              </label>
            </div>
          ) : null}

          {g.user && profile?.email_verified ? (
            <GuideAskButton guideUserId={g.user} label="Ask a question" />
          ) : (
            <p className="gd-detail__booking-hint">
              {!profile ? 'Sign in to request a booking.' : !profile.email_verified ? 'Verify email to book.' : 'Practice flow — no real payment today.'}
            </p>
          )}
        </form>
      </DetailActionCard>
    ) : null

  return (
    <DetailPage prefix="gd-detail" className="gd-detail--premium" toast={shareMsg || null}>
      <DetailHeroWrap
        className="gd-detail__hero-wrap"
        backTo="/guides"
        backLabel="Guides"
        saved={saved}
        onSave={() => setSaved((v) => !v)}
        onShare={() => onShare(displayName)}
      >
        <section className="gd-detail__hero">
          <div className="gd-detail__hero-media">
            {g.photo ? (
              <img className="gd-detail__hero-photo" src={mediaUrl(g.photo) || ''} alt={displayName} />
            ) : (
              <div className="gd-detail__hero-photo gd-detail__hero-photo--placeholder">
                <span className="gd-detail__photo-initials">{displayName.charAt(0).toUpperCase()}</span>
              </div>
            )}
          </div>

          <div className="gd-detail__hero-body">
            <h1 className="display gd-detail__hero-name">{displayName}</h1>
            <p className="gd-detail__hero-headline">{g.headline}</p>

            {g.rating_avg != null ? (
              <div className="gd-detail__hero-rating">
                <span className="gd-detail__rating-star" aria-hidden>
                  ★
                </span>
                <span className="gd-detail__rating-val">{Number.parseFloat(g.rating_avg).toFixed(1)}</span>
                {g.rating_count != null && g.rating_count > 0 ? (
                  <span className="gd-detail__rating-count">({g.rating_count})</span>
                ) : null}
              </div>
            ) : null}

            {g.languages?.length > 0 ? (
              <p className="gd-detail__hero-meta">{g.languages.join(' · ')}</p>
            ) : null}

            {g.regions?.length > 0 ? (
              <p className="gd-detail__hero-meta gd-detail__hero-meta--regions">{g.regions.join(' · ')}</p>
            ) : null}

            <TrustBadgeRow items={trustItems} className="gd-detail__hero-trust" />

            <SocialActionRow saved={saved} onSave={() => setSaved((v) => !v)} onShare={() => onShare(displayName)}>
              {g.user && profile?.email_verified ? (
                <GuideAskButton guideUserId={g.user} label="Ask a question" />
              ) : (
                <button type="button" onClick={() => (profile ? null : nav('/login'))}>
                  Ask a question
                </button>
              )}
            </SocialActionRow>
          </div>
        </section>
      </DetailHeroWrap>

      <DetailLayout
        main={
          <>
          <section className="detail-section gd-detail__why">
            <h2 className="gd-detail__section-title">Why book this guide</h2>
            <div className="gd-detail__why-grid">
              {loveItems.map((item) => (
                <span key={item}>{item}</span>
              ))}
            </div>
          </section>

          {(g.bio?.trim() || responseH > 0) && (
            <section className="detail-section gd-detail__meet">
              <h2 className="gd-detail__section-title">Meet your guide</h2>
              {responseH > 0 ? <GuideResponseBadge hours={responseH} /> : null}
              {g.bio?.trim() ? <p className="gd-detail__bio-text">{g.bio}</p> : null}
            </section>
          )}

          {packages.length > 0 ? (
            <section className="detail-section gd-detail__packages-block">
              <GuideTourPackages
                packages={packages}
                selectedId={selectedPackageId}
                onSelect={onPackageSelect}
                selectable
                guideId={Number(id)}
              />
            </section>
          ) : null}

          {portfolio.length > 0 ? (
            <section className="detail-section gd-detail__portfolio-block">
              <GuidePortfolio items={portfolio} />
            </section>
          ) : null}

          {hasCredentials ? (
            <section className="detail-section gd-detail__credentials-block">
              <h2 className="gd-detail__section-title">Credentials</h2>
              <GuideCredentials
                yearsGuiding={g.years_guiding}
                licensed={g.licensed_guide}
                certifications={certifications}
                languagesDetail={langsDetail}
                fallbackLanguages={g.languages || []}
                hideTitle
              />
            </section>
          ) : null}

          {g.specialities && g.specialities.length > 0 ? (
            <section className="detail-section gd-detail__specialities-block">
              <h2 className="gd-detail__section-title">What they specialise in</h2>
              <div className="chip-row">
                {g.specialities.map((s) => (
                  <span key={s} className="chip chip--muted">
                    {s}
                  </span>
                ))}
              </div>
            </section>
          ) : null}

          <section className="detail-section gd-detail__reviews-block">
            <h2 className="gd-detail__section-title">Guest reviews</h2>
            <div className="acc-detail__reviews-summary">
              {g.rating_avg != null ? (
                <>
                  <div className="acc-detail__reviews-score">
                    <MiniRating rating={g.rating_avg} count={g.rating_count} />
                  </div>
                  <p className="acc-detail__reviews-summary-text">
                    {g.rating_count != null && g.rating_count > 0
                      ? `Based on ${g.rating_count} ${g.rating_count === 1 ? 'rating' : 'ratings'} from verified tours on DELVE.`
                      : 'Overall guest score for this guide.'}
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
                No written reviews yet.
              </p>
            )}
          </section>

          <DelversMoments
            title="Delvers moments with this guide"
            subtitle="Guest photos, tour clips, route tips, and saved moments."
            moments={[
              ...portfolio.slice(0, 2).map((item, i) => ({
                id: `p-${i}`,
                image: mediaUrl(item.src) || item.src,
                author: `traveller${i + 1}`,
                body: item.caption || 'Best stop on the route.',
              })),
              { id: 'placeholder', author: 'nomad', body: 'Ask for the local food detour.' },
            ]}
            className="gd-detail__moments"
          />

          <CommentBox
            title="Questions for this guide"
            subtitle="Ask about pickup, language, group size, route, accessibility, or safety."
            placeholder="Can you pick us up at the hotel? Do you guide families?"
            draft={commentDraft}
            onDraftChange={setCommentDraft}
            onPost={postQuestion}
            postLabel="Post question"
            comments={questions.map((q) => ({
              id: q.id,
              author: q.author,
              body: q.body,
              ago: q.ago,
            }))}
            className="gd-detail__questions"
            footer={
              g.user && profile?.email_verified ? (
                <GuideAskButton guideUserId={g.user} label="Message guide" />
              ) : null
            }
          />

          {similarGuides.length > 0 ? (
            <section className="detail-section gd-detail__similar-block">
              <GuideSimilarGuides guides={similarGuides} />
            </section>
          ) : null}

          {err ? <div className="error-banner" role="alert">{err}</div> : null}

          {booking?.status === 'pending' && (
            <section className="detail-section gd-detail__booking-flow">
              <h2 className="gd-detail__section-title">Review (demo)</h2>
              <p className="gd-detail__booking-total">
                Total for this practice flow: <strong>${booking.total_price}</strong>
              </p>
              <button
                type="button"
                className="btn btn-primary btn-block"
                onClick={() => payMut.mutate(booking.id)}
                disabled={payMut.isPending}
              >
                {payMut.isPending ? 'Processing…' : 'Run practice payment'}
              </button>
            </section>
          )}

          {booking?.status === 'confirmed' && (
            <section className="detail-section gd-detail__booking-flow gd-detail__booking-flow--success">
              <h2 className="gd-detail__section-title">Booking confirmed</h2>
              <p>
                In a live product you would get a confirmation for you and the guide. Nothing was charged in this demo.
              </p>
              <p className="gd-detail__booking-ref">
                Reference: <code>{booking.mock_payment_ref}</code>
              </p>
              <Link to="/guides" className="btn btn-primary btn-block">
                Explore more guides
              </Link>
            </section>
          )}
          </>
        }
        sidebar={bookingCard}
      />

      {canBook && !booking ? (
        <MobileStickyCTA
          title={rateLabel}
          subtitle={displayName}
          action={
            <button type="button" className="btn btn-primary" onClick={() => handleRequestBooking()} disabled={createMut.isPending}>
              Request
            </button>
          }
          className="gd-detail__mobile-bar"
        />
      ) : null}
    </DetailPage>
  )
}
