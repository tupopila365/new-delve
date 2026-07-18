import { mediaUrl } from '../api/client'
import type { ListingGalleryItem } from '../components/listing/types'
import type { ShopMediaRaw, ShopProductListing } from './shopListing'

const VIDEO_RE = /\.(mp4|webm|mov|m4v)(\?|$)|\/video\/(?:upload\/)?/i

function guessKind(url: string, explicit?: string): 'image' | 'video' {
  if (explicit === 'video' || explicit === 'image') return explicit
  if (url.startsWith('data:video/')) return 'video'
  return VIDEO_RE.test(url) ? 'video' : 'image'
}

const SHOP_IMAGE_BY_CATEGORY: Record<string, string> = {
  souvenirs: 'https://images.unsplash.com/photo-1513519245088-0e12902e35ca?auto=format&fit=crop&w=1200&q=80',
  crafts: 'https://images.unsplash.com/photo-1452860606245-08befc0ff4db?auto=format&fit=crop&w=1200&q=80',
  jewellery: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=1200&q=80',
  clothing: 'https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=1200&q=80',
  art: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?auto=format&fit=crop&w=1200&q=80',
  books_maps: 'https://images.unsplash.com/photo-1524995999572-aadcec704faf?auto=format&fit=crop&w=1200&q=80',
  local_food: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=80',
  gear: 'https://images.unsplash.com/photo-1476514525535-07fb3b4fcc6f?auto=format&fit=crop&w=1200&q=80',
  other: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1200&q=80',
}

const DEFAULT_SHOP_IMAGE =
  'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1200&q=80'

export function shopCoverSrc(coverImage: string | null | undefined, category: string): string {
  const resolved = mediaUrl(coverImage)
  if (resolved) return resolved
  return SHOP_IMAGE_BY_CATEGORY[category] ?? DEFAULT_SHOP_IMAGE
}

/**
 * Normalize a product's media (cover + gallery) into `ListingGalleryItem`s for
 * the shared gallery/lightbox. Tolerates both `{url,kind}` and legacy `{image}`
 * shapes, always includes the cover, and dedupes by resolved src.
 */
export function shopMediaItems(product: ShopProductListing): ListingGalleryItem[] {
  const items: ListingGalleryItem[] = []
  const seen = new Set<string>()

  const push = (rawUrl: string | undefined, kind?: string, caption?: string) => {
    const url = (rawUrl ?? '').trim()
    if (!url) return
    const src = mediaUrl(url) ?? url
    if (seen.has(src)) return
    seen.add(src)
    items.push({ src, kind: guessKind(url, kind), caption })
  }

  const cover = (product.cover_image ?? '').trim()
  if (cover) push(cover, undefined)

  for (const raw of (product.photos ?? []) as ShopMediaRaw[]) {
    if (typeof raw === 'string') {
      push(raw)
    } else if (raw && typeof raw === 'object') {
      push(raw.url ?? raw.image, raw.kind, raw.caption)
    }
  }

  if (items.length === 0) {
    items.push({ src: shopCoverSrc(product.cover_image, product.category), kind: 'image' })
  }
  return items
}

export function shopPriceLabel(price: string | number, priceNote?: string | null): string {
  const n = typeof price === 'number' ? price : Number(price)
  if (!Number.isFinite(n) || n <= 0) return 'Ask for price'
  const base = `N$${n.toFixed(2).replace(/\.00$/, '')}`
  const note = (priceNote || '').trim()
  return note ? `${base} ${note}` : base
}

export const SHOP_CATEGORIES: { value: string; label: string }[] = [
  { value: 'souvenirs', label: 'Souvenirs & gifts' },
  { value: 'crafts', label: 'Handmade crafts' },
  { value: 'jewellery', label: 'Jewellery' },
  { value: 'clothing', label: 'Clothing & textiles' },
  { value: 'art', label: 'Art & prints' },
  { value: 'books_maps', label: 'Books & maps' },
  { value: 'local_food', label: 'Local food & pantry' },
  { value: 'gear', label: 'Safari & travel gear' },
  { value: 'other', label: 'Other' },
]

export function shopCategoryLabel(value: string): string {
  return SHOP_CATEGORIES.find((c) => c.value === value)?.label ?? value.replace(/_/g, ' ')
}
