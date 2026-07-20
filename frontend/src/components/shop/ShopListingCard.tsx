import { useState, type MouseEvent } from 'react'
import { Link } from 'react-router-dom'
import { Check, Plus, ShoppingCart } from 'lucide-react'
import { shopCategoryLabel, shopCoverSrc, shopPriceLabel } from '../../utils/shopDisplay'
import { MiniRating } from '../MiniRating'
import { useCart } from '../../hooks/useCart'
import type { ShopProductListing } from '../../utils/shopListing'
import './shop-list.css'

type Props = {
  product: ShopProductListing
  focused?: boolean
}

export function ShopListingCard({ product, focused }: Props) {
  const cover = shopCoverSrc(product.cover_image, product.category)
  const seller = product.owner_display_name || product.owner_username
  const { addItem } = useCart()
  const [added, setAdded] = useState(false)
  const soldOut = !product.in_stock || (product.stock_quantity ?? 1) <= 0
  const hasVariants = (product.variants?.length ?? 0) > 0

  async function onAdd(e: MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (soldOut) return
    await addItem(product.id, { quantity: 1, listing: product })
    setAdded(true)
    window.setTimeout(() => setAdded(false), 1400)
  }

  return (
    <Link to={`/shop/${product.id}`} className="shop-card">
      <div className="shop-card__media">
        <img src={cover} alt="" loading="lazy" />
        <span className="shop-card__badge">{shopCategoryLabel(product.category)}</span>
        {product.is_featured ? <span className="shop-card__badge shop-card__badge--focus">Featured</span> : null}
        {focused && !product.is_featured ? (
          <span className="shop-card__badge shop-card__badge--focus">Popular</span>
        ) : null}
        {soldOut ? <span className="shop-card__soldout">Sold out</span> : null}
      </div>
      <div className="shop-card__body">
        <div className="shop-card__head">
          <strong>{product.name}</strong>
          <span className="shop-card__price">
            {product.price_label || shopPriceLabel(product.price, product.price_note)}
          </span>
        </div>
        {product.tagline ? <span className="shop-card__tagline">{product.tagline}</span> : null}
        <div className="shop-card__meta">
          <span>{seller}</span>
          {Number(product.rating_avg) > 0 ? (
            <>
              <span aria-hidden>·</span>
              <MiniRating rating={product.rating_avg} count={product.rating_count} />
            </>
          ) : product.made_in_namibia ? (
            <>
              <span aria-hidden>·</span>
              <span>Made in Namibia</span>
            </>
          ) : null}
        </div>
        {hasVariants ? (
          <Link to={`/shop/${product.id}`} className="shop-card__add shop-card__add--options" onClick={(e) => e.stopPropagation()}>
            <ShoppingCart size={15} strokeWidth={2.4} aria-hidden />
            Choose options
          </Link>
        ) : (
          <button
            type="button"
            className={`shop-card__add${added ? ' is-added' : ''}`}
            onClick={onAdd}
            disabled={soldOut}
          >
            {added ? (
              <>
                <Check size={15} strokeWidth={2.6} aria-hidden />
                Added
              </>
            ) : (
              <>
                <Plus size={15} strokeWidth={2.6} aria-hidden />
                Add to cart
              </>
            )}
          </button>
        )}
      </div>
    </Link>
  )
}
