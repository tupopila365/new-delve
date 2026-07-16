import { Link } from 'react-router-dom'
import { MapPin } from 'lucide-react'
import { shopCategoryLabel, shopCoverSrc, shopPriceLabel } from '../../utils/shopDisplay'
import type { ShopProductListing } from '../../utils/shopListing'
import './shop-list.css'

type Props = {
  product: ShopProductListing
  focused?: boolean
}

export function ShopListingCard({ product, focused }: Props) {
  const location = [product.city, product.region].filter(Boolean).join(', ')
  const cover = shopCoverSrc(product.cover_image, product.category)
  const seller = product.owner_display_name || product.owner_username

  return (
    <Link to={`/shop/${product.id}`} className="shop-card">
      <div className="shop-card__media">
        <img src={cover} alt="" loading="lazy" />
        <span className="shop-card__badge">{shopCategoryLabel(product.category)}</span>
        {focused ? <span className="shop-card__badge shop-card__badge--focus">Focused</span> : null}
      </div>
      <div className="shop-card__body">
        <div className="shop-card__head">
          <strong>{product.name}</strong>
          <span className="shop-card__price">{product.price_label || shopPriceLabel(product.price, product.price_note)}</span>
        </div>
        {product.tagline ? <span className="shop-card__tagline">{product.tagline}</span> : null}
        <div className="shop-card__meta">
          <span>{seller}</span>
          {location ? (
            <>
              <span aria-hidden>·</span>
              <MapPin size={12} strokeWidth={2.25} aria-hidden />
              <span>{location}</span>
            </>
          ) : null}
        </div>
        <div className="shop-card__flags">
          {product.made_in_namibia ? <span className="shop-card__flag">Made in Namibia</span> : null}
          {product.pickup_available ? <span className="shop-card__flag">Pickup</span> : null}
          {!product.in_stock ? <span className="shop-card__flag">Out of stock</span> : null}
        </div>
        <p className="shop-card__help">Message seller to arrange pickup.</p>
      </div>
    </Link>
  )
}
