import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch, asArray } from '../api/client'
import type { ListingCategory } from '../data/providerData'
import { mocksEnabled } from '../utils/useMocks'

export type ProviderReviewRow = {
  id: string
  source: string
  reviewId: number
  guest: string
  listing: string
  category: ListingCategory
  rating: number
  date: string
  body: string
  needsReply: boolean
  response?: string
}

const DEMO_REVIEWS: ProviderReviewRow[] = [
  {
    id: 'demo-1',
    source: 'accommodation',
    reviewId: 1,
    guest: 'Anna K.',
    listing: 'Freesia Hotel',
    category: 'Stay',
    rating: 5,
    date: '2026-04-28',
    body: 'Spotless room and great breakfast.',
    needsReply: true,
  },
  {
    id: 'demo-2',
    source: 'accommodation',
    reviewId: 2,
    guest: 'Tobias L.',
    listing: 'Coastal Guesthouse',
    category: 'Stay',
    rating: 4.8,
    date: '2026-04-20',
    body: 'Loved the dune views from the terrace.',
    needsReply: false,
    response: 'Thank you — we are glad you enjoyed the terrace!',
  },
  {
    id: 'demo-3',
    source: 'guide',
    reviewId: 3,
    guest: 'Mila K.',
    listing: 'Desert sunrise tour',
    category: 'Guide',
    rating: 5,
    date: '2026-04-15',
    body: 'Kaoko knew every photo stop on the route.',
    needsReply: true,
  },
  {
    id: 'demo-4',
    source: 'food',
    reviewId: 4,
    guest: 'Priya N.',
    listing: 'Oryx Grill House',
    category: 'Food',
    rating: 4.7,
    date: '2026-04-10',
    body: 'Amazing local flavours. Will definitely be back.',
    needsReply: false,
  },
  {
    id: 'demo-5',
    source: 'shop',
    reviewId: 5,
    guest: 'Leo M.',
    listing: 'Mokoro carving',
    category: 'Shop',
    rating: 5,
    date: '2026-04-08',
    body: 'Beautifully made — arrived carefully packed.',
    needsReply: true,
  },
]

type ApiReviewRow = {
  id?: string
  source?: string
  review_id?: number
  guest?: string
  listing_title?: string
  category?: string
  rating?: number
  body?: string
  created_at?: string
  seller_reply?: string
  needs_reply?: boolean
}

function mapApiRow(row: ApiReviewRow): ProviderReviewRow | null {
  const source = typeof row.source === 'string' ? row.source : ''
  const reviewId = typeof row.review_id === 'number' ? row.review_id : Number(row.review_id)
  if (!source || !Number.isFinite(reviewId)) return null
  const category = (row.category || 'Stay') as ListingCategory
  const reply = typeof row.seller_reply === 'string' ? row.seller_reply.trim() : ''
  return {
    id: typeof row.id === 'string' ? row.id : `${source}:${reviewId}`,
    source,
    reviewId,
    guest: typeof row.guest === 'string' ? row.guest : 'Guest',
    listing: typeof row.listing_title === 'string' ? row.listing_title : 'Listing',
    category,
    rating: typeof row.rating === 'number' ? row.rating : 0,
    date: typeof row.created_at === 'string' ? row.created_at.slice(0, 10) : '',
    body: typeof row.body === 'string' ? row.body : '',
    needsReply: typeof row.needs_reply === 'boolean' ? row.needs_reply : !reply,
    response: reply || undefined,
  }
}

async function loadLiveReviews(): Promise<ProviderReviewRow[]> {
  const raw = await apiFetch<ApiReviewRow[]>('/api/accounts/provider/reviews/')
  return asArray(raw).map(mapApiRow).filter((r): r is ProviderReviewRow => r != null)
}

export function useProviderReviews(enabled = true) {
  return useQuery({
    queryKey: ['provider-reviews-all'],
    queryFn: async () => {
      if (mocksEnabled()) return DEMO_REVIEWS
      return loadLiveReviews()
    },
    enabled,
    staleTime: 60_000,
  })
}

export function useProviderReviewReply() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      source,
      reviewId,
      reply,
    }: {
      source: string
      reviewId: number
      reply: string
    }) => {
      const text = reply.trim()
      if (mocksEnabled()) {
        return { source, review_id: reviewId, seller_reply: text, needs_reply: !text }
      }
      return apiFetch(`/api/accounts/provider/reviews/${source}/${reviewId}/reply/`, {
        method: 'POST',
        body: JSON.stringify({ reply }),
      })
    },
    onSuccess: (_data, vars) => {
      const text = vars.reply.trim()
      qc.setQueryData<ProviderReviewRow[]>(['provider-reviews-all'], (prev) => {
        if (!prev) return prev
        return prev.map((row) =>
          row.source === vars.source && row.reviewId === vars.reviewId
            ? {
                ...row,
                response: text || undefined,
                needsReply: !text,
              }
            : row,
        )
      })
      void qc.invalidateQueries({ queryKey: ['provider-reviews-all'] })
    },
  })
}

export function reviewStarBreakdown(reviews: ProviderReviewRow[]) {
  if (reviews.length === 0) {
    return [
      { stars: 5, pct: 0 },
      { stars: 4, pct: 0 },
      { stars: 3, pct: 0 },
      { stars: 2, pct: 0 },
      { stars: 1, pct: 0 },
    ]
  }
  const counts = [0, 0, 0, 0, 0]
  for (const r of reviews) {
    const bucket = Math.min(5, Math.max(1, Math.round(r.rating))) - 1
    counts[bucket] += 1
  }
  const total = reviews.length
  return [5, 4, 3, 2, 1].map((stars, idx) => ({
    stars,
    pct: Math.round((counts[4 - idx] / total) * 100),
  }))
}
