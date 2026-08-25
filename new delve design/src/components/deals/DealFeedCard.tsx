import { Bookmark, MapPin, Play } from 'lucide-react'
import JourneyCoverMedia from '../journeys/JourneyCoverMedia'
import { formatMoney } from '../../lib/formatMoney'
import type { CatalogDeal } from '../../data/marketingDealsCatalog'
import { coverOf } from '../../data/marketingDealsCatalog'

function formatRange(startIso: string, endIso: string) {
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' }
  return `${new Date(startIso).toLocaleDateString(undefined, opts)} – ${new Date(endIso).toLocaleDateString(undefined, opts)}`
}

export default function DealFeedCard({
  deal,
  saved,
  onOpen,
  onToggleSave,
}: {
  deal: CatalogDeal
  saved: boolean
  onOpen: (id: string) => void
  onToggleSave: (id: string) => void
}) {
  const cover = coverOf(deal)
  const endingSoon = (new Date(deal.endDate).getTime() - Date.now()) / (1000 * 60 * 60) <= 72

  return (
    <article
      className="overflow-hidden w-full min-w-0 sm:rounded-2xl"
      style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}
    >
      <div className="flex items-center gap-2.5 px-4 py-3">
        <div
          className="h-10 w-10 rounded-full overflow-hidden flex-shrink-0"
          style={{ background: 'rgba(140,82,255,0.12)' }}
        >
          <img src={deal.businessAvatar} alt="" className="h-full w-full object-cover" />
        </div>
        <div className="text-left min-w-0">
          <p className="text-sm font-semibold m-0 truncate" style={{ color: 'var(--fg)' }}>
            {deal.businessName}
          </p>
          <p className="text-xs m-0 truncate inline-flex items-center gap-1" style={{ color: 'var(--fg-muted)' }}>
            <MapPin size={11} className="flex-shrink-0" />
            {deal.city}, {deal.country}
          </p>
        </div>
        <span
          className="ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
          style={{ background: 'rgba(15, 23, 42, 0.08)', color: 'var(--fg-muted)' }}
        >
          Preview offer
        </span>
      </div>

      <button
        type="button"
        onClick={() => onOpen(deal.id)}
        className="relative w-full overflow-hidden bg-black/10 block p-0 border-0 cursor-pointer"
        aria-label={`Open ${deal.title}`}
      >
        <div className="relative w-full max-h-[70vh] aspect-[4/5] min-h-[22rem]">
          <JourneyCoverMedia
            url={cover.url}
            resourceType={cover.type}
            className="absolute inset-0 w-full h-full object-cover"
            variant="card"
          />
          <span
            className="absolute top-3 left-3 text-[11px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(0,0,0,0.55)', color: '#fff' }}
          >
            {deal.discountSummary}
          </span>
          {cover.type === 'video' && (
            <span
              className="absolute top-3 right-3 inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(0,0,0,0.55)', color: '#fff' }}
            >
              <Play size={10} fill="currentColor" />
              Video
            </span>
          )}
          {endingSoon && (
            <span
              className="absolute top-12 left-3 text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(245,158,11,0.92)', color: '#1a1a1a' }}
            >
              Ending soon
            </span>
          )}
          <span
            className="absolute bottom-3 left-3 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide"
            style={{ background: 'rgba(140,82,255,0.85)', color: '#fff' }}
          >
            {deal.audiences[0]}
          </span>
          <span
            className="absolute bottom-3 right-3 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide"
            style={{ background: 'rgba(0,0,0,0.55)', color: '#fff' }}
          >
            {deal.category}
          </span>
        </div>
      </button>

      <div className="px-4 py-3">
        <div className="flex items-center gap-4 mb-2">
          <p className="text-base font-bold m-0" style={{ color: 'var(--fg)' }}>
            {formatMoney(deal.currency, deal.dealAmount)}
          </p>
          <p className="text-xs m-0" style={{ color: 'var(--fg-muted)' }}>
            Was {formatMoney(deal.currency, deal.originalAmount)}
          </p>
          <button
            type="button"
            onClick={() => onToggleSave(deal.id)}
            className="ml-auto"
            style={{
              background: 'none',
              border: 'none',
              color: saved ? 'var(--primary)' : 'var(--fg)',
              cursor: 'pointer',
              padding: 0,
            }}
            aria-label={saved ? 'Unsave deal' : 'Save deal'}
          >
            <Bookmark size={22} fill={saved ? 'currentColor' : 'none'} />
          </button>
        </div>

        <p className="text-sm font-semibold m-0 mb-1" style={{ color: 'var(--fg)' }}>
          {deal.title}
        </p>
        <p className="text-sm m-0 line-clamp-2" style={{ color: 'var(--fg)' }}>
          {deal.description}
        </p>
        <p className="text-xs m-0 mt-2" style={{ color: 'var(--fg-muted)' }}>
          Valid {formatRange(deal.startDate, deal.endDate)}
        </p>
      </div>
    </article>
  )
}
