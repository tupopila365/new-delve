import type { Cart, CartItem, ShopProductListing } from './shopListing'

const GUEST_CART_KEY = 'delve_guest_shop_cart'

export type GuestCartLine = {
  product: number
  variant: number | null
  quantity: number
  product_name: string
  product_cover: string | null
  variant_label: string | null
  seller_username: string
  seller_display_name: string
  unit_price: string
}

function money(value: number): string {
  return (Number.isFinite(value) ? value : 0).toFixed(2)
}

export function readGuestCartLines(): GuestCartLine[] {
  try {
    const raw = localStorage.getItem(GUEST_CART_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (row): row is GuestCartLine =>
        Boolean(row) &&
        typeof row === 'object' &&
        typeof (row as GuestCartLine).product === 'number' &&
        typeof (row as GuestCartLine).quantity === 'number',
    )
  } catch {
    return []
  }
}

export function writeGuestCartLines(lines: GuestCartLine[]) {
  localStorage.setItem(GUEST_CART_KEY, JSON.stringify(lines))
}

export function clearGuestCart() {
  localStorage.removeItem(GUEST_CART_KEY)
}

export function guestCartToCart(lines: GuestCartLine[]): Cart {
  const items: CartItem[] = lines.map((line, index) => {
    const unit = Number(line.unit_price) || 0
    const qty = Math.max(1, Math.min(99, line.quantity))
    return {
      id: -(index + 1),
      product_id: line.product,
      product_name: line.product_name,
      product_cover: line.product_cover,
      variant: line.variant,
      variant_label: line.variant_label,
      seller_username: line.seller_username,
      seller_display_name: line.seller_display_name,
      quantity: qty,
      unit_price: money(unit),
      line_total: money(unit * qty),
    }
  })
  const subtotal = items.reduce((sum, item) => sum + Number(item.line_total), 0)
  return {
    id: 0,
    items,
    subtotal: money(subtotal),
    item_count: items.reduce((sum, item) => sum + item.quantity, 0),
  }
}

export function mergePayloadFromGuest(lines: GuestCartLine[]) {
  return {
    items: lines.map((line) => ({
      product: line.product,
      variant: line.variant,
      quantity: line.quantity,
    })),
  }
}

export function resolveUnitPrice(
  listing: ShopProductListing,
  variantId: number | null | undefined,
): string {
  const base = typeof listing.price === 'number' ? listing.price : Number(listing.price)
  if (variantId == null) return money(base)
  const variant = listing.variants?.find((v) => v.id === variantId)
  if (!variant) return money(base)
  if (variant.effective_price != null) return money(Number(variant.effective_price))
  if (variant.price_override != null) return money(Number(variant.price_override))
  return money(base)
}

export function upsertGuestLine(
  lines: GuestCartLine[],
  listing: ShopProductListing,
  opts: { variant?: number | null; quantity?: number },
): GuestCartLine[] {
  const variant = opts.variant ?? null
  const quantity = Math.max(1, Math.min(99, opts.quantity ?? 1))
  const unit_price = resolveUnitPrice(listing, variant)
  const variant_label = variant != null ? listing.variants?.find((v) => v.id === variant)?.label ?? null : null
  const next = [...lines]
  const idx = next.findIndex((row) => row.product === listing.id && row.variant === variant)
  if (idx >= 0) {
    next[idx] = {
      ...next[idx],
      quantity: Math.min(99, next[idx].quantity + quantity),
      unit_price,
      variant_label,
    }
    return next
  }
  next.push({
    product: listing.id,
    variant,
    quantity,
    product_name: listing.name,
    product_cover: listing.cover_image,
    variant_label,
    seller_username: listing.owner_username,
    seller_display_name: listing.owner_display_name || listing.owner_username,
    unit_price,
  })
  return next
}
