import { Link } from 'react-router-dom'
import { ShoppingCart } from 'lucide-react'
import { useCart } from '../../hooks/useCart'
import './shop-cart-btn.css'

type Props = {
  className?: string
}

/** Mobile-visible cart entry — TopNav cart is desktop-only (< 900px hidden). */
export function ShopCartButton({ className = '' }: Props) {
  const { itemCount } = useCart()
  const label = itemCount > 0 ? `Shopping cart, ${itemCount} items` : 'Shopping cart'

  return (
    <Link
      to="/cart"
      className={`shop-cart-btn${className ? ` ${className}` : ''}`}
      aria-label={label}
    >
      <ShoppingCart size={20} strokeWidth={2.25} aria-hidden />
      {itemCount > 0 ? (
        <span className="shop-cart-btn__badge" aria-hidden>
          {itemCount > 99 ? '99+' : itemCount}
        </span>
      ) : null}
    </Link>
  )
}
