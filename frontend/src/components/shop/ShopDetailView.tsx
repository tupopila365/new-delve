import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Check,
  ChevronLeft,
  MapPin,
  MessageCircle,
  Minus,
  Pencil,
  Phone,
  Play,
  Plus,
  ShoppingCart,
  Store,
  Truck,
} from 'lucide-react'
import { shopCoverSrc, shopCategoryLabel, shopMediaItems } from '../../utils/shopDisplay'
import { MediaLightbox } from '../media/MediaLightbox'
import { MiniRating } from '../MiniRating'
import { SellerTrustBadges } from '../marketplace/SellerTrustBadges'
import { useAuth } from '../../auth/AuthContext'
import { useCart } from '../../hooks/useCart'
import { shopLocationLine, type ProductVariant, type ShopProductListing } from '../../utils/shopListing'
import { ProductReviews } from './ProductReviews'
import { ShopCartButton } from './ShopCartButton'
import './shop-detail.css'

type Props = {
  product: ShopProductListing
  relatedProducts?: ShopProductListing[]
  editHref?: string
  messageHref: string
}

function formatPrice(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return 'Ask for price'
  return `N$${value.toFixed(2).replace(/\.00$/, '')}`
}

export function ShopDetailView({ product, relatedProducts = [], editHref, messageHref }: Props) {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const { addItem } = useCart()
  const location = shopLocationLine(product)
  const seller = product.owner_display_name || product.owner_username
  const categoryLabel = shopCategoryLabel(product.category)
  const media = useMemo(() => shopMediaItems(product), [product])

  const variants = product.variants ?? []
  const [activeImage, setActiveImage] = useState(0)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [variantId, setVariantId] = useState<number | null>(variants[0]?.id ?? null)
  const [quantity, setQuantity] = useState(1)
  const [added, setAdded] = useState(false)

  const activeMedia = media[activeImage] ?? media[0]

  const activeVariant: ProductVariant | undefined = variants.find((v) => v.id === variantId)
  const basePrice = typeof product.price === 'number' ? product.price : Number(product.price)
  const unitPrice = activeVariant?.effective_price
    ? Number(activeVariant.effective_price)
    : activeVariant?.price_override != null
      ? Number(activeVariant.price_override)
      : basePrice

  const variantStock = activeVariant ? activeVariant.stock_quantity : (product.stock_quantity ?? 0)
  const soldOut = !product.in_stock || (variants.length > 0 ? variantStock <= 0 : (product.stock_quantity ?? 0) <= 0)

  async function handleAdd(thenCheckout = false) {
    if (soldOut) return
    await addItem(product.id, { variant: variantId, quantity, listing: product })
    if (thenCheckout) {
      navigate(profile ? '/checkout' : '/login')
      return
    }
    setAdded(true)
    window.setTimeout(() => setAdded(false), 1600)
  }

  return (
    <div className="shop-detail">
      <div className="shop-detail__topbar">
        <Link to="/shop" className="shop-detail__back">
          <ChevronLeft size={16} strokeWidth={2.5} aria-hidden />
          Shops
        </Link>
        <ShopCartButton />
      </div>

      <div className="shop-detail__grid">
        <div className="shop-detail__gallery-col">
          <div
            className="shop-detail__stage"
            role="button"
            tabIndex={0}
            aria-label="Open media full screen"
            onClick={() => setLightboxIndex(activeImage)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                setLightboxIndex(activeImage)
              }
            }}
          >
            {activeMedia?.kind === 'video' ? (
              <video src={activeMedia.src} muted loop autoPlay playsInline preload="metadata" />
            ) : (
              <img src={activeMedia?.src} alt={product.name} />
            )}
            {product.made_in_namibia ? <span className="shop-detail__pill">Made in Namibia</span> : null}
            {soldOut ? <span className="shop-detail__pill shop-detail__pill--muted">Sold out</span> : null}
            {activeMedia?.kind === 'video' ? (
              <span className="shop-detail__stage-play" aria-hidden>
                <Play size={20} strokeWidth={2.5} />
              </span>
            ) : null}
          </div>
          {media.length > 1 ? (
            <div className="shop-detail__thumbs">
              {media.map((item, index) => (
                <button
                  key={`${item.src}-${index}`}
                  type="button"
                  className={`shop-detail__thumb${index === activeImage ? ' is-active' : ''}`}
                  onClick={() => setActiveImage(index)}
                  aria-label={`View media ${index + 1}`}
                >
                  {item.kind === 'video' ? (
                    <>
                      <video src={item.src} muted preload="metadata" />
                      <span className="shop-detail__thumb-play" aria-hidden>
                        <Play size={14} strokeWidth={2.5} />
                      </span>
                    </>
                  ) : (
                    <img src={item.src} alt="" loading="lazy" />
                  )}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="shop-detail__buy-col">
          <Link to={`/shop/seller/${encodeURIComponent(product.owner_username)}`} className="shop-detail__shoplink">
            <span className="shop-detail__shoplink-avatar" aria-hidden>
              {product.owner_avatar ? <img src={product.owner_avatar} alt="" /> : <Store size={15} strokeWidth={2.25} />}
            </span>
            {seller}
          </Link>
          <SellerTrustBadges username={product.owner_username} compact />

          <p className="shop-detail__eyebrow">{categoryLabel}</p>
          <h1 className="shop-detail__name">{product.name}</h1>
          {Number(product.rating_avg) > 0 ? (
            <a href="#product-reviews" className="shop-detail__rating-link">
              <MiniRating rating={product.rating_avg} count={product.rating_count} />
            </a>
          ) : null}
          <p className="shop-detail__pricetag">
            {formatPrice(unitPrice)}
            {product.price_note ? <span> {product.price_note}</span> : null}
          </p>
          {product.tagline ? <p className="shop-detail__tagline">{product.tagline}</p> : null}

          {variants.length > 0 ? (
            <div className="shop-detail__variants" role="group" aria-label="Options">
              <span className="shop-detail__field-label">Options</span>
              <div className="shop-detail__variant-chips">
                {variants.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    className={`shop-detail__variant${v.id === variantId ? ' is-active' : ''}`}
                    disabled={v.stock_quantity <= 0}
                    onClick={() => setVariantId(v.id)}
                  >
                    {v.label}
                    {v.stock_quantity <= 0 ? ' · sold out' : ''}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="shop-detail__qty-row">
            <span className="shop-detail__field-label">Quantity</span>
            <div className="shop-detail__stepper">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                disabled={quantity <= 1}
                aria-label="Decrease quantity"
              >
                <Minus size={15} strokeWidth={2.5} aria-hidden />
              </button>
              <span aria-live="polite">{quantity}</span>
              <button
                type="button"
                onClick={() => setQuantity((q) => q + 1)}
                aria-label="Increase quantity"
              >
                <Plus size={15} strokeWidth={2.5} aria-hidden />
              </button>
            </div>
          </div>

          <div className="shop-detail__buy-actions">
            <button
              type="button"
              className={`shop-detail__buy${added ? ' is-added' : ''}`}
              onClick={() => handleAdd(false)}
              disabled={soldOut}
            >
              {added ? (
                <>
                  <Check size={17} strokeWidth={2.5} aria-hidden />
                  Added to cart
                </>
              ) : (
                <>
                  <ShoppingCart size={17} strokeWidth={2.25} aria-hidden />
                  Add to cart
                </>
              )}
            </button>
            <button
              type="button"
              className="shop-detail__buy shop-detail__buy--ghost"
              onClick={() => handleAdd(true)}
              disabled={soldOut}
            >
              Buy now
            </button>
          </div>

          <ul className="shop-detail__fulfil">
            {product.pickup_available ? (
              <li>
                <MapPin size={22} strokeWidth={2.25} aria-hidden />
                Pickup{location ? ` · ${location}` : ' available'}
              </li>
            ) : null}
            {product.lodge_delivery ? (
              <li>
                <Truck size={22} strokeWidth={2.25} aria-hidden />
                Lodge / hotel delivery
              </li>
            ) : null}
            {product.shipping_available ? (
              <li>
                <Truck size={22} strokeWidth={2.25} aria-hidden />
                Shipping{Number(product.shipping_fee) > 0 ? ` · ${formatPrice(Number(product.shipping_fee))}` : ''}
              </li>
            ) : null}
          </ul>

          <div className="shop-detail__seller-actions">
            <Link to={messageHref} className="shop-detail__btn shop-detail__btn--ghost">
              <MessageCircle size={15} strokeWidth={2.25} aria-hidden />
              Message
            </Link>
            {product.phone ? (
              <a href={`tel:${product.phone}`} className="shop-detail__btn shop-detail__btn--ghost">
                <Phone size={15} strokeWidth={2.25} aria-hidden />
                Call
              </a>
            ) : null}
            {editHref ? (
              <Link to={editHref} className="shop-detail__btn shop-detail__btn--ghost">
                <Pencil size={15} strokeWidth={2.25} aria-hidden />
                Edit
              </Link>
            ) : null}
          </div>
        </div>
      </div>

      {product.description ? (
        <section className="shop-detail__panel">
          <h2 className="shop-detail__panel-title">Description</h2>
          <p className="shop-detail__body">{product.description}</p>
        </section>
      ) : null}

      <section className="shop-detail__panel">
        <h2 className="shop-detail__panel-title">Details</h2>
        <div className="shop-detail__summary-rows">
          <div className="shop-detail__summary-row">
            <span>Category</span>
            <strong>{categoryLabel}</strong>
          </div>
          <div className="shop-detail__summary-row">
            <span>Maker</span>
            <strong>{product.artisan_name?.trim() || seller}</strong>
          </div>
          <div className="shop-detail__summary-row">
            <span>In stock</span>
            <strong>{soldOut ? 'Sold out' : `${variants.length > 0 ? variantStock : product.stock_quantity ?? 0} available`}</strong>
          </div>
          <div className="shop-detail__summary-row">
            <span>Made locally</span>
            <strong>{product.made_in_namibia ? 'Yes' : 'Not specified'}</strong>
          </div>
        </div>
      </section>

      <div id="product-reviews">
        <ProductReviews productId={product.id} />
      </div>

      {relatedProducts.length > 0 ? (
        <section className="shop-detail__panel">
          <div className="shop-detail__panel-head">
            <h2 className="shop-detail__panel-title">More from {seller}</h2>
            <Link to={`/shop/seller/${encodeURIComponent(product.owner_username)}`} className="shop-detail__seeall">
              Visit shop
            </Link>
          </div>
          <div className="shop-detail__related">
            {relatedProducts.map((item) => (
              <Link key={item.id} to={`/shop/${item.id}`} className="shop-detail__related-card">
                <img
                  src={shopCoverSrc(item.cover_image, item.category)}
                  alt=""
                  className="shop-detail__related-image"
                  loading="lazy"
                />
                <div className="shop-detail__related-body">
                  <strong>{item.name}</strong>
                  <span>{item.price_label || formatPrice(Number(item.price))}</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {lightboxIndex !== null ? (
        <MediaLightbox
          items={media}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onChange={setLightboxIndex}
          label={`${product.name} media`}
        />
      ) : null}
    </div>
  )
}
