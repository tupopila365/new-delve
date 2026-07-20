import { Link, useNavigate } from 'react-router-dom'
import { Minus, Plus, ShoppingCart, Store, Trash2 } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import { useCart } from '../hooks/useCart'
import { EmptyState } from '../components/ui'
import type { CartItem } from '../utils/shopListing'
import '../components/shop/shop-cart.css'

function money(value: string | number): string {
  const n = typeof value === 'number' ? value : Number(value)
  return `N$${(Number.isFinite(n) ? n : 0).toFixed(2).replace(/\.00$/, '')}`
}

export function CartPage() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const { cart, itemCount, isLoading, setQuantity, removeItem, isGuest } = useCart()

  if (isLoading) {
    return (
      <main className="shop-cart">
        <p role="status">Loading cart…</p>
      </main>
    )
  }

  const items = cart?.items ?? []

  if (items.length === 0) {
    return (
      <main className="shop-cart">
        <EmptyState
          iconElement={<ShoppingCart size={28} strokeWidth={2} aria-hidden />}
          title="Your cart is empty"
          sub={
            isGuest
              ? 'Browse shops and add products — sign in when you are ready to check out.'
              : 'Browse shops and add products you would like to buy.'
          }
          cta={{ label: 'Browse shops', to: '/shop' }}
        />
      </main>
    )
  }

  // Group by seller so buyers see per-shop sections (orders split by shop at checkout).
  const groups = new Map<string, { name: string; items: CartItem[] }>()
  for (const item of items) {
    const key = item.seller_username
    if (!groups.has(key)) groups.set(key, { name: item.seller_display_name, items: [] })
    groups.get(key)!.items.push(item)
  }

  return (
    <main className="shop-cart">
      <header className="shop-cart__head">
        <h1 className="shop-cart__title">Your cart</h1>
        <p className="shop-cart__sub">
          {itemCount} item{itemCount === 1 ? '' : 's'} from {groups.size} shop{groups.size === 1 ? '' : 's'}
          {isGuest ? ' · Sign in to save and check out' : ''}
        </p>
      </header>

      <div className="shop-cart__layout">
        <div className="shop-cart__items">
          {[...groups.entries()].map(([username, group]) => (
            <section key={username} className="shop-cart__group">
              <Link to={`/shop/seller/${encodeURIComponent(username)}`} className="shop-cart__group-head">
                <Store size={15} strokeWidth={2.25} aria-hidden />
                {group.name}
              </Link>
              {group.items.map((item) => (
                <div key={item.id} className="shop-cart__item">
                  <Link to={`/shop/${item.product_id}`} className="shop-cart__item-media">
                    {item.product_cover ? <img src={item.product_cover} alt="" /> : null}
                  </Link>
                  <div className="shop-cart__item-body">
                    <Link to={`/shop/${item.product_id}`} className="shop-cart__item-name">
                      {item.product_name}
                    </Link>
                    {item.variant_label ? (
                      <span className="shop-cart__item-variant">{item.variant_label}</span>
                    ) : null}
                    <span className="shop-cart__item-price">{money(item.unit_price)} each</span>
                    <div className="shop-cart__item-controls">
                      <div className="shop-cart__stepper">
                        <button
                          type="button"
                          onClick={() => setQuantity(item.id, item.quantity - 1)}
                          aria-label="Decrease quantity"
                        >
                          <Minus size={14} strokeWidth={2.5} aria-hidden />
                        </button>
                        <span>{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => setQuantity(item.id, item.quantity + 1)}
                          aria-label="Increase quantity"
                        >
                          <Plus size={14} strokeWidth={2.5} aria-hidden />
                        </button>
                      </div>
                      <button
                        type="button"
                        className="shop-cart__remove"
                        onClick={() => removeItem(item.id)}
                        aria-label="Remove item"
                      >
                        <Trash2 size={15} strokeWidth={2.25} aria-hidden />
                      </button>
                    </div>
                  </div>
                  <span className="shop-cart__item-total">{money(item.line_total)}</span>
                </div>
              ))}
            </section>
          ))}
        </div>

        <aside className="shop-cart__summary">
          <h2>Summary</h2>
          <div className="shop-cart__summary-row">
            <span>Subtotal</span>
            <strong>{money(cart?.subtotal ?? 0)}</strong>
          </div>
          <p className="shop-cart__summary-note">Shipping (if any) is calculated at checkout per shop.</p>
          {profile ? (
            <button type="button" className="shop-cart__checkout" onClick={() => navigate('/checkout')}>
              Checkout
            </button>
          ) : (
            <Link to="/login" className="shop-cart__checkout" style={{ display: 'grid', placeItems: 'center' }}>
              Sign in to checkout
            </Link>
          )}
          <Link to="/shop" className="shop-cart__continue">
            Continue shopping
          </Link>
        </aside>
      </div>
    </main>
  )
}
