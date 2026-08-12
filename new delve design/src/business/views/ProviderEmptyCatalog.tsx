import { List, Tag } from 'lucide-react'

interface ProviderEmptyCatalogProps {
  kind: 'listings' | 'deals'
}

export default function ProviderEmptyCatalog({ kind }: ProviderEmptyCatalogProps) {
  const isListings = kind === 'listings'
  const Icon = isListings ? List : Tag
  return (
    <div className="p-4 sm:p-6 h-full overflow-y-auto">
      <div className="flex items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="font-display text-xl font-extrabold m-0" style={{ color: 'var(--fg)' }}>
            {isListings ? 'Listings' : 'Deals'}
          </h1>
          <p className="text-sm m-0 mt-1" style={{ color: 'var(--fg-muted)' }}>
            {isListings
              ? 'Services and experiences you offer on Delve.'
              : 'Time-limited offers attached to your listings.'}
          </p>
        </div>
        <button
          type="button"
          disabled
          title="Coming in a later checkpoint"
          className="rounded-xl px-3.5 py-2 text-sm font-semibold text-white opacity-50"
          style={{ background: 'var(--primary)', border: 'none', cursor: 'not-allowed' }}
        >
          {isListings ? 'Create listing' : 'Create deal'}
        </button>
      </div>

      <div
        className="rounded-2xl px-6 py-14 text-center"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        <Icon size={28} style={{ color: 'var(--fg-muted)', margin: '0 auto 12px' }} />
        <p className="text-sm font-semibold m-0 mb-1" style={{ color: 'var(--fg)' }}>
          {isListings ? 'No listings yet' : 'No deals yet'}
        </p>
        <p className="text-sm m-0 max-w-md mx-auto" style={{ color: 'var(--fg-muted)' }}>
          {isListings
            ? 'When listing creation ships, your catalog will show here with real counts from the database.'
            : 'When deal creation ships, active and scheduled deals will show here with real counts.'}
        </p>
      </div>
    </div>
  )
}
