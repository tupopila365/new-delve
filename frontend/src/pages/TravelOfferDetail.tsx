import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import {
  AlertCircle,
  Building2,
  CalendarRange,
  CheckCircle2,
  ClipboardList,
  IdCard,
  Play,
  ShieldCheck,
} from 'lucide-react'
import { apiFetch, mediaUrl } from '../api/client'
import {
  BusinessProfileShell,
  BusinessProfileState,
  offerCategoryLabel,
  offerEligibilityIcon,
  offerKindIcon,
  offerKindLabel,
  offerMediaList,
  type TravelOffer,
} from '../components/business'
import { MessageProviderLink } from '../components/messages'
import { MediaLightbox } from '../components/media/MediaLightbox'
import type { ListingGalleryItem } from '../components/listing/types'
import './travel-offer-detail.css'

type PublicTravelOfferDetail = TravelOffer & {
  business: {
    id: number
    business_name: string
    slug?: string
    owner_username: string
    verification_status?: string
    logo?: string | null
    city?: string
    region?: string
    showcase_as_partner?: boolean
  }
}

function formatDate(value?: string | null) {
  if (!value) return null
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

export function TravelOfferDetail() {
  const { id, offerId } = useParams()
  const businessId = Number(id)
  const offerPk = Number(offerId)
  const [activeMedia, setActiveMedia] = useState(0)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['travel-offer', id, offerId],
    queryFn: () =>
      apiFetch<PublicTravelOfferDetail>(`/api/accounts/businesses/${id}/offers/${offerId}/`, {
        auth: false,
      }),
    enabled: Boolean(id) && Boolean(offerId) && Number.isFinite(offerPk),
  })

  const offer = data ?? null
  const business = data?.business ?? null

  const media = useMemo(
    () => (offer ? offerMediaList(offer.cover_image, offer.gallery_images) : []),
    [offer],
  )

  const galleryItems = useMemo<ListingGalleryItem[]>(
    () =>
      media.map((item, idx) => ({
        id: `${item.src}-${idx}`,
        src: mediaUrl(item.src) || item.src,
        kind: item.kind === 'video' ? 'video' : 'image',
        alt: offer ? `${offer.title} media ${idx + 1}` : undefined,
      })),
    [media, offer],
  )

  const openLightbox = (index: number) => {
    setActiveMedia(index)
    setLightboxIndex(index)
  }

  if (isLoading) {
    return (
      <BusinessProfileShell title="Offer">
        <div className="skeleton tod__sk" />
      </BusinessProfileShell>
    )
  }

  if (isError) {
    return (
      <BusinessProfileShell title="Offer">
        <BusinessProfileState
          icon={<AlertCircle size={28} strokeWidth={2} />}
          title="Couldn't load this offer"
          message="Please check your connection and try again."
          cta={{ label: 'Try again', onClick: () => void refetch() }}
        />
      </BusinessProfileShell>
    )
  }

  if (!business || !offer) {
    return (
      <BusinessProfileShell title="Offer">
        <BusinessProfileState
          icon={<Building2 size={28} strokeWidth={2} />}
          title="Offer not found"
          message="This deal may have ended or the link is incorrect."
          cta={{ label: 'Back to provider', to: `/business/${businessId || id}` }}
        />
      </BusinessProfileShell>
    )
  }

  const KindIcon = offerKindIcon(offer.offer_kind)
  const WhoIcon = offerEligibilityIcon(offer.eligibility)
  const who = offer.eligibility_display || offer.eligibility_label || offer.eligibility
  const logoSrc = business.logo ? mediaUrl(business.logo) || business.logo : null
  const starts = formatDate(offer.starts_on)
  const ends = formatDate(offer.ends_on)
  const cats = (offer.categories ?? []).map(offerCategoryLabel)
  const details = offer.details?.trim() || offer.summary?.trim() || ''
  const howTo = offer.how_to_claim?.trim() || ''
  const proof = offer.proof_required?.trim() || ''
  const terms = offer.terms_note?.trim() || ''
  const hero = galleryItems[Math.min(activeMedia, Math.max(galleryItems.length - 1, 0))]
  const galleryRest = galleryItems.slice(1)

  return (
    <BusinessProfileShell title="Accessible travel">
      <article className="tod">
        {hero ? (
          <div className="tod__media">
            <button
              type="button"
              className="tod__media-hero"
              onClick={() => openLightbox(activeMedia)}
              aria-label={hero.kind === 'video' ? 'Open video fullscreen' : 'Open photo fullscreen'}
            >
              {hero.kind === 'video' ? (
                <>
                  <video src={hero.src} muted playsInline preload="metadata" />
                  <span className="tod__media-play" aria-hidden>
                    <Play size={22} strokeWidth={2.5} fill="currentColor" />
                  </span>
                </>
              ) : (
                <img src={hero.src} alt="" />
              )}
            </button>
            {galleryItems.length > 1 ? (
              <div className="tod__media-thumbs" role="tablist" aria-label="Offer photos">
                {galleryItems.map((item, idx) => (
                  <button
                    key={String(item.id ?? item.src)}
                    type="button"
                    role="tab"
                    aria-selected={idx === activeMedia}
                    className={
                      idx === activeMedia
                        ? 'tod__media-thumb tod__media-thumb--active'
                        : 'tod__media-thumb'
                    }
                    onClick={() => openLightbox(idx)}
                    aria-label={item.kind === 'video' ? 'Open video' : 'Open photo'}
                  >
                    {item.kind === 'video' ? (
                      <>
                        <video src={item.src} muted playsInline preload="metadata" />
                        <span className="tod__media-play tod__media-play--sm" aria-hidden>
                          <Play size={12} strokeWidth={2.5} fill="currentColor" />
                        </span>
                      </>
                    ) : (
                      <img src={item.src} alt="" />
                    )}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        <header className="tod__hero">
          <div className="tod__biz">
            {logoSrc ? (
              <img src={logoSrc} alt="" className="tod__logo" />
            ) : (
              <span className="tod__logo tod__logo--ph" aria-hidden>
                <Building2 size={18} strokeWidth={2} />
              </span>
            )}
            <div className="tod__biz-copy">
              <Link to={`/business/${business.id}`} className="tod__biz-name">
                {business.business_name}
              </Link>
              <span>Travel partner offer</span>
            </div>
          </div>

          <div className="tod__chips">
            <span className="tod__chip">
              <KindIcon size={13} strokeWidth={2.25} aria-hidden />
              {offerKindLabel(String(offer.offer_kind))}
            </span>
            <span className="tod__chip">
              <WhoIcon size={13} strokeWidth={2.25} aria-hidden />
              {who}
            </span>
            {business.verification_status === 'verified' ? (
              <span className="tod__chip tod__chip--muted">
                <ShieldCheck size={13} strokeWidth={2.25} aria-hidden />
                Verified provider
              </span>
            ) : null}
          </div>

          <h1 className="tod__title">{offer.title}</h1>
          {offer.summary?.trim() ? <p className="tod__summary">{offer.summary.trim()}</p> : null}

          <div className="tod__deal-row">
            {offer.price_label?.trim() ? (
              <p className="tod__price">{offer.price_label.trim()}</p>
            ) : (
              <p className="tod__price tod__price--muted">Ask for rate</p>
            )}
            {cats.length > 0 ? <p className="tod__cats">{cats.join(' · ')}</p> : null}
          </div>

          {starts || ends ? (
            <p className="tod__dates">
              <CalendarRange size={14} strokeWidth={2.25} aria-hidden />
              {starts && ends ? `${starts} – ${ends}` : starts ? `From ${starts}` : `Until ${ends}`}
            </p>
          ) : null}
        </header>

        {details ? (
          <section className="tod__section" aria-labelledby="tod-about">
            <h2 id="tod-about" className="tod__h">
              <ClipboardList size={16} strokeWidth={2.25} aria-hidden />
              About this offer
            </h2>
            <p className="tod__body">{details}</p>
          </section>
        ) : null}

        {galleryRest.length > 0 ? (
          <section className="tod__section" aria-labelledby="tod-gallery">
            <h2 id="tod-gallery" className="tod__h">
              See the experience
            </h2>
            <div className="tod__gallery">
              {galleryRest.map((item, idx) => (
                <button
                  key={`${String(item.id)}-g`}
                  type="button"
                  className="tod__gallery-item"
                  onClick={() => openLightbox(idx + 1)}
                  aria-label={item.kind === 'video' ? 'Open video fullscreen' : 'Open photo fullscreen'}
                >
                  {item.kind === 'video' ? (
                    <>
                      <video src={item.src} muted playsInline preload="metadata" />
                      <span className="tod__media-play tod__media-play--sm" aria-hidden>
                        <Play size={14} strokeWidth={2.5} fill="currentColor" />
                      </span>
                    </>
                  ) : (
                    <img src={item.src} alt="" loading="lazy" />
                  )}
                </button>
              ))}
            </div>
          </section>
        ) : null}

        <section className="tod__section" aria-labelledby="tod-who">
          <h2 id="tod-who" className="tod__h">
            <WhoIcon size={16} strokeWidth={2.25} aria-hidden />
            Who is eligible
          </h2>
          <p className="tod__body">
            This offer is for <strong>{who}</strong>
            {proof ? '.' : ' — confirm with the provider if you are unsure you qualify.'}
          </p>
          {proof ? (
            <div className="tod__callout">
              <IdCard size={16} strokeWidth={2.25} aria-hidden />
              <div>
                <strong>Proof required</strong>
                <p>{proof}</p>
              </div>
            </div>
          ) : null}
        </section>

        <section className="tod__section" aria-labelledby="tod-how">
          <h2 id="tod-how" className="tod__h">
            <CheckCircle2 size={16} strokeWidth={2.25} aria-hidden />
            How to sign up
          </h2>
          {howTo ? (
            <p className="tod__body tod__body--pre">{howTo}</p>
          ) : (
            <ol className="tod__steps">
              <li>Message {business.business_name} and mention this offer by name.</li>
              <li>Confirm dates, eligibility, and what proof you will show.</li>
              <li>Book the stay, tour, or transfer once they confirm the rate.</li>
            </ol>
          )}
        </section>

        {terms ? (
          <section className="tod__section" aria-labelledby="tod-terms">
            <h2 id="tod-terms" className="tod__h">
              Terms
            </h2>
            <p className="tod__body tod__body--muted tod__body--pre">{terms}</p>
          </section>
        ) : null}

        <div className="tod__actions">
          <MessageProviderLink
            username={business.owner_username}
            businessId={business.id}
            variant="primary"
            size="block"
            label="Message to claim"
            className="tod__msg"
          />
          <Link to={`/business/${business.id}`} className="tod__back-link">
            View {business.business_name} profile
          </Link>
        </div>
      </article>

      {lightboxIndex !== null && galleryItems.length > 0 ? (
        <MediaLightbox
          items={galleryItems}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onChange={(next) => {
            setLightboxIndex(next)
            setActiveMedia(next)
          }}
          label={`${offer.title} media`}
        />
      ) : null}
    </BusinessProfileShell>
  )
}
