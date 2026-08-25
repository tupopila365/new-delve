import { useState } from 'react'
import { ArrowLeft, Bookmark, Building2, ChevronLeft, ChevronRight, Clock, ZoomIn } from 'lucide-react'
import JourneyCoverMedia from '../journeys/JourneyCoverMedia'
import DealMediaLightbox from './DealMediaLightbox'
import { formatMoney } from '../../lib/formatMoney'
import type { CatalogDeal } from '../../data/marketingDealsCatalog'

function formatRange(startIso: string, endIso: string) {
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' }
  return `${new Date(startIso).toLocaleDateString(undefined, opts)} – ${new Date(endIso).toLocaleDateString(undefined, opts)}`
}

export default function DealCatalogDetail({
  deal,
  saved,
  onBack,
  onToggleSave,
}: {
  deal: CatalogDeal
  saved: boolean
  onBack: () => void
  onToggleSave: () => void
}) {
  const [index, setIndex] = useState(0)
  const [lightbox, setLightbox] = useState(false)
  const [zoom, setZoom] = useState(1)
  const current = deal.media[index] ?? deal.media[0]!

  return (
    <div className="pb-10" style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <button
        type="button"
        onClick={onBack}
        className="mx-4 sm:mx-0 mt-4 mb-3 inline-flex items-center gap-1.5 text-sm font-semibold"
        style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer' }}
      >
        <ArrowLeft size={16} />
        Back to deals
      </button>

      <div className="relative" style={{ background: '#111' }}>
        <button
          type="button"
          className="block w-full p-0 border-0 cursor-zoom-in"
          onClick={() => {
            setZoom(1)
            setLightbox(true)
          }}
          aria-label="Open media full screen"
        >
          <div className="relative w-full min-h-[240px]" style={{ maxHeight: '70vh', aspectRatio: '4 / 5' }}>
            <JourneyCoverMedia
              url={current.url}
              resourceType={current.type}
              className="absolute inset-0 w-full h-full object-cover"
              variant="card"
            />
          </div>
        </button>

        {deal.media.length > 1 && (
          <>
            <button
              type="button"
              aria-label="Previous media"
              onClick={() => setIndex(i => (i - 1 + deal.media.length) % deal.media.length)}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(0,0,0,0.55)', color: '#fff', border: 'none', cursor: 'pointer' }}
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              aria-label="Next media"
              onClick={() => setIndex(i => (i + 1) % deal.media.length)}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(0,0,0,0.55)', color: '#fff', border: 'none', cursor: 'pointer' }}
            >
              <ChevronRight size={18} />
            </button>
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
              {deal.media.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={`Media ${i + 1}`}
                  onClick={() => setIndex(i)}
                  className="rounded-full"
                  style={{
                    width: i === index ? 20 : 6,
                    height: 6,
                    background: i === index ? '#fff' : 'rgba(255,255,255,0.45)',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                />
              ))}
            </div>
          </>
        )}

        <button
          type="button"
          onClick={() => {
            setZoom(1)
            setLightbox(true)
          }}
          className="absolute top-3 right-3 inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-full"
          style={{ background: 'rgba(0,0,0,0.55)', color: '#fff', border: 'none', cursor: 'pointer' }}
        >
          <ZoomIn size={12} />
          Open
        </button>
      </div>

      {deal.media.length > 1 && (
        <div className="flex gap-2 overflow-x-auto px-4 sm:px-0 py-3">
          {deal.media.map((item, i) => (
            <button
              key={`${item.url}-${i}`}
              type="button"
              onClick={() => setIndex(i)}
              className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 p-0"
              style={{
                border: `2px solid ${i === index ? 'var(--primary)' : 'transparent'}`,
                cursor: 'pointer',
                background: '#111',
              }}
            >
              {item.type === 'video' ? (
                <video src={item.url} className="w-full h-full object-cover" muted playsInline preload="metadata" />
              ) : (
                <img src={item.url} alt="" className="w-full h-full object-cover" />
              )}
            </button>
          ))}
        </div>
      )}

      <div className="px-4 sm:px-0">
        <div className="flex items-center flex-wrap gap-2 mb-2">
          <p className="text-sm font-semibold m-0" style={{ color: 'var(--primary)' }}>
            {deal.discountSummary}
          </p>
          <span
            className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(15, 23, 42, 0.08)', color: 'var(--fg-muted)' }}
          >
            Preview offer
          </span>
          {deal.audiences.map(a => (
            <span
              key={a}
              className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(140,82,255,0.12)', color: 'var(--primary)' }}
            >
              {a}
            </span>
          ))}
        </div>

        <div className="rounded-2xl px-4 py-3 mb-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <p className="text-xs m-0" style={{ color: 'var(--fg-muted)' }}>
            Original price
          </p>
          <p className="text-sm m-0 mb-2 line-through" style={{ color: 'var(--fg-muted)' }}>
            {formatMoney(deal.currency, deal.originalAmount)}
          </p>
          <p className="text-xs m-0" style={{ color: 'var(--fg-muted)' }}>
            Deal price
          </p>
          <p className="text-lg font-bold m-0 mb-2" style={{ color: 'var(--fg)' }}>
            {formatMoney(deal.currency, deal.dealAmount)}
          </p>
          <p className="text-xs m-0" style={{ color: 'var(--fg-muted)' }}>
            You save
          </p>
          <p className="text-sm m-0">
            {formatMoney(deal.currency, deal.savingAmount)} · {deal.discountPercentage}%
          </p>
        </div>

        <h1 className="font-display text-2xl font-extrabold m-0 mb-3" style={{ color: 'var(--fg)' }}>
          {deal.title}
        </h1>

        <div className="flex flex-wrap gap-3 mb-4 text-sm" style={{ color: 'var(--fg-muted)' }}>
          <span className="inline-flex items-center gap-1.5 font-semibold" style={{ color: 'var(--primary)' }}>
            <Building2 size={14} />
            {deal.businessName}
          </span>
          <span>
            {deal.city}, {deal.country}
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock size={13} />
            {formatRange(deal.startDate, deal.endDate)}
          </span>
        </div>

        <p className="text-sm leading-relaxed m-0 mb-4" style={{ color: 'var(--fg)' }}>
          {deal.description}
        </p>

        <div className="rounded-2xl px-4 py-3 mb-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <p className="text-xs m-0 mb-1" style={{ color: 'var(--fg-muted)' }}>
            Experience
          </p>
          <p className="text-sm font-semibold m-0" style={{ color: 'var(--fg)' }}>
            {deal.listingTitle}
          </p>
        </div>

        <div className="rounded-2xl px-4 py-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <p className="text-sm font-semibold m-0 mb-1" style={{ color: 'var(--fg)' }}>
            Delve preview
          </p>
          <p className="text-xs m-0 mb-3" style={{ color: 'var(--fg-muted)' }}>
            This preview offer cannot be claimed, booked, or paid.
          </p>
          <p className="text-xs m-0 mb-2" style={{ color: 'var(--fg-muted)' }}>
            {deal.eligibility}
          </p>
          <p className="text-xs m-0 mb-2" style={{ color: 'var(--fg-muted)' }}>
            {deal.terms}
          </p>
          <p className="text-xs m-0 mb-2" style={{ color: 'var(--fg-muted)' }}>
            Included: {deal.included}
          </p>
          <p className="text-xs m-0 mb-3" style={{ color: 'var(--fg-muted)' }}>
            Not included: {deal.excluded}
          </p>
          <button
            type="button"
            onClick={onToggleSave}
            className="rounded-xl px-3 py-2 text-sm font-semibold inline-flex items-center gap-1"
            style={{ background: 'var(--surface-subtle)', color: 'var(--fg)', border: '1px solid var(--border)', cursor: 'pointer' }}
          >
            <Bookmark size={14} fill={saved ? 'currentColor' : 'none'} />
            {saved ? 'Saved' : 'Save'}
          </button>
        </div>
      </div>

      {lightbox && (
        <DealMediaLightbox
          items={deal.media}
          index={index}
          zoom={zoom}
          onClose={() => setLightbox(false)}
          onIndex={next => {
            setIndex(next)
            setZoom(1)
          }}
          onZoom={setZoom}
        />
      )}
    </div>
  )
}
