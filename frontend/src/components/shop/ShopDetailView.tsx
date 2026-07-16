import { Link } from 'react-router-dom'
import { MapPin, MessageCircle, Package, Pencil, Phone, ShoppingBag, Sparkles } from 'lucide-react'
import { shopCoverSrc, shopPriceLabel, shopCategoryLabel } from '../../utils/shopDisplay'
import { shopLocationLine, type ShopProductListing } from '../../utils/shopListing'
import './shop-detail.css'

type Props = {
  product: ShopProductListing
  relatedProducts?: ShopProductListing[]
  editHref?: string
  messageHref: string
}

export function ShopDetailView({ product, relatedProducts = [], editHref, messageHref }: Props) {
  const location = shopLocationLine(product)
  const seller = product.owner_display_name || product.owner_username
  const categoryLabel = shopCategoryLabel(product.category)
  const cover = shopCoverSrc(product.cover_image, product.category)
  const gallery = product.photos?.filter((photo) => photo?.image).map((photo) => photo.image as string) ?? []

  return (
    <div className="shop-detail">
      <Link to="/shop" className="shop-detail__back">
        ← Local shops
      </Link>

      <div className="shop-detail__hero">
        <img src={cover} alt="" />
        <div className="shop-detail__veil" />
        <div className="shop-detail__hero-copy">
          <div className="shop-detail__badges">
            <span className="shop-detail__badge">{categoryLabel}</span>
            {product.made_in_namibia ? <span className="shop-detail__badge">Made in Namibia</span> : null}
            {product.in_stock ? (
              <span className="shop-detail__badge shop-detail__badge--soft">In stock</span>
            ) : (
              <span className="shop-detail__badge shop-detail__badge--soft">Out of stock</span>
            )}
          </div>
          <h1 className="shop-detail__title">{product.name}</h1>
          <p className="shop-detail__price">{product.price_label || shopPriceLabel(product.price, product.price_note)}</p>
          {product.tagline ? <p className="shop-detail__tagline">{product.tagline}</p> : null}
          <div className="shop-detail__hero-meta">
            <span>
              <ShoppingBag size={14} strokeWidth={2.25} aria-hidden />
              {seller}
            </span>
            {location ? (
              <span>
                <MapPin size={14} strokeWidth={2.25} aria-hidden />
                {location}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <div className="shop-detail__layout">
        <div className="shop-detail__main">
          <section className="shop-detail__panel shop-detail__panel--story">
            <p className="shop-detail__kicker">Why travellers pick it up</p>
            {product.description ? (
              <p className="shop-detail__body">{product.description}</p>
            ) : (
              <p className="shop-detail__body">
                A pickup-first local product listing for travellers who want something real to take home.
              </p>
            )}
          </section>

          <section className="shop-detail__panel">
            <div className="shop-detail__section-head">
              <h2>What to expect</h2>
              <p>Quick details before you message the seller.</p>
            </div>
            <div className="shop-detail__chips">
              {product.made_in_namibia ? <span className="shop-detail__chip">Made in Namibia</span> : null}
              {product.pickup_available ? <span className="shop-detail__chip">Pickup available</span> : null}
              {product.lodge_delivery ? <span className="shop-detail__chip">Lodge delivery</span> : null}
              {product.in_stock ? <span className="shop-detail__chip">Ready now</span> : <span className="shop-detail__chip">Check availability</span>}
            </div>

            <div className="shop-detail__facts">
              <article className="shop-detail__fact">
                <span className="shop-detail__fact-icon">
                  <Package size={16} strokeWidth={2.25} aria-hidden />
                </span>
                <div>
                  <h3>Product type</h3>
                  <p>{categoryLabel}</p>
                </div>
              </article>
              {location ? (
                <article className="shop-detail__fact">
                  <span className="shop-detail__fact-icon">
                    <MapPin size={16} strokeWidth={2.25} aria-hidden />
                  </span>
                  <div>
                    <h3>Pickup</h3>
                    <p>{location}</p>
                  </div>
                </article>
              ) : null}
              <article className="shop-detail__fact">
                <span className="shop-detail__fact-icon">
                  <Sparkles size={16} strokeWidth={2.25} aria-hidden />
                </span>
                <div>
                  <h3>Best for</h3>
                  <p>{product.made_in_namibia ? 'Locally made keepsakes and gifts.' : 'Travel finds, gifts, and practical pickup buys.'}</p>
                </div>
              </article>
              <article className="shop-detail__fact">
                <span className="shop-detail__fact-icon">
                  <ShoppingBag size={16} strokeWidth={2.25} aria-hidden />
                </span>
                <div>
                  <h3>Ordering style</h3>
                  <p>
                    {product.pickup_available
                      ? 'Message first, then arrange pickup with the seller.'
                      : 'Contact the seller first to confirm how collection works.'}
                  </p>
                </div>
              </article>
            </div>
          </section>

          <section className="shop-detail__panel">
            <div className="shop-detail__section-head">
              <h2>Product details</h2>
              <p>Extra context to help travellers decide before they message.</p>
            </div>
            <div className="shop-detail__summary-rows">
              <div className="shop-detail__summary-row">
                <span>Category</span>
                <strong>{categoryLabel}</strong>
              </div>
              <div className="shop-detail__summary-row">
                <span>Maker</span>
                <strong>{product.artisan_name?.trim() || 'Seller listed item'}</strong>
              </div>
              <div className="shop-detail__summary-row">
                <span>Made locally</span>
                <strong>{product.made_in_namibia ? 'Yes' : 'Not specified'}</strong>
              </div>
              <div className="shop-detail__summary-row">
                <span>Lodge delivery</span>
                <strong>{product.lodge_delivery ? 'Available' : 'No'}</strong>
              </div>
            </div>
          </section>

          {product.artisan_name ? (
            <section className="shop-detail__panel">
              <div className="shop-detail__section-head">
                <h2>Maker</h2>
                <p>The person behind the piece.</p>
              </div>
              <p className="shop-detail__body">{product.artisan_name}</p>
            </section>
          ) : null}

          {gallery.length > 0 ? (
            <section className="shop-detail__panel">
              <div className="shop-detail__section-head">
                <h2>More product views</h2>
                <p>Extra images shared by the seller.</p>
              </div>
              <div className="shop-detail__gallery">
                {gallery.slice(0, 6).map((src, index) => (
                  <img key={`${src}-${index}`} src={src} alt="" className="shop-detail__gallery-image" loading="lazy" />
                ))}
              </div>
            </section>
          ) : null}

          {relatedProducts.length > 0 ? (
            <section className="shop-detail__panel">
              <div className="shop-detail__section-head">
                <h2>More from this shop</h2>
                <p>Other products available from the same seller.</p>
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
                      <span>{item.price_label || shopPriceLabel(item.price, item.price_note)}</span>
                      <small>{item.tagline || shopCategoryLabel(item.category)}</small>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}
        </div>

        <aside className="shop-detail__side">
          <section className="shop-detail__panel shop-detail__panel--cta">
            <p className="shop-detail__kicker">Seller</p>
            <h2 className="shop-detail__seller">{seller}</h2>
            <p className="shop-detail__seller-sub">
              Ask about availability, pickup timing, or lodge delivery before you head over.
            </p>
            <div className="shop-detail__actions">
              <Link to={messageHref} className="shop-detail__btn">
                <MessageCircle size={16} strokeWidth={2.25} aria-hidden />
                Message seller
              </Link>
              {product.phone ? (
                <a href={`tel:${product.phone}`} className="shop-detail__btn shop-detail__btn--ghost">
                  <Phone size={16} strokeWidth={2.25} aria-hidden />
                  Call
                </a>
              ) : null}
              {editHref ? (
                <Link to={editHref} className="shop-detail__btn shop-detail__btn--ghost">
                  <Pencil size={16} strokeWidth={2.25} aria-hidden />
                  Edit listing
                </Link>
              ) : null}
            </div>
          </section>

          <section className="shop-detail__panel shop-detail__panel--summary">
            <p className="shop-detail__kicker">Pickup summary</p>
            <div className="shop-detail__summary-rows">
              <div className="shop-detail__summary-row">
                <span>Price</span>
                <strong>{product.price_label || shopPriceLabel(product.price, product.price_note)}</strong>
              </div>
              <div className="shop-detail__summary-row">
                <span>Pickup</span>
                <strong>{product.pickup_available ? 'Available' : 'Ask seller'}</strong>
              </div>
              <div className="shop-detail__summary-row">
                <span>Delivery</span>
                <strong>{product.lodge_delivery ? 'Lodge drop-off possible' : 'Pickup only'}</strong>
              </div>
              <div className="shop-detail__summary-row">
                <span>Status</span>
                <strong>{product.in_stock ? 'In stock' : 'Check stock'}</strong>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </div>
  )
}
