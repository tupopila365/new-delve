import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '../api/client'
import { useExploreRegion } from '../hooks/useExploreRegion'
import { ShopListingCard } from '../components/shop/ShopListingCard'
import { SHOP_CATEGORIES } from '../utils/shopDisplay'
import type { ShopProductListing, ShopSellerSummary } from '../utils/shopListing'
import { EmptyState, ListSkeleton } from '../components/ui'
import { MapPin, Search, ShoppingBag, Store, X } from 'lucide-react'
import '../components/shop/shop-list.css'

export function ShopList() {
  const { region } = useExploreRegion()
  const [category, setCategory] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [inStockOnly, setInStockOnly] = useState(false)
  const [madeInNamibiaOnly, setMadeInNamibiaOnly] = useState(false)
  const activeCategoryLabel = SHOP_CATEGORIES.find((c) => c.value === category)?.label ?? ''

  useEffect(() => {
    const t = window.setTimeout(() => setSearch(searchInput.trim()), 350)
    return () => window.clearTimeout(t)
  }, [searchInput])

  const query = useMemo(() => {
    const params = new URLSearchParams()
    if (region) params.set('region', region)
    if (category) params.set('category', category)
    if (search) params.set('search', search)
    if (inStockOnly) params.set('in_stock', 'true')
    if (madeInNamibiaOnly) params.set('made_in_namibia', 'true')
    const qs = params.toString()
    return qs ? `?${qs}` : ''
  }, [region, category, search, inStockOnly, madeInNamibiaOnly])

  const { data: products = [], isLoading, isError } = useQuery({
    queryKey: ['shop-products', region, category, search, inStockOnly, madeInNamibiaOnly],
    queryFn: async (): Promise<ShopProductListing[]> => {
      const raw = await apiFetch<unknown>(`/api/shop/products/${query}`, { auth: false })
      // DRF can return either a plain list or a paginated `{ results: [...] }`.
      if (Array.isArray(raw)) return raw as ShopProductListing[]
      if (raw && typeof raw === 'object' && Array.isArray((raw as { results?: unknown }).results)) {
        return (raw as { results: ShopProductListing[] }).results
      }
      // In mock mode, unhandled endpoints often return `{ detail: "Mock: unhandled ..." }`.
      return []
    },
  })

  const { data: sellers = [] } = useQuery({
    queryKey: ['shop-sellers'],
    queryFn: async (): Promise<ShopSellerSummary[]> => {
      const raw = await apiFetch<unknown>('/api/shop/sellers/', { auth: false })
      return Array.isArray(raw) ? (raw as ShopSellerSummary[]) : []
    },
  })

  const sortedProducts = useMemo(() => {
    const list = [...products]
    // "Focus" signals for social discovery: in-stock, made-in-Namibia, and recent.
    const score = (p: ShopProductListing) => {
      const created = p.created_at ? Number(new Date(p.created_at).getTime()) : 0
      const recencyBoost = created ? Math.max(0, 1_000_000_000 - created / 1_000_000_000) : 0
      return (
        (p.in_stock ? 4 : 0) +
        (p.made_in_namibia ? 3 : 0) +
        (p.pickup_available ? 1 : 0) +
        Math.min(2, recencyBoost)
      )
    }
    list.sort((a, b) => score(b) - score(a))
    return list
  }, [products])

  const focusedIds = useMemo(() => {
    return new Set(sortedProducts.slice(0, 4).map((p) => p.id))
  }, [sortedProducts])

  const activeFilters = useMemo(() => {
    const chips: Array<{ key: string; label: string; onClear: () => void }> = []
    if (category) {
      chips.push({
        key: 'category',
        label: activeCategoryLabel,
        onClear: () => setCategory(''),
      })
    }
    if (search) {
      chips.push({
        key: 'search',
        label: `“${search}”`,
        onClear: () => {
          setSearchInput('')
          setSearch('')
        },
      })
    }
    if (inStockOnly) chips.push({ key: 'in_stock', label: 'In stock', onClear: () => setInStockOnly(false) })
    if (madeInNamibiaOnly)
      chips.push({ key: 'made_in_namibia', label: 'Made in Namibia', onClear: () => setMadeInNamibiaOnly(false) })
    return chips
  }, [activeCategoryLabel, category, inStockOnly, madeInNamibiaOnly, search])

  return (
    <main className="shop-market">
      <header className="shop-market__hero">
        <p className="shop-market__kicker">Marketplace</p>
        <h1 className="shop-market__title">Shops</h1>
        <p className="shop-market__lead">
          Browse products from local shops and makers — add to your cart and check out in one place.
        </p>
        {region ? (
          <p className="shop-market__region">
            <MapPin size={14} strokeWidth={2.25} aria-hidden />
            Showing items near {region}
          </p>
        ) : null}

        <div className="shop-market__find">
          <label className="shop-market__search" htmlFor="shop-search">
            <Search size={18} strokeWidth={2.25} aria-hidden />
            <input
              id="shop-search"
              type="search"
              placeholder="What are you looking for? e.g. crafts, spice set…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              aria-label="Search shop products"
            />
            {searchInput ? (
              <button
                type="button"
                className="shop-market__search-clear"
                onClick={() => {
                  setSearchInput('')
                  setSearch('')
                }}
                aria-label="Clear search"
              >
                <X size={14} strokeWidth={2.5} aria-hidden />
              </button>
            ) : null}
          </label>
        </div>
      </header>

      <section className="shop-market__section">
        <div className="shop-market__section-head">
          <div>
            <h2 className="shop-market__section-title">Browse by category</h2>
            <p className="shop-market__section-sub">Filter products, then add what you love to your cart.</p>
          </div>
        </div>
        <div className="shop-market__find-row">
          <select
            className="shop-market__select"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            aria-label="Category"
          >
            <option value="">All products</option>
            {SHOP_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>

          <select
            className="shop-market__select"
            value={inStockOnly ? 'in_stock' : ''}
            onChange={(e) => setInStockOnly(e.target.value === 'in_stock')}
            aria-label="Availability"
          >
            <option value="">Any availability</option>
            <option value="in_stock">In stock</option>
          </select>

          <select
            className="shop-market__select"
            value={madeInNamibiaOnly ? 'made_in_namibia' : ''}
            onChange={(e) => setMadeInNamibiaOnly(e.target.value === 'made_in_namibia')}
            aria-label="Origin"
          >
            <option value="">All origins</option>
            <option value="made_in_namibia">Made in Namibia</option>
          </select>
        </div>
      </section>

      {sellers.length > 0 && activeFilters.length === 0 ? (
        <section className="shop-market__shops" aria-label="Shops to explore">
          <div className="shop-market__section-head">
            <div>
              <h2 className="shop-market__section-title">Shops to explore</h2>
              <p className="shop-market__section-sub">Visit a shop to see its full catalog.</p>
            </div>
          </div>
          <div className="shop-market__shops-row h-scroll">
            {sellers.map((s) => (
              <Link key={s.username} to={`/shop/seller/${encodeURIComponent(s.username)}`} className="shop-chip">
                <span className="shop-chip__avatar" aria-hidden>
                  {s.avatar ? <img src={s.avatar} alt="" /> : <Store size={18} strokeWidth={2.25} />}
                </span>
                <span className="shop-chip__body">
                  <strong>{s.display_name}</strong>
                  <small>
                    {s.product_count} item{s.product_count === 1 ? '' : 's'}
                    {s.city ? ` · ${s.city}` : ''}
                  </small>
                </span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {activeFilters.length > 0 ? (
        <div className="shop-market__active">
          {activeFilters.map((f) => (
            <button key={f.key} type="button" className="shop-market__active-pill" onClick={f.onClear}>
              {f.label}
              <X size={13} strokeWidth={2.5} aria-hidden />
            </button>
          ))}
          <button
            type="button"
            className="shop-market__clear"
            onClick={() => {
              setCategory('')
              setSearchInput('')
              setSearch('')
              setInStockOnly(false)
              setMadeInNamibiaOnly(false)
            }}
          >
            Clear all
          </button>
        </div>
      ) : null}

      {isLoading ? (
        <ListSkeleton count={6} variant="card" />
      ) : isError ? (
        <EmptyState
          iconElement={<ShoppingBag size={28} strokeWidth={2} aria-hidden />}
          title="Could not load shops"
          sub="Check your connection and try again."
        />
      ) : products.length === 0 ? (
        <EmptyState
          iconElement={<ShoppingBag size={28} strokeWidth={2} aria-hidden />}
          title="No products yet"
          sub={region ? `Nothing listed in ${region} right now. Try another region or check back soon.` : 'Makers and shops can list here soon.'}
        />
      ) : (
        <>
          <div className="shop-market__results-bar">
            <p className="shop-market__count">
              <strong>{sortedProducts.length}</strong> product{sortedProducts.length === 1 ? '' : 's'} found
            </p>
          </div>
          <div className="shop-grid">
            {sortedProducts.map((product) => (
              <ShopListingCard key={product.id} product={product} focused={focusedIds.has(product.id)} />
            ))}
          </div>
        </>
      )}
    </main>
  )
}
