import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { MapPin, MessageCircle, Store } from 'lucide-react'
import { apiFetch } from '../api/client'
import { ShopListingCard } from '../components/shop/ShopListingCard'
import { ShopCartButton } from '../components/shop/ShopCartButton'
import { EmptyState } from '../components/ui'
import type { ShopSeller } from '../utils/shopListing'
import '../components/shop/shop-list.css'

export function ShopStorefront() {
  const { username: usernameParam } = useParams()
  const username = usernameParam ? decodeURIComponent(usernameParam) : undefined

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['shop-seller', username],
    enabled: Boolean(username),
    queryFn: () => apiFetch<ShopSeller>(`/api/shop/sellers/${encodeURIComponent(username!)}/`, { auth: false }),
    retry: 1,
  })

  if (isLoading) {
    return (
      <main className="shop-market">
        <p role="status">Loading shop…</p>
      </main>
    )
  }

  if (isError || !data) {
    const detail =
      error && typeof error === 'object' && 'message' in error
        ? String((error as { message?: string }).message || '')
        : ''
    return (
      <main className="shop-market">
        <EmptyState
          iconElement={<Store size={28} strokeWidth={2} aria-hidden />}
          title="Shop not found"
          sub={
            detail.includes('Not found') || detail.includes('Shop not found')
              ? 'This shop may have been removed or has no published products yet.'
              : 'Could not load this shop. Check your connection and try again.'
          }
          cta={{ label: 'Browse shops', to: '/shop' }}
        />
      </main>
    )
  }

  const location = [data.city, data.region].filter(Boolean).join(', ')

  return (
    <main className="shop-market">
      <div className="shop-market__hero-top storefront__top">
        <Link to="/shop" className="storefront__back">
          Shops
        </Link>
        <ShopCartButton />
      </div>
      <header className="storefront__hero">
        <span className="storefront__avatar" aria-hidden>
          {data.avatar ? <img src={data.avatar} alt="" /> : <Store size={30} strokeWidth={2} />}
        </span>
        <div className="storefront__copy">
          <p className="shop-market__kicker">Shop</p>
          <h1 className="storefront__title">{data.display_name}</h1>
          <div className="storefront__meta">
            <span>
              {data.product_count} product{data.product_count === 1 ? '' : 's'}
            </span>
            {location ? (
              <span>
                <MapPin size={13} strokeWidth={2.25} aria-hidden />
                {location}
              </span>
            ) : null}
          </div>
          {data.bio ? <p className="storefront__bio">{data.bio}</p> : null}
          <Link to={`/messages/u/${encodeURIComponent(data.username)}`} className="storefront__message">
            <MessageCircle size={15} strokeWidth={2.25} aria-hidden />
            Message shop
          </Link>
        </div>
      </header>

      {data.products.length === 0 ? (
        <EmptyState
          iconElement={<Store size={28} strokeWidth={2} aria-hidden />}
          title="No products yet"
          sub="This shop hasn't listed anything for sale."
        />
      ) : (
        <div className="shop-grid">
          {data.products.map((product) => (
            <ShopListingCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </main>
  )
}
