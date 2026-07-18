/** Stored product media — supports plain URL strings or objects with kind/caption. */
export type ShopMediaRaw =
  | string
  | { url?: string; image?: string; kind?: 'image' | 'video'; caption?: string; is_cover?: boolean }

export type ProductVariant = {
  id: number
  label: string
  price_override?: string | number | null
  effective_price?: string
  stock_quantity: number
  sku?: string
}

export type ShopProductListing = {
  id: number
  owner_username: string
  owner_display_name?: string | null
  owner_avatar?: string | null
  name: string
  description?: string
  tagline?: string | null
  category: string
  category_label?: string
  region: string
  city?: string | null
  pickup_address?: string | null
  price: string | number
  price_label?: string
  price_note?: string | null
  sku?: string | null
  stock_quantity?: number
  in_stock: boolean
  is_featured?: boolean
  pickup_available: boolean
  lodge_delivery: boolean
  shipping_available?: boolean
  shipping_fee?: string | number
  made_in_namibia: boolean
  artisan_name?: string | null
  phone?: string | null
  cover_image: string | null
  photos?: ShopMediaRaw[]
  variants?: ProductVariant[]
  rating_avg?: string | number | null
  rating_count?: number | null
  is_active?: boolean
  created_at?: string
}

export type ProductReviewMedia = {
  url: string
  kind: 'image' | 'video'
}

export type ProductReview = {
  id: number
  name: string
  avatar?: string | null
  rating: number
  body: string
  media: ProductReviewMedia[]
  verified_purchase: boolean
  created_at: string
}

export type ProductReviewsPayload = {
  reviews: ProductReview[]
  rating_avg: number
  rating_count: number
  distribution: Record<string, number>
  can_review: boolean
  has_reviewed: boolean
  is_owner: boolean
}

export type ShopSeller = {
  username: string
  display_name: string
  avatar?: string | null
  bio?: string
  region?: string
  city?: string
  product_count: number
  products: ShopProductListing[]
}

export type ShopSellerSummary = {
  username: string
  display_name: string
  avatar?: string | null
  region?: string
  city?: string
  product_count: number
}

export type CartItem = {
  id: number
  product_id: number
  product_name: string
  product_cover?: string | null
  variant?: number | null
  variant_label?: string | null
  seller_username: string
  seller_display_name: string
  quantity: number
  unit_price: string | number
  line_total: string
  available_quantity?: number
}

export type Cart = {
  id: number
  items: CartItem[]
  subtotal: string
  item_count: number
  updated_at?: string
}

export type OrderItem = {
  id: number
  product?: number | null
  product_name: string
  product_cover?: string | null
  variant_label?: string
  quantity: number
  unit_price: string | number
  line_total: string
}

export type OrderStatus = 'pending' | 'paid' | 'fulfilled' | 'cancelled' | 'refunded'

export type Order = {
  id: number
  order_ref: string
  buyer_username: string
  buyer_display_name: string
  seller_username: string
  seller_display_name: string
  seller_avatar?: string | null
  status: OrderStatus
  status_label: string
  fulfillment_type: 'pickup' | 'lodge_delivery' | 'shipping'
  fulfillment_label: string
  items: OrderItem[]
  items_total: string | number
  shipping_total: string | number
  total: string | number
  contact_name?: string
  contact_phone?: string
  delivery_address?: string
  note?: string
  mock_payment_ref?: string
  created_at?: string
}

export function shopLocationLine(product: Pick<ShopProductListing, 'city' | 'region' | 'pickup_address'>): string {
  const parts = [product.city, product.region].filter(Boolean)
  if (product.pickup_address?.trim()) {
    return product.pickup_address.trim()
  }
  return parts.join(', ')
}

export function productPrimaryPrice(product: ShopProductListing): number {
  const n = typeof product.price === 'number' ? product.price : Number(product.price)
  return Number.isFinite(n) ? n : 0
}
