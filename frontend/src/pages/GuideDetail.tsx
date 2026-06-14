import { useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import type { LucideIcon } from 'lucide-react'
import {
  BadgeCheck,
  BadgeDollarSign,
  Binoculars,
  CalendarDays,
  Camera,
  Clock,
  Compass,
  Landmark,
  Languages,
  MapPin,
  MessageCircle,
  Route,
  UserRound,
  Users,
  Utensils,
} from 'lucide-react'
import { apiFetch, mediaUrl } from '../api/client'
import { GuideRequestPanel } from '../components/booking'
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

type GuideComment = { id: string; author: string; body: string; ago: string }

const SEED_QUESTIONS: GuideComment[] = [
  { id: 'q1', author: 'Mila K.', body: 'Can you pick us up at the hotel?', ago: '3h ago' },
  { id: 'q2', author: 'Jonas T.', body: 'Is this suitable for families with kids?', ago: '1d ago' },
]

type LanguageRow = { language: string; level: string }

type WhyHighlight = { label: string; Icon: LucideIcon }

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

function buildWhyBookHighlights(g: Guide): WhyHighlight[] {
  const items: WhyHighlight[] = [
    { label: 'Local knowledge', Icon: Compass },
    { label: 'Private experiences', Icon: Users },
  ]
  if (g.default_meeting_point || g.regions?.length) {
    items.push({ label: 'Flexible routes', Icon: Route })
  }
  if (g.languages?.[0]) {
    items.push({ label: `Speaks ${g.languages[0]}`, Icon: Languages })
  }
  if (g.response_hours_typical != null && g.response_hours_typical <= 6) {
    items.push({ label: 'Fast response', Icon: Clock })
  }
  if (g.years_guiding != null && g.years_guiding >= 3) {
    items.push({ label: `${g.years_guiding} years guiding`, Icon: BadgeCheck })
  }

  const specs = (g.specialities || []).join(' ').toLowerCase()
  if (specs.includes('culture') || specs.includes('history') || specs.includes('architecture')) {
    items.push({ label: 'Culture specialist', Icon: Landmark })
  }
  if (specs.includes('wildlife') || specs.includes('nature') || specs.includes('safari')) {
    items.push({ label: 'Wildlife specialist', Icon: Binoculars })
  }
  if (specs.includes('food') || specs.includes('culinary')) {
    items.push({ label: 'Food tour host', Icon: Utensils })
  }
  if (specs.includes('photography') || specs.includes('photo')) {
    items.push({ label: 'Photography friendly', Icon: Camera })
  }
  if (specs.includes('family')) {
    items.push({ label: 'Family friendly', Icon: Users })
  }

  const unique: WhyHighlight[] = []
  for (const item of items) {
    if (!unique.some((u) => u.label === item.label)) unique.push(item)
    if (unique.length >= 6) break
  }
  return unique
}

function guideTrustBadges(g: Guide): string[] {
  const badges: string[] = []
  if (g.licensed_guide) badges.push('Licensed guide')
  else badges.push('Guide profile')
  const rating = parseFloat(g.rating_avg ?? '0')
  if (g.rating_avg != null && rating >= 4.5) badges.push('Highly rated')
  else if (g.rating_count && g.rating_count >= 5) badges.push('Traveller rated')
  if (g.response_hours_typical != null && g.response_hours_typical <= 6) badges.push('Fast response')
  return badges.slice(0, 3)
}

function GuideAvatar({ photo, name, className = '' }: { photo: string | null; name: string; className?: string }) {
  const resolved = mediaUrl(photo)
  if (resolved) {
    return <img className={className} src={resolved} alt={name} />
  }
  return (
    <div className={`gd-detail__hero-photo gd-detail__hero-photo--placeholder ${className}`.trim()} aria-hidden={false}>
      <UserRound size={48} strokeWidth={1.5} className="gd-detail__avatar-icon" aria-hidden />
    </div>
  )
}

export function GuideDetail() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const { profile } = useAuth()

  const [saved, setSaved] = useState(false)
  const [shareMsg, setShareMsg] = useState('')
  const [commentDraft, setCommentDraft] = useState('')
  const [questions, setQuestions] = useState<GuideComment[]>(SEED_QUESTIONS)

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
          iconElement={<Compass size={28} strokeWidth={1.75} />}
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
          iconElement={<Compass size={28} strokeWidth={1.75} />}
          title="Guide not found"
          sub="This guide profile may have been removed or the link is incorrect."
          cta={{ label: 'Browse guides', to: '/guides' }}
        />
      </DetailPage>
    )
  }

  const displayName = g.display_name?.trim() || g.username || 'Guide'
  const responseH = g.response_hours_typical ?? 0
  const whyHighlights = buildWhyBookHighlights(g)
  const rateLabel = g.hourly_rate ? `From $${g.hourly_rate}/hr` : 'Price on request'
  const regionLine = (g.regions || []).slice(0, 2).join(' · ')
  const trustItems = guideTrustBadges(g)
  const specialityLabel = (g.specialities || [])[0] || 'Local guide'

  const initialPackageId = searchParams.get('package') ?? ''
  const initialDate = searchParams.get('date') ?? ''
  const initialGuests = parseInt(searchParams.get('guests') ?? '2', 10)

  const bookingCard = (
    <div id="guide-request-panel">
      <GuideRequestPanel
        guideId={g.id}
        guideUserId={g.user}
        guideHeadline={g.headline}
        guideDisplayName={displayName}
        guideUsername={g.username}
        regionLine={regionLine}
        languages={g.languages}
        rateLabel={rateLabel}
        hourlyRate={g.hourly_rate}
        packages={packages}
        initialPackageId={initialPackageId}
        initialDate={initialDate}
        initialGroupSize={Number.isNaN(initialGuests) ? 2 : initialGuests}
        defaultMeetingPoint={g.default_meeting_point ?? ''}
        profile={profile}
      />
    </div>
  )

  const hasCredentials =
    (g.years_guiding != null && g.years_guiding > 0) ||
    g.licensed_guide ||
    certifications.length > 0 ||
    langsDetail.length > 0 ||
    (g.languages && g.languages.length > 0)

  const scrollToRequest = () => {
    document.getElementById('guide-request-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const mobileSubtitle = [g.hourly_rate ? `From $${g.hourly_rate}/hr` : null, regionLine || null]
    .filter(Boolean)
    .join(' · ')

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
            <GuideAvatar photo={g.photo} name={displayName} className="gd-detail__hero-photo" />
          </div>
        </section>
      </DetailHeroWrap>

      <section className="gd-detail__identity detail-section">
        <div className="gd-detail__meta-row">
          <span className="gd-detail__pill">
            <Compass size={13} strokeWidth={2.25} aria-hidden />
            {specialityLabel}
          </span>
          {g.rating_avg != null ? (
            <span className="gd-detail__pill gd-detail__pill--rating">
              <MiniRating rating={g.rating_avg} count={g.rating_count} />
            </span>
          ) : null}
          {regionLine ? (
            <span className="gd-detail__pill gd-detail__pill--location">
              <MapPin size={13} strokeWidth={2.25} aria-hidden />
              {regionLine}
            </span>
          ) : null}
        </div>

        <h1 className="display gd-detail__title">{g.headline}</h1>
        <p className="gd-detail__byline">
          <UserRound size={14} strokeWidth={2.25} aria-hidden />
          {displayName}
          <span className="gd-detail__username">
            {' '}
            · <Link to={`/u/${encodeURIComponent(g.username)}`}>@{g.username}</Link>
          </span>
        </p>

        <div className="gd-detail__stats">
          {g.hourly_rate ? (
            <span className="gd-detail__stat gd-detail__stat--price">
              <BadgeDollarSign size={15} strokeWidth={2.25} aria-hidden />
              From ${g.hourly_rate}
              <span className="gd-detail__stat-unit"> / hr</span>
            </span>
          ) : null}
          {g.languages?.length > 0 ? (
            <span className="gd-detail__stat">
              <Languages size={15} strokeWidth={2.25} aria-hidden />
              {g.languages.slice(0, 3).join(', ')}
            </span>
          ) : null}
          {responseH > 0 ? (
            <span className="gd-detail__stat">
              <Clock size={15} strokeWidth={2.25} aria-hidden />
              Responds in {responseH}h
            </span>
          ) : null}
          {g.years_guiding != null && g.years_guiding > 0 ? (
            <span className="gd-detail__stat">
              <BadgeCheck size={15} strokeWidth={2.25} aria-hidden />
              {g.years_guiding} {g.years_guiding === 1 ? 'year' : 'years'} guiding
            </span>
          ) : null}
        </div>

        <TrustBadgeRow items={trustItems} className="gd-detail__trust-row" />

        <SocialActionRow saved={saved} onSave={() => setSaved((v) => !v)} onShare={() => onShare(displayName)}>
          {g.user && profile?.email_verified ? (
            <GuideAskButton guideUserId={g.user} label="Message guide" />
          ) : (
            <button type="button" className="gd-detail__message-btn" onClick={() => nav('/login')}>
              <MessageCircle size={15} strokeWidth={2.25} aria-hidden />
              Message guide
            </button>
          )}
        </SocialActionRow>
      </section>

      <DetailLayout
        main={
          <>
            <section className="detail-section gd-detail__why">
              <h2 className="gd-detail__section-title">Why book this guide</h2>
              <div className="gd-detail__why-grid">
                {whyHighlights.map(({ label, Icon }) => (
                  <div key={label} className="gd-detail__why-card">
                    <Icon size={18} strokeWidth={2.25} aria-hidden />
                    <span>{label}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="detail-section gd-detail__about">
              <h2 className="gd-detail__section-title">About this guide</h2>
              {responseH > 0 ? <GuideResponseBadge hours={responseH} /> : null}
              {g.bio?.trim() ? (
                <p className="gd-detail__bio-text">{g.bio}</p>
              ) : (
                <p className="gd-detail__bio-text gd-detail__bio-text--fallback">
                  This guide has not added a full bio yet. You can still view available experiences or send a message.
                </p>
              )}
            </section>

            <section className="detail-section gd-detail__meta-grid-section">
              <h2 className="gd-detail__section-title">Guide details</h2>
              <div className="gd-detail__meta-grid">
                {g.specialities && g.specialities.length > 0 ? (
                  <div className="gd-detail__meta-block">
                    <h3 className="gd-detail__meta-label">
                      <Compass size={15} strokeWidth={2.25} aria-hidden />
                      Specialities
                    </h3>
                    <div className="gd-detail__chip-row">
                      {g.specialities.map((s) => (
                        <span key={s} className="gd-detail__chip">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}
                {g.regions && g.regions.length > 0 ? (
                  <div className="gd-detail__meta-block">
                    <h3 className="gd-detail__meta-label">
                      <MapPin size={15} strokeWidth={2.25} aria-hidden />
                      Regions covered
                    </h3>
                    <div className="gd-detail__chip-row">
                      {g.regions.map((r) => (
                        <span key={r} className="gd-detail__chip">
                          {r}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}
                {g.languages && g.languages.length > 0 ? (
                  <div className="gd-detail__meta-block">
                    <h3 className="gd-detail__meta-label">
                      <Languages size={15} strokeWidth={2.25} aria-hidden />
                      Languages
                    </h3>
                    <div className="gd-detail__chip-row">
                      {g.languages.map((l) => (
                        <span key={l} className="gd-detail__chip">
                          {l}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </section>

            <section className="detail-section gd-detail__packages-block">
              {packages.length > 0 ? (
                <GuideTourPackages
                  packages={packages}
                  selectedId={selectedPackageId}
                  onSelect={onPackageSelect}
                  selectable
                  guideId={Number(id)}
                  title="Experiences & packages"
                  intro="Book a set itinerary or compare packages before you request a guide."
                />
              ) : (
                <div className="gd-detail__section-empty">
                  <h2 className="gd-detail__section-title">Experiences & packages</h2>
                  <p className="gd-detail__section-empty-title">No experiences listed yet</p>
                  <p className="gd-detail__section-empty-sub">
                    This guide&apos;s packages will appear here once added. You can still message the guide.
                  </p>
                  {g.user && profile?.email_verified ? (
                    <GuideAskButton guideUserId={g.user} label="Message guide" />
                  ) : null}
                </div>
              )}
            </section>

            <section className="detail-section gd-detail__portfolio-block">
              {portfolio.length > 0 ? (
                <GuidePortfolio items={portfolio} title="Portfolio & photos" />
              ) : (
                <div className="gd-detail__section-empty">
                  <h2 className="gd-detail__section-title">Portfolio & photos</h2>
                  <p className="gd-detail__section-empty-sub">
                    Portfolio photos will appear here once this guide adds them.
                  </p>
                </div>
              )}
            </section>

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
                        ? `Based on ${g.rating_count} ${g.rating_count === 1 ? 'rating' : 'ratings'} from completed experiences on DELVE.`
                        : 'Overall guest score for this guide.'}
                    </p>
                  </>
                ) : (
                  <p className="acc-detail__reviews-summary-text acc-detail__reviews-summary-text--solo">
                    Reviews will appear here after travellers complete experiences with this guide.
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
                  Reviews will appear here after travellers complete experiences with this guide.
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
              title="Ask this guide"
              subtitle="Ask about routes, availability, languages, pickup, group size, or what to bring."
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
          </>
        }
        sidebar={bookingCard}
      />

      <MobileStickyCTA
        title={g.headline}
        subtitle={mobileSubtitle || displayName}
        action={
          <button type="button" className="btn btn-primary" onClick={scrollToRequest}>
            Request guide
          </button>
        }
        className="gd-detail__mobile-bar"
      />
    </DetailPage>
  )
}
