export type ShopProductListing = {
  id: number
  owner_username: string
  owner_display_name?: string | null
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
  in_stock: boolean
  pickup_available: boolean
  lodge_delivery: boolean
  made_in_namibia: boolean
  artisan_name?: string | null
  phone?: string | null
  cover_image: string | null
  photos?: { image?: string; caption?: string; is_cover?: boolean }[]
  is_active?: boolean
  created_at?: string
}

export function shopLocationLine(product: Pick<ShopProductListing, 'city' | 'region' | 'pickup_address'>): string {
  const parts = [product.city, product.region].filter(Boolean)
  if (product.pickup_address?.trim()) {
    return product.pickup_address.trim()
  }
  return parts.join(', ')
}
